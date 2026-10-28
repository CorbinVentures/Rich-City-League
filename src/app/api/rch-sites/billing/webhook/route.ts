import {NextResponse} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {isRchSiteUuid} from '@/lib/rch-sites-billing-auth';
import {
  fetchRchSitesSubscription,stripeRefId,stripeSiteSubscriptionState,
  verifyRchSitesStripeSignature,verifyRchSitesStripePrice,
  retrieveRchSitesCheckout,isVerifiedRchSitesCheckoutLineage,
} from '@/lib/rch-sites-stripe-billing';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const response=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers});
type StripeEvent={id?:string;type?:string;data?:{object?:any}};
const allowed=new Set([
  'checkout.session.completed','customer.subscription.created','customer.subscription.updated',
  'customer.subscription.deleted','invoice.paid','invoice.payment_failed',
]);
function invoiceSubscriptionId(invoice:any):string|null{
  return stripeRefId(invoice?.subscription)
    ||stripeRefId(invoice?.parent?.subscription_details?.subscription);
}
function eventSubscriptionId(event:StripeEvent){
  const object=event.data?.object;
  if(event.type==='checkout.session.completed')return stripeRefId(object?.subscription);
  if(event.type?.startsWith('customer.subscription.'))return typeof object?.id==='string'?object.id:null;
  if(event.type==='invoice.paid'||event.type==='invoice.payment_failed')
    return invoiceSubscriptionId(object);
  return null;
}

