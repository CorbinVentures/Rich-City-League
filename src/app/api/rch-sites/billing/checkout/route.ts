import {NextResponse} from 'next/server';
import {rchBillingAccount,rchBillingManagedOrganization,rchBillingOriginIsValid} from '@/lib/rch-sites-billing-auth';
import {createRchSitesCheckout,rchSiteStripeReady} from '@/lib/rch-sites-stripe';
import {isRchSiteBillingInterval} from '@/lib/rch-sites-plans';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function response(body:object,status=200){return NextResponse.json(body,{status,headers});}
export async function POST(request:Request){
  if(!rchBillingOriginIsValid(request))return response({error:'Start checkout from Rich City Hoops.'},403);
  const context=await rchBillingAccount();
  if(!context)return response({error:'A verified and completed RCH login is required.'},401);
  if(!context.admin)return response({error:'Billing database unavailable.'},503);
  const raw=await request.json().catch(()=>null);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return response({error:'Valid JSON required.'},400);
  const input=raw as Record<string,unknown>;
  if((input.tier!=='amateur'&&input.tier!=='professional')||!isRchSiteBillingInterval(input.interval))
    return response({error:'Choose a paid website plan and billing interval.'},400);
  const org=await rchBillingManagedOrganization(context,input.organizationId);
  if(!org)return response({error:'Only a verified organization owner or manager can buy a website plan.'},403);
  const {data:existing,error}=await context.admin.from('rch_site_subscriptions')
    .select('tier,billing_status,provider_subscription_ref,provider_customer_ref')
    .eq('organization_id',org.id).maybeSingle();
  if(error)return response({error:'Could not validate organization billing.'},503);
  if(existing?.provider_subscription_ref&&existing.billing_status!=='canceled')
    return response({error:'manage_existing',message:'Manage the existing website subscription instead of starting another.'},409);
  if(!rchSiteStripeReady(input.tier,input.interval))
    return response({error:'billing_not_configured',message:'Website paid checkout is not available yet.'},503);
  try{
    const session=await createRchSitesCheckout({organizationId:org.id,userId:context.user.id,
      email:context.user.email!,tier:input.tier,interval:input.interval,
      customerId:existing?.provider_customer_ref||null});
    return session.url?response({url:session.url}):response({error:'No checkout URL returned.'},502);
  }catch(err){console.error('rch sites checkout failed',err);
    return response({error:'Unable to create a secure website checkout session.'},502);}
}
