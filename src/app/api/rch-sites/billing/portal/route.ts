import {NextResponse} from 'next/server';
import {getRchSitesBillingPrincipal,verifiedRchSiteBillingOrg,
  isRchSiteUuid,rchSitesBillingOriginAllowed} from '@/lib/rch-sites-billing-auth';
import {createRchSitesPortal} from '@/lib/rch-sites-stripe-billing';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers});

export async function POST(request:Request){
  if(!rchSitesBillingOriginAllowed(request))return reply({error:'Use the RCH website to manage billing.'},403);
  if(Number(request.headers.get('content-length')||0)>1200)return reply({error:'Request too large.'},413);
  const principal=await getRchSitesBillingPrincipal();
  if(!principal)return reply({error:'Sign in with a verified account.'},401);
  let input:{organizationId?:unknown};
  try{input=await request.json();}catch{return reply({error:'Valid JSON is required.'},400);}
  if(!isRchSiteUuid(input?.organizationId)||
    !await verifiedRchSiteBillingOrg(principal,input.organizationId))
    return reply({error:'Verified organization owner or manager required.'},403);
  const {data:subscription,error}=await principal.admin.from('rch_site_subscriptions')
    .select('provider_customer_id,provider_subscription_ref')
    .eq('organization_id',input.organizationId).maybeSingle();
  if(error)return reply({error:'Unable to inspect your website subscription.'},503);
  if(!subscription?.provider_customer_id||!subscription?.provider_subscription_ref)
    return reply({error:'No active website billing account is linked.'},409);
  try{
    const session=await createRchSitesPortal(subscription.provider_customer_id);
    if(!session.url?.startsWith('https://billing.stripe.com/'))
      throw new Error('Stripe did not provide a valid customer portal.');
    return reply({url:session.url});
  }catch(error){
    console.error('RCH Sites portal failed',error);
    return reply({error:'Website billing portal is unavailable.'},502);
  }
}