export async function POST(request:Request){
  const body=await request.text();
  if(!verifyRchSitesStripeSignature(body,request.headers.get('stripe-signature')))
    return response({error:'Invalid webhook signature.'},400);
  let event:StripeEvent;
  try{event=JSON.parse(body);}catch{return response({error:'Invalid JSON.'},400);}
  if(!event.id||!/^evt_[a-zA-Z0-9_]+$/.test(event.id)||!event.type)
    return response({error:'Missing event identity.'},400);
  const db=getSupabaseAdminClient() as any;
  if(!db)return response({error:'Billing database is not configured.'},503);

  // Event insert is unique; processed/ignored IDs cannot grant twice. Failed
  // events may retry, and a crashed processing row can be reclaimed after 5m.
  const {data:created,error:createError}=await db.from('rch_site_billing_events')
    .upsert({event_id:event.id,event_type:event.type,processing_status:'processing'},
      {onConflict:'event_id',ignoreDuplicates:true}).select('event_id');
  if(createError)return response({error:'Could not record billing event.'},503);
  if(!created?.length){
    const {data:stored,error:readError}=await db.from('rch_site_billing_events')
      .select('processing_status,received_at').eq('event_id',event.id).maybeSingle();
    if(readError||!stored)return response({error:'Could not verify billing event.'},503);
    if(['processed','ignored'].includes(stored.processing_status))
      return response({received:true,duplicate:true});
    if(stored.processing_status==='processing'&&
      Date.now()-new Date(stored.received_at).getTime()<300000)
      return response({error:'Webhook is already processing; retry later.'},503);
    const {error:resumeError}=await db.from('rch_site_billing_events')
      .update({processing_status:'processing',error_code:null,received_at:new Date().toISOString()})
      .eq('event_id',event.id);
    if(resumeError)return response({error:'Cannot retry billing event.'},503);
  }
  async function finish(status:'processed'|'ignored'|'failed',reason?:string,subscriptionId?:string){
    const {error}=await db.from('rch_site_billing_events').update({
      processing_status:status,error_code:reason??null,
      stripe_subscription_id:subscriptionId??null,processed_at:new Date().toISOString(),
    }).eq('event_id',event.id);
    if(error)throw new Error('Cannot finalize billing event.');
  }
  try{
    if(!allowed.has(event.type)){
      await finish('ignored','event_type_not_used');
      return response({received:true,ignored:true});
    }
    const subscriptionId=eventSubscriptionId(event);
    if(!subscriptionId){
      // Checkout can complete without an immediate subscription. Reconcile
      // when Stripe sends invoice/subscription events, never grant from redirect.
      await finish('ignored','no_subscription_reference');
      return response({received:true,ignored:true});
    }
    // Stripe sends all account-level subscription/invoice events to a subscribed
    // endpoint, including RCH memberships and Network advertising. Skip those
    // before Stripe API calls so a missing/rotating Sites key cannot turn
    // unrelated product events into retry storms.
    const object=event.data?.object;
    const productHint=object?.metadata?.rch_product
      ??object?.parent?.subscription_details?.metadata?.rch_product
      ??object?.subscription_details?.metadata?.rch_product;
    if(productHint!==undefined&&productHint!=='sites'){
      await finish('ignored','unrelated_product',subscriptionId);
      return response({received:true,ignored:true});
    }
    if(productHint!=='sites'){
      if(event.type?.startsWith('customer.subscription.')||
        event.type==='checkout.session.completed'){
        // All RCH Sites Checkouts and subscription records are tagged.
        await finish('ignored','untagged_subscription',subscriptionId);
        return response({received:true,ignored:true});
      }
      // Some Stripe API versions omit subscription metadata from invoice events.
      // Only retrieve an untagged invoice if a prior verified Sites event has
      // already linked this subscription to our private intent or ledger.
      const [{data:knownSite,error:knownError},{data:knownIntent,error:intentLookupError}]
        =await Promise.all([
          db.from('rch_site_subscriptions').select('organization_id')
            .eq('provider_subscription_ref',subscriptionId).maybeSingle(),
          db.from('rch_site_billing_intents').select('id')
            .eq('stripe_subscription_id',subscriptionId).maybeSingle(),
        ]);
      if(knownError||intentLookupError)
        throw new Error('Unable to verify whether invoice belongs to RCH Sites.');
      if(!knownSite&&!knownIntent){
        await finish('ignored','unlinked_untagged_invoice',subscriptionId);
        return response({received:true,ignored:true});
      }
    }
    const subscription=await fetchRchSitesSubscription(subscriptionId);
    if(subscription.metadata?.rch_product!=='sites'){
      await finish('ignored','not_an_rch_sites_subscription',subscriptionId);
      return response({received:true,ignored:true});
    }
    const intentId=subscription.metadata.site_billing_intent_id;
    if(!isRchSiteUuid(intentId))throw new Error('Unrecognized website checkout lineage.');
    const {data:intent,error:intentError}=await db.from('rch_site_billing_intents')
      .select('id,organization_id,tier,billing_interval,stripe_price_id,stripe_session_id,status,stripe_subscription_id')
      .eq('id',intentId).maybeSingle();
    if(intentError||!intent||!intent.stripe_session_id||!['checkout_ready','completed'].includes(intent.status))
      throw new Error('Website checkout lineage not ready.');
    if(event.type==='checkout.session.completed'&&
      event.data?.object?.id!==intent.stripe_session_id)
      throw new Error('Checkout session does not match the organization intent.');
    // Reconcile against Stripe's canonical Checkout session for every Sites
    // event, including subscription/invoice events delivered out of order.
    // Metadata on a separately created subscription is not proof of payment.
    const checkout=await retrieveRchSitesCheckout(intent.stripe_session_id);
    if(!isVerifiedRchSitesCheckoutLineage(checkout,{
      intentId:intent.id,organizationId:intent.organization_id,
      sessionId:intent.stripe_session_id,subscriptionId,
    }))throw new Error('Subscription is not linked to a completed paid website Checkout.');
    const plan=verifyRchSitesStripePrice(subscription);
    if(!plan||plan.tier!==intent.tier||plan.interval!==intent.billing_interval||
      subscription.items?.data?.[0]?.price?.id!==intent.stripe_price_id)
      throw new Error('Stripe plan, interval or payment amount did not match the original checkout.');
    const customer=stripeRefId(subscription.customer);
    if(!customer||!/^cus_[a-zA-Z0-9_]+$/.test(customer))
      throw new Error('Stripe customer identity is missing.');
    if(intent.stripe_subscription_id&&intent.stripe_subscription_id!==subscriptionId)
      throw new Error('Checkout already linked to another subscription.');

    const {data:prior,error:priorError}=await db.from('rch_site_subscriptions')
      .select('provider_subscription_ref,billing_status,provider_customer_id')
      .eq('organization_id',intent.organization_id).maybeSingle();
    if(priorError)throw new Error('Cannot verify current organization billing.');
    if(prior?.provider_subscription_ref&&prior.provider_subscription_ref!==subscriptionId
      &&prior.billing_status!=='canceled')
      throw new Error('Organization already has a different website subscription.');

    const state=stripeSiteSubscriptionState(subscription);
    // Stripe is the source of truth. A paid invoice is required for access.
    const period=plan.currentPeriodEnd&&Number.isSafeInteger(plan.currentPeriodEnd)
      ?new Date(plan.currentPeriodEnd*1000).toISOString():null;
    const {error:writeError}=await db.from('rch_site_subscriptions').upsert({
      organization_id:intent.organization_id,tier:plan.tier,billing_status:state,
      provider_subscription_ref:subscriptionId,provider_customer_id:customer,
      provider_price_id:intent.stripe_price_id,billing_interval:plan.interval,
      current_period_end:period,
      cancel_at_period_end:subscription.cancel_at_period_end===true,
      last_reconciled_at:new Date().toISOString(),
    },{onConflict:'organization_id'});
    if(writeError)throw new Error('Unable to update the RCH Sites entitlement ledger.');
    const {error:finishIntentError}=await db.from('rch_site_billing_intents')
      .update({status:'completed',stripe_customer_id:customer,stripe_subscription_id:subscriptionId})
      .eq('id',intent.id).in('status',['checkout_ready','completed']);
    if(finishIntentError)throw new Error('Unable to mark the checkout lineage complete.');
    await finish('processed',undefined,subscriptionId);
    return response({received:true,synced:true});
  }catch(error){
    console.error('RCH Sites Stripe subscription reconciliation failed',error);
    try{await finish('failed','reconciliation_failed');}catch{/* Preserve 500 for Stripe retry. */}
    return response({error:'Subscription reconciliation failed. Stripe may retry.'},500);
  }
}
