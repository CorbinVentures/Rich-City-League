import {NextResponse} from 'next/server';
import {rchBillingAccount,rchBillingManagedOrganization} from '@/lib/rch-sites-billing-auth';
import {rchSiteStripeReady} from '@/lib/rch-sites-stripe';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
  const headers={'Cache-Control':'private, no-store'};
  const context=await rchBillingAccount();
  if(!context)return NextResponse.json({error:'Sign in to see website billing.'},{status:401,headers});
  const organizationId=new URL(request.url).searchParams.get('organizationId');
  const org=await rchBillingManagedOrganization(context,organizationId);
  if(!org)return NextResponse.json({error:'Verified organization manager access required.'},{status:403,headers});
  const {data:sub,error}=await context.admin.from('rch_site_subscriptions')
    .select('tier,billing_status,billing_interval,current_period_end,cancel_at_period_end,provider_customer_ref')
    .eq('organization_id',org.id).maybeSingle();
  if(error)return NextResponse.json({error:'Could not read website billing.'},{status:503,headers});
  return NextResponse.json({checkoutOpen:([
      ['amateur','monthly'],['amateur','annual'],['professional','monthly'],['professional','annual']
    ] as const).every(([tier,interval])=>rchSiteStripeReady(tier,interval)),organization:{id:org.id,name:org.name},
    subscription:{tier:sub?.tier||'free',status:sub?.billing_status||'none',interval:sub?.billing_interval||null,
      currentPeriodEnd:sub?.current_period_end||null,
      cancelAtPeriodEnd:sub?.cancel_at_period_end||false,canManage:!!sub?.provider_customer_ref}},{headers});
}
