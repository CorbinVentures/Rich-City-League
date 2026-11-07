import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { parseStripeSubscription, retrieveStripeSubscription, verifyStripeWebhook } from '@/lib/stripe-billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StripeEvent = { id?: string; type?: string; data?: { object?: any } };

function normalizeStatus(value: string) {
  const allowed = new Set(['active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused']);
  return allowed.has(value) ? value : 'incomplete';
}

async function syncSubscription(db: any, subscription: Awaited<ReturnType<typeof retrieveStripeSubscription>>) {
  const parsed = parseStripeSubscription(subscription);
  let userId = parsed.userId;
  if (!userId && parsed.subscriptionId) {
    const { data } = await db.from('member_subscriptions').select('user_id').eq('provider_subscription_id', parsed.subscriptionId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId && parsed.customerId) {
    const { data } = await db.from('member_subscriptions').select('user_id').eq('provider_customer_id', parsed.customerId).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId || !parsed.planCode || !parsed.interval) return { synced: false, reason: 'Subscription is not linked to an RCL user or configured price.' };

  const status = normalizeStatus(parsed.status);
  const { error } = await db.from('member_subscriptions').upsert({
    user_id: userId,
    plan_code: parsed.planCode,
    status,
    billing_interval: parsed.interval,
    provider: 'stripe',
    provider_customer_id: parsed.customerId,
    provider_subscription_id: parsed.subscriptionId,
    price_cents: parsed.priceCents,
    currency: parsed.currency,
    current_period_start: parsed.currentPeriodStart,
    current_period_end: parsed.currentPeriodEnd,
    cancel_at_period_end: parsed.cancelAtPeriodEnd,
    trial_end: parsed.trialEnd,
    canceled_at: status === 'canceled' ? (parsed.canceledAt || new Date().toISOString()) : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  return { synced: true };
}

function invoiceSubscriptionId(invoice: any) {
  const value = invoice?.subscription;
  if (typeof value === 'string') return value;
  if (value?.id) return value.id as string;
  const parentSubscription = invoice?.parent?.subscription_details?.subscription;
  if (typeof parentSubscription === 'string') return parentSubscription;
  if (parentSubscription?.id) return parentSubscription.id as string;
  return null;
}

async function processSponsorCheckoutEvent(db:any,event:StripeEvent,session:any){
  const campaignId=session?.metadata?.campaign_id;
  if(!campaignId||!session?.id)throw new Error('Sponsor checkout metadata is incomplete.');

  const {data:prior,error:priorError}=await db.from('network_partner_billing_events')
    .select('processing_status').eq('id',event.id).maybeSingle();
  if(priorError)throw priorError;
  if(prior&&['processed','ignored','processing'].includes(prior.processing_status))return {received:true,duplicate:true};
  if(prior){
    const {error}=await db.from('network_partner_billing_events').update({
      event_type:event.type,processing_status:'processing',error_message:null,
    }).eq('id',event.id);
    if(error)throw error;
  }else{
    const {error}=await db.from('network_partner_billing_events').insert({
      id:event.id,event_type:event.type,processing_status:'processing',error_message:null,
    });
    if(error){
      if(error.code==='23505')return {received:true,duplicate:true};
      throw error;
    }
  }

  try{
    const {data:campaign,error:campaignError}=await db.from('network_campaigns')
      .select('id,organization_id,created_by,requested_budget_cents,requested_placement,destination_url,headline,target_regions,requested_starts_at,requested_ends_at,status,payment_status')
      .eq('id',campaignId).eq('stripe_checkout_session_id',session.id).maybeSingle();
    if(campaignError)throw campaignError;
    if(!campaign){
      await db.from('network_partner_billing_events').update({processing_status:'ignored',error_message:'Sponsor campaign was not found for this checkout session.',processed_at:new Date().toISOString()}).eq('id',event.id);
      return {received:true,ignored:true};
    }

    await db.from('network_partner_billing_events').update({
      organization_id:campaign.organization_id,
      provider_customer_id:typeof session.customer==='string'?session.customer:session.customer?.id||null,
    }).eq('id',event.id);

    if(event.type==='checkout.session.expired'||event.type==='checkout.session.async_payment_failed'){
      if(campaign.payment_status!=='paid'){
        const {error}=await db.from('network_campaigns').update({status:'cancelled'}).eq('id',campaign.id).neq('payment_status','paid');
        if(error)throw error;
      }
      await db.from('network_partner_billing_events').update({processing_status:'processed',error_message:null,processed_at:new Date().toISOString()}).eq('id',event.id);
      return {received:true,cancelled:true};
    }

    if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
      await db.from('network_partner_billing_events').update({processing_status:'ignored',error_message:null,processed_at:new Date().toISOString()}).eq('id',event.id);
      return {received:true,ignored:true};
    }
    if(session.mode!=='payment'||session.payment_status!=='paid'){
      await db.from('network_partner_billing_events').update({processing_status:'ignored',error_message:'Checkout is not a completed one-time payment.',processed_at:new Date().toISOString()}).eq('id',event.id);
      return {received:true,ignored:true};
    }
    if(Number(session.amount_total)!==Number(campaign.requested_budget_cents)||String(session.currency||'').toLowerCase()!=='usd'){
      throw new Error('Sponsor checkout total does not match the reserved campaign price.');
    }

    const {error:campaignUpdateError}=await db.from('network_campaigns').update({
      status:'active',payment_status:'paid',entitlement_source:'purchase',
    }).eq('id',campaign.id);
    if(campaignUpdateError)throw campaignUpdateError;

    const {data:existingPromotion,error:promotionLookupError}=await db.from('network_promotions')
      .select('id').eq('campaign_id',campaign.id).limit(1).maybeSingle();
    if(promotionLookupError)throw promotionLookupError;
    if(!existingPromotion){
      const {error:promotionInsertError}=await db.from('network_promotions').insert({
        organization_id:campaign.organization_id,
        event_id:null,
        campaign_id:campaign.id,
        placement:campaign.requested_placement,
        headline:campaign.headline,
        disclosure_label:'Sponsored',
        destination_url:campaign.destination_url,
        starts_at:campaign.requested_starts_at,
        ends_at:campaign.requested_ends_at,
        target_regions:campaign.target_regions,
        status:'active',
        activated_by:campaign.created_by,
        activated_at:new Date().toISOString(),
      });
      if(promotionInsertError)throw promotionInsertError;
    }
    const {error:eventUpdateError}=await db.from('network_partner_billing_events').update({
      processing_status:'processed',error_message:null,processed_at:new Date().toISOString(),
    }).eq('id',event.id);
    if(eventUpdateError)throw eventUpdateError;
    return {received:true,fulfilled:true};
  }catch(error){
    await db.from('network_partner_billing_events').update({
      processing_status:'failed',
      error_message:error instanceof Error?error.message.slice(0,1000):'Unknown sponsor checkout fulfillment error.',
      processed_at:new Date().toISOString(),
    }).eq('id',event.id);
    throw error;
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyStripeWebhook(body, request.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  let event: StripeEvent;
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!event.id || !event.type) return NextResponse.json({ error: 'Stripe event metadata is missing.' }, { status: 400 });

  const db = getSupabaseAdminClient() as any;
  if (!db) return NextResponse.json({ error: 'Server database credentials are unavailable.' }, { status: 503 });

  const checkoutSession=event.data?.object;
  const sponsorCheckoutTypes=new Set(['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed']);
  if(sponsorCheckoutTypes.has(event.type)&&checkoutSession?.metadata?.rch_flow==='sponsor_campaign'){
    try{return NextResponse.json(await processSponsorCheckoutEvent(db,event,checkoutSession));}
    catch(error){
      console.error('sponsor checkout fulfillment failed',error);
      return NextResponse.json({error:'Sponsor checkout fulfillment failed.'},{status:500});
    }
  }

  const { data: existing } = await db.from('membership_webhook_events').select('processing_status').eq('provider_event_id', event.id).maybeSingle();
  if (existing && ['processed','ignored'].includes(existing.processing_status)) return NextResponse.json({ received: true, duplicate: true });
  if (!existing) {
    const { error } = await db.from('membership_webhook_events').insert({
      provider: 'stripe', provider_event_id: event.id, event_type: event.type,
      processing_status: 'failed', error_message: 'Processing started.',
    });
    if (error && error.code !== '23505') return NextResponse.json({ error: 'Unable to record webhook event.' }, { status: 500 });
  }

  try {
    let subscriptionId: string | null = null;
    let subscriptionObject: any = null;
    if (event.type === 'checkout.session.completed') {
      const value = event.data?.object?.subscription;
      subscriptionId = typeof value === 'string' ? value : value?.id || null;
    } else if (event.type.startsWith('customer.subscription.')) {
      subscriptionObject = event.data?.object;
      subscriptionId = subscriptionObject?.id || null;
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      subscriptionId = invoiceSubscriptionId(event.data?.object);
    } else {
      await db.from('membership_webhook_events').update({ processing_status: 'ignored', error_message: null, processed_at: new Date().toISOString() }).eq('provider_event_id', event.id);
      return NextResponse.json({ received: true, ignored: true });
    }

    if (!subscriptionId) {
      await db.from('membership_webhook_events').update({ processing_status: 'ignored', error_message: 'No subscription ID was attached.', processed_at: new Date().toISOString() }).eq('provider_event_id', event.id);
      return NextResponse.json({ received: true, ignored: true });
    }

    const subscription = subscriptionObject?.items?.data?.length ? subscriptionObject : await retrieveStripeSubscription(subscriptionId);
    const result = await syncSubscription(db, subscription);
    await db.from('membership_webhook_events').update({
      processing_status: result.synced ? 'processed' : 'ignored',
      provider_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null,
      provider_subscription_id: subscriptionId,
      error_message: result.synced ? null : result.reason,
      processed_at: new Date().toISOString(),
    }).eq('provider_event_id', event.id);
    return NextResponse.json({ received: true, synced: result.synced });
  } catch (error) {
    console.error('stripe webhook reconciliation failed', error);
    await db.from('membership_webhook_events').update({
      processing_status: 'failed',
      error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown webhook reconciliation error.',
      processed_at: new Date().toISOString(),
    }).eq('provider_event_id', event.id);
    return NextResponse.json({ error: 'Webhook reconciliation failed.' }, { status: 500 });
  }
}
