import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {creatorSiteOrigin,creatorStripeRequest,verifySameOrigin,type ConnectedAccount} from '@/lib/rch-creator-stripe';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type AccountRecord={profile_id:string;status:string;terms_accepted_at:string|null;stripe_connect_account_id:string|null};
async function creator(){
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user)return null;
  // A verified creator with MFA enabled must finish the second factor before
  // the service-role Stripe/creator-account path can act for this account.
  const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assuranceError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))return null;
  const db=client as any;
  const {data:account}=await db.from('rch_creator_accounts').select('profile_id,status,terms_accepted_at,stripe_connect_account_id').eq('profile_id',user.id).maybeSingle();
  return {user,client,account:account as AccountRecord|null};
}
async function sync(accountId:string,profileId:string){
  const admin=getSupabaseAdminClient() as any;
  if(!admin)throw new Error('Payout onboarding is not configured.');
  const remote=await creatorStripeRequest<ConnectedAccount>('/accounts/'+encodeURIComponent(accountId));
  await admin.from('rch_creator_accounts').update({
    stripe_details_submitted:Boolean(remote.details_submitted),
    stripe_payouts_enabled:Boolean(remote.payouts_enabled&&remote.capabilities?.transfers==='active'),
    stripe_checked_at:new Date().toISOString()
  }).eq('profile_id',profileId).eq('stripe_connect_account_id',accountId).throwOnError();
  return {connected:true,detailsSubmitted:Boolean(remote.details_submitted),payoutsEnabled:Boolean(remote.payouts_enabled&&remote.capabilities?.transfers==='active')};
}
export async function GET(){
  const context=await creator();
  if(!context)return NextResponse.json({error:'Sign in required'},{status:401});
  if(!context.account||context.account.status!=='approved')return NextResponse.json({connected:false,approved:false});
  if(!context.account.stripe_connect_account_id)return NextResponse.json({connected:false,approved:true});
  try{return NextResponse.json(await sync(context.account.stripe_connect_account_id,context.user.id));}
  catch{return NextResponse.json({error:'Unable to verify Stripe onboarding at this time.'},{status:503});}
}
export async function POST(request:Request){
  if(!verifySameOrigin(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
  const context=await creator();
  if(!context)return NextResponse.json({error:'Sign in required'},{status:401});
  if(!context.account||context.account.status!=='approved'||!context.account.terms_accepted_at)return NextResponse.json({error:'A signed approved creator agreement is required.'},{status:403});
  const db=context.client as any;
  const {data:isAdult,error:ageError}=await db.rpc('is_my_profile_adult');
  if(ageError)return NextResponse.json({error:'Adult eligibility verification is temporarily unavailable.'},{status:503});
  if(isAdult!==true)return NextResponse.json({error:'Verified adult age is required for Stripe payout onboarding.'},{status:403});
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return NextResponse.json({error:'Stripe payout onboarding is not configured.'},{status:503});
  try{
    let accountId=context.account.stripe_connect_account_id;
    if(!accountId){
      const body=new URLSearchParams({
        type:'express',country:'US',email:context.user.email||'',
        'capabilities[transfers][requested]':'true',
        'metadata[rch_creator_profile_id]':context.user.id
      });
      const stripe=await creatorStripeRequest<{id:string}>('/accounts',{method:'POST',body,idempotencyKey:'rch-connect-'+context.user.id});
      accountId=stripe.id;
      await admin.from('rch_creator_accounts').update({stripe_connect_account_id:accountId}).eq('profile_id',context.user.id).is('stripe_connect_account_id',null).throwOnError();
      const {data:saved}=await admin.from('rch_creator_accounts').select('stripe_connect_account_id').eq('profile_id',context.user.id).single();
      if(saved?.stripe_connect_account_id!==accountId)return NextResponse.json({error:'Concurrent onboarding detected. Retry using the linked account.'},{status:409});
    }
    const origin=creatorSiteOrigin();
    const link=await creatorStripeRequest<{url:string}>('/account_links',{method:'POST',body:new URLSearchParams({
      account:accountId,
      type:'account_onboarding',
      refresh_url:origin+'/media/creators/dashboard?stripe=refresh',
      return_url:origin+'/media/creators/dashboard?stripe=returned'
    })});
    return NextResponse.json({url:link.url});
  }catch(e){console.error('creator connect onboarding failed',e);return NextResponse.json({error:e instanceof Error?e.message:'Unable to start Stripe onboarding.'},{status:502});}
}
