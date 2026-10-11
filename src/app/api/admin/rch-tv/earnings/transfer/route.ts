import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {creatorStripeRequest,creatorTransfersEnabled,verifySameOrigin,type ConnectedAccount} from '@/lib/rch-creator-stripe';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request:Request){
  if(!verifySameOrigin(request))return NextResponse.json({error:'Invalid request origin'},{status:403});
  const client=await getServerSupabaseClient();
  if(!client)return NextResponse.json({error:'Authentication unavailable'},{status:503});
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  const {data:profile}=await (client as any).from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(profile?.role!=='admin')return NextResponse.json({error:'Admin required'},{status:403});
  if(!creatorTransfersEnabled())return NextResponse.json({error:'Creator transfers are disabled until platform finance and compliance are approved.'},{status:503});
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return NextResponse.json({error:'Payout database unavailable'},{status:503});
  let body:{earningId?:unknown};
  try{body=await request.json();}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
  if(typeof body.earningId!=='string'||!UUID.test(body.earningId))return NextResponse.json({error:'Valid earning ID required'},{status:400});
  const {data:earning,error:earningError}=await admin.from('rch_creator_earnings').select('id,creator_id,status,earned_cents').eq('id',body.earningId).maybeSingle();
  if(earningError||!earning)return NextResponse.json({error:'Earning not found'},{status:404});
  if(earning.status!=='approved'||Number(earning.earned_cents)<=0)return NextResponse.json({error:'Only positive, approved earnings can transfer'},{status:409});
  const {data:account}=await admin.from('rch_creator_accounts').select('status,stripe_connect_account_id,terms_accepted_at').eq('profile_id',earning.creator_id).maybeSingle();
  if(account?.status!=='approved'||!account.terms_accepted_at||!account.stripe_connect_account_id)return NextResponse.json({error:'Creator onboarding not ready'},{status:409});
  let ready=false;
  try{
    const remote=await creatorStripeRequest<ConnectedAccount>('/accounts/'+encodeURIComponent(account.stripe_connect_account_id));
    ready=Boolean(remote.payouts_enabled&&remote.details_submitted&&remote.capabilities?.transfers==='active');
  }catch(e){return NextResponse.json({error:'Stripe account verification failed'},{status:503});}
  if(!ready)return NextResponse.json({error:'Stripe connected account is not payout-ready'},{status:409});
  const idempotency='rch-creator-earning-'+earning.id;
  const {error:claimError}=await admin.from('rch_creator_disbursements').insert({
    earning_id:earning.id,creator_id:earning.creator_id,
    amount_cents:Number(earning.earned_cents),idempotency_key:idempotency,initiated_by:user.id
  });
  if(claimError)return NextResponse.json({error:'Transfer already attempted or locked. Reconcile any prior Stripe attempt manually before retrying.'},{status:409});
  // At-most-once application call; ambiguous network results never auto-retry.
  try{
    const stripe=await creatorStripeRequest<{id:string}>('/transfers',{
      method:'POST',idempotencyKey:idempotency,
      body:new URLSearchParams({
        amount:String(earning.earned_cents),currency:'usd',
        destination:account.stripe_connect_account_id,
        transfer_group:'rch-tv-'+earning.id,
        'metadata[rch_earning_id]':earning.id,
        'metadata[rch_creator_id]':earning.creator_id
      })
    });
    const {error:saveError}=await admin.from('rch_creator_disbursements').update({
      stripe_transfer_id:stripe.id,status:'transferred',transferred_at:new Date().toISOString(),error_note:null
    }).eq('earning_id',earning.id);
    if(saveError)throw new Error('Stripe transfer created but database recording failed; investigate manually.');
    return NextResponse.json({transferId:stripe.id,status:'transferred',message:'Funds transferred to connected Stripe balance. Bank payout confirmation is separate.'});
  }catch(e){
    await admin.from('rch_creator_disbursements').update({status:'needs_review',error_note:e instanceof Error?e.message.slice(0,500):'Unknown transfer outcome'}).eq('earning_id',earning.id).eq('status','initiated');
    console.error('RCH creator transfer requires manual reconciliation',earning.id,e);
    return NextResponse.json({error:'Transfer outcome requires manual reconciliation. Do not retry automatically.'},{status:502});
  }
}
