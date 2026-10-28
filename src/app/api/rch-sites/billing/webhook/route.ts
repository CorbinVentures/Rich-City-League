import {NextResponse} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {parseRchSitesSubscription,retrieveRchSitesSubscription,verifyRchSitesWebhook} from '@/lib/rch-sites-stripe';

export const runtime='nodejs';export const dynamic='force-dynamic';
type Event={id?:string;type?:string;data?:{object?:Record<string,any>}};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invoiceSubscriptionId(invoice:Record<string,any>={}):string|null{
  const direct=invoice.subscription, nested=invoice.parent?.subscription_details?.subscription;
  const value=direct||nested;
  return typeof value==='string'?value:value?.id||null;
}
function eventSubscriptionId(event:Event):string|null{
  const obj=event.data?.object||{};
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded')
    return obj.mode==='subscription'?(typeof obj.subscription==='string'?obj.subscription:obj.subscription?.id||null):null;
  if(event.type?.startsWith('customer.subscription.'))return typeof obj.id==='string'?obj.id:null;
  if(event.type==='invoice.paid'||event.type==='invoice.payment_failed')
    return invoiceSubscriptionId(obj);
  return null;
}
export async function POST(request:Request){
  const payload=await request.text();
  if(!verifyRchSitesWebhook(payload,request.headers.get('stripe-signature')))
    return NextResponse.json({error:'Invalid Stripe webhook signature.'},{status:400});
  let event:Event;
  try{event=JSON.parse(payload);}catch{return NextResponse.json({error:'Invalid Stripe JSON.'},{status:400});}
  if(typeof event.id!=='string'||typeof event.type!=='string')
    return NextResponse.json({error:'Missing Stripe event identity.'},{status:400});
  const db=getSupabaseAdminClient() as any;
  if(!db)return NextResponse.json({error:'Billing database is unavailable.'},{status:503});
  const {data:prior,error:lookupError}=await db.from('rch_site_billing_events')
    .select('processing_status').eq('id',event.id).maybeSingle();
  if(lookupError)return NextResponse.json({error:'Could not read billing event.'},{status:500});
  if(prior&&['processed','ignored'].includes(prior.processing_status))
    return NextResponse.json({received:true,duplicate:true});
  if(!prior){
    const {error}=await db.from('rch_site_billing_events').insert({
      id:event.id,event_type:event.type,processing_status:'processing'});
    if(error&&error.code!=='23505')return NextResponse.json({error:'Unable to register event.'},{status:500});
  }else{
    const {error}=await db.from('rch_site_billing_events').update({
      processing_status:'processing',error_message:null}).eq('id',event.id);
    if(error)return NextResponse.json({error:'Unable to retry event.'},{status:500});
  }
  async function record(status:'processed'|'ignored',orgId:string|null,reason:string|null){
    const {error}=await db.from('rch_site_billing_events').update({
      processing_status:status,organization_id:orgId,error_message:reason,
      processed_at:new Date().toISOString()}).eq('id',event.id);
    if(error)throw error;
  }
  try{
    const subscriptionId=eventSubscriptionId(event);
    if(!subscriptionId){await record('ignored',null,'Not an RCH Sites subscription event.');
      return NextResponse.json({received:true,ignored:true});}
    // Always fetch current Stripe state to avoid out-of-order events resurrecting a canceled plan.
    const subscription=await retrieveRchSitesSubscription(subscriptionId);
    const parsed=parseRchSitesSubscription(subscription);
    if(parsed.family!=='rch_sites'||!parsed.mapping||!uuid.test(parsed.organizationId||'')){
      // If Stripe moved an existing RCH website subscription to an unrecognized
      // product/price, immediately revoke paid access rather than leaving stale
      // entitlements in place. Never assign premium access from metadata alone.
      const {data:priorLink,error:linkError}=await db.from('rch_site_subscriptions')
        .select('organization_id,provider_customer_ref')
        .eq('provider_subscription_ref',subscriptionId).maybeSingle();
      if(linkError)throw linkError;
      if(priorLink){
        const {error:revokeError}=await db.from('rch_site_subscriptions').update({
          tier:'free',billing_status:'none',provider_subscription_ref:null,
          provider_price_ref:null,billing_interval:null,current_period_end:null,
          cancel_at_period_end:false,
        }).eq('organization_id',priorLink.organization_id).eq('provider_subscription_ref',subscriptionId);
        if(revokeError)throw revokeError;
      }
      await record('ignored',priorLink?.organization_id||null,'Unrecognized Stripe product, price or family; paid access revoked when linked.');
      return NextResponse.json({received:true,ignored:true});
    }
    const orgId=parsed.organizationId!;
    const {data:org,error:orgError}=await db.from('network_organizations')
      .select('id,status,is_verified,is_claimed,network_tier,organization_type')
      .eq('id',orgId).maybeSingle();
    if(orgError)throw orgError;
    const types=new Set(['training','program','team','tournament','league','facility']);
    if(!org||org.status!=='active'||org.is_verified!==true||org.is_claimed!==true||
      org.network_tier==='flagship'||!types.has(org.organization_type)){
      await record('ignored',null,'Unverified or ineligible organization.');
      return NextResponse.json({received:true,ignored:true});
    }
    const {data:existing,error:readError}=await db.from('rch_site_subscriptions')
      .select('provider_subscription_ref,provider_customer_ref').eq('organization_id',orgId).maybeSingle();
    if(readError)throw readError;
    // Never reassign another active subscription or Stripe customer to a different org.
    if(existing?.provider_subscription_ref&&existing.provider_subscription_ref!==subscriptionId){
      await record('ignored',orgId,'Organization already linked to a different subscription.');
      return NextResponse.json({received:true,ignored:true});
    }
    if(existing?.provider_customer_ref&&existing.provider_customer_ref!==parsed.customerId){
      await record('ignored',orgId,'Organization customer ownership mismatch.');
      return NextResponse.json({received:true,ignored:true});
    }
    if(!parsed.customerId)throw Error('Stripe customer is missing.');
    const canceled=parsed.status==='canceled'||parsed.status==='incomplete_expired';
    // Preserve paid tier for past_due only as a record; plan gates still deny premium features.
    const status=parsed.status==='active'?'active':parsed.status==='trialing'?'trialing':
      parsed.status==='past_due'?'past_due':'canceled';
    const row=canceled?{
      organization_id:orgId,tier:'free',billing_status:'none',provider_subscription_ref:null,
      provider_customer_ref:parsed.customerId,provider_price_ref:null,billing_interval:null,
      current_period_end:null,cancel_at_period_end:false,
    }:{
      organization_id:orgId,tier:parsed.mapping.tier,billing_status:status,
      provider_subscription_ref:subscriptionId,provider_customer_ref:parsed.customerId,
      provider_price_ref:parsed.priceId,billing_interval:parsed.mapping.interval,
      current_period_end:parsed.periodEnd,cancel_at_period_end:parsed.cancelAtPeriodEnd,
    };
    const {error:saveError}=await db.from('rch_site_subscriptions').upsert(row,{onConflict:'organization_id'});
    if(saveError)throw saveError;
    await record('processed',orgId,null);
    return NextResponse.json({received:true,synced:true});
  }catch(error){
    console.error('RCH Sites webhook reconciliation failed',error);
    await db.from('rch_site_billing_events').update({processing_status:'failed',
      error_message:'Retry required. Check server logs.'}).eq('id',event.id);
    return NextResponse.json({error:'Subscription reconciliation failed; Stripe should retry.'},{status:500});
  }
}
