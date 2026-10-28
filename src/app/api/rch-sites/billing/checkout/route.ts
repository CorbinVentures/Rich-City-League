import {NextResponse} from 'next/server';
import {
  getRchSitesBillingPrincipal,rchSitesBillingOriginAllowed,
  verifiedRchSiteBillingOrg,isRchSiteUuid,
} from '@/lib/rch-sites-billing-auth';
import {
  createRchSitesCheckout,retrieveRchSitesCheckout,
  isValidRchBillingSelection,rchSitesBillingEnabled,rchSitesPrice,
  type PaidRchSiteTier,
} from '@/lib/rch-sites-stripe-billing';
import {effectiveRchSiteBillingStatus,type RchSiteBillingInterval,type RchSiteBillingStatus} from '@/lib/rch-sites-plans';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const send=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers});

export async function GET(request:Request){
  const principal=await getRchSitesBillingPrincipal();
  if(!principal)return send({error:'A completed verified account is required.'},401);
  const orgId=new URL(request.url).searchParams.get('organizationId');
  if(!isRchSiteUuid(orgId)||!await verifiedRchSiteBillingOrg(principal,orgId))
    return send({error:'Organization owner or manager access required.'},403);
  const {data,error}=await principal.admin.from('rch_site_subscriptions')
    .select('tier,billing_status,billing_interval,current_period_end,cancel_at_period_end')
    .eq('organization_id',orgId).maybeSingle();
  if(error)return send({error:'Website billing is temporarily unavailable.'},503);
  const effectiveStatus=data?effectiveRchSiteBillingStatus(
    data.tier,data.billing_status as RchSiteBillingStatus,data.current_period_end):'none';
  return send({available:rchSitesBillingEnabled(),
    subscription:data?{
      tier:data.tier,status:effectiveStatus,interval:data.billing_interval,
      currentPeriodEnd:data.current_period_end,cancelAtPeriodEnd:data.cancel_at_period_end,
    }:{tier:'free',status:'none',interval:null,currentPeriodEnd:null,cancelAtPeriodEnd:false}});
}

export async function POST(request:Request){
  if(!rchSitesBillingOriginAllowed(request))return send({error:'Use the RCH website to start billing.'},403);
  if(Number(request.headers.get('content-length')||0)>2000)return send({error:'Request too large.'},413);
  const principal=await getRchSitesBillingPrincipal();
  if(!principal)return send({error:'Sign in with a verified and completed RCH account.'},401);
  let input:{organizationId?:unknown;tier?:unknown;interval?:unknown};
  try{input=await request.json();}catch{return send({error:'Invalid JSON.'},400);}
  if(!isRchSiteUuid(input?.organizationId)||!isValidRchBillingSelection(input.tier,input.interval))
    return send({error:'Choose a valid organization, plan and billing interval.'},400);
  const orgId=input.organizationId;
  if(!await verifiedRchSiteBillingOrg(principal,orgId))
    return send({error:'Only verified organization owners or managers may subscribe.'},403);
  if(!rchSitesBillingEnabled())return send({
    error:'not_available',message:'Paid website enrollment is not open yet. You can continue building on Free.',
  },503);

  const tier=input.tier as PaidRchSiteTier,interval=input.interval as RchSiteBillingInterval;
  const db=principal.admin;
  const {data:existing,error:existingError}=await db.from('rch_site_subscriptions')
    .select('billing_status,provider_subscription_ref,provider_customer_id')
    .eq('organization_id',orgId).maybeSingle();
  if(existingError)return send({error:'Unable to verify current website subscription.'},503);
  if(existing?.provider_subscription_ref&&existing.billing_status!=='canceled')
    return send({error:'manage_existing',message:'Manage your existing website subscription.'},409);

  const {data:open,error:openError}=await db.from('rch_site_billing_intents')
    .select('id,stripe_session_id,status,created_at').eq('organization_id',orgId)
    .in('status',['pending','checkout_ready']).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(openError)return send({error:'Unable to verify current checkout.'},503);
  if(open){
    if(open.stripe_session_id&&open.status==='checkout_ready'){
      try{
        const checkout=await retrieveRchSitesCheckout(open.stripe_session_id);
        if(checkout.status==='open'&&checkout.url?.startsWith('https://checkout.stripe.com/'))
          return send({url:checkout.url,existingCheckout:true});
        if(checkout.status==='complete')
          return send({error:'payment_processing',message:'Previous checkout is completing. Do not pay twice.'},409);
        if(checkout.status==='expired'){
          const {error:expireError}=await db.from('rch_site_billing_intents')
            .update({status:'expired'}).eq('id',open.id).eq('status','checkout_ready');
          if(expireError)return send({error:'Could not close the previous checkout.'},503);
        }
      }catch{
        return send({error:'Unable to verify the previous checkout. No new checkout was started.'},503);
      }
    }else{
      // A crashed process may leave a pending intent before Stripe returned
      // a session. No Checkout URL was ever handed to the customer.
      const oldPending=open.status==='pending'&&!open.stripe_session_id
        &&Date.now()-new Date(open.created_at).getTime()>10*60*1000;
      if(!oldPending)
        return send({error:'checkout_processing',message:'An earlier checkout is being created.'},409);
      const {error:abandonError}=await db.from('rch_site_billing_intents')
        .update({status:'expired'}).eq('id',open.id).eq('status','pending')
        .is('stripe_session_id',null);
      if(abandonError)return send({error:'Cannot recover the earlier checkout.'},503);
    }
  }

  const priceId=rchSitesPrice(tier,interval);
  if(!priceId)return send({error:'This website subscription price is not configured.'},503);
  const {data:intent,error:intentError}=await db.from('rch_site_billing_intents')
    .insert({organization_id:orgId,initiated_by:principal.user.id,tier,billing_interval:interval,
      stripe_price_id:priceId,status:'pending'}).select('id').single();
  if(intentError||!intent)return send({error:'An active checkout already exists, or billing is unavailable.'},409);

  try{
    const session=await createRchSitesCheckout({
      intentId:intent.id,organizationId:orgId,userId:principal.user.id,email:principal.user.email!,
      tier,interval,customerId:existing?.provider_customer_id??null,
    });
    if(!session.id||!session.url?.startsWith('https://checkout.stripe.com/'))
      throw new Error('Stripe did not issue a valid hosted checkout.');
    const {error:saveError}=await db.from('rch_site_billing_intents')
      .update({stripe_session_id:session.id,status:'checkout_ready'}).eq('id',intent.id).eq('status','pending');
    if(saveError)throw new Error('Could not persist the checkout session.');
    return send({url:session.url});
  }catch(error){
    console.error('RCH Sites checkout creation failed',error);
    await db.from('rch_site_billing_intents').update({status:'expired'})
      .eq('id',intent.id).eq('status','pending');
    return send({error:'Unable to start checkout. No subscription was activated.'},502);
  }
}
