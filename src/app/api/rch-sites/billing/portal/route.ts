import {NextResponse} from 'next/server';
import {rchBillingAccount,rchBillingManagedOrganization,rchBillingOriginIsValid} from '@/lib/rch-sites-billing-auth';
import {createRchSitesPortal} from '@/lib/rch-sites-stripe';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:Request){
  if(!rchBillingOriginIsValid(request))return NextResponse.json({error:'Invalid billing request.'},{status:403,headers});
  const context=await rchBillingAccount();
  if(!context)return NextResponse.json({error:'Sign in to manage billing.'},{status:401,headers});
  const input=await request.json().catch(()=>null);
  const org=await rchBillingManagedOrganization(context,input?.organizationId);
  if(!org)return NextResponse.json({error:'Verified organization manager access required.'},{status:403,headers});
  const {data:sub,error}=await context.admin.from('rch_site_subscriptions')
    .select('provider_customer_ref').eq('organization_id',org.id).maybeSingle();
  if(error||!sub?.provider_customer_ref)return NextResponse.json({error:'No RCH Sites subscription customer exists.'},{status:409,headers});
  try{const session=await createRchSitesPortal(sub.provider_customer_ref);
    return NextResponse.json({url:session.url},{headers});}
  catch(err){console.error('RCH Sites portal failed',err);
    return NextResponse.json({error:'Unable to open subscription management.'},{status:502,headers});}
}
