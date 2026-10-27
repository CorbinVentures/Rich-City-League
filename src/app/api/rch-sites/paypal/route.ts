import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {getPublicClient} from '@/lib/public-data';
import {isRchSiteSlug} from '@/lib/rch-site-builder';
import {MAX_PAYPAL_OFFERINGS,normalizePayPalOffering} from '@/lib/rch-site-paypal';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'Cache-Control':'private, no-store'};
const eligibleTypes=new Set(['training','program','team','tournament','league','facility']);
const send=(obj:Record<string,unknown>,status=200)=>NextResponse.json(obj,{status,headers});

function sameOrigin(request:Request){
  try {
    const origin=request.headers.get('origin'),host=request.headers.get('host');
    if(!origin||!host)return false;
    const value=new URL(origin);
    return (value.protocol==='https:'||(value.protocol==='http:'&&value.hostname==='localhost'))
      && value.host.toLowerCase()===host.toLowerCase();
  }catch{return false;}
}
async function owner(id:string){
  if(!uuid.test(id))return null;
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user)return null;
  const {data:assurance,error:mfaError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(mfaError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))return null;
  const db=client as any;
  const [{data:profile},{data:member},{data:org}]=await Promise.all([
    db.from('profiles').select('is_active,onboarding_complete').eq('id',user.id).maybeSingle(),
    db.from('network_organization_members').select('member_role,status').eq('organization_id',id)
      .eq('profile_id',user.id).eq('status','active').maybeSingle(),
    db.from('network_organizations').select('status,is_claimed,is_verified,network_tier,organization_type').eq('id',id).maybeSingle(),
  ]);
  if(profile?.is_active!==true||profile?.onboarding_complete!==true||
    member?.status!=='active'||!['owner','manager'].includes(member?.member_role)||
    org?.status!=='active'||org?.is_verified!==true||org?.is_claimed!==true||
    org?.network_tier==='flagship'||!eligibleTypes.has(org?.organization_type))return null;
  return {user};
}
export async function GET(request:Request){
  const url=new URL(request.url);
  const organizationId=url.searchParams.get('organizationId');
  if(organizationId!==null){
    if(!await owner(organizationId))return send({error:'Approved organization owner or manager access is required.'},403);
    const admin=getSupabaseAdminClient() as any;
    if(!admin)return send({error:'Payments settings are unavailable.'},503);
    const {data,error}=await admin.from('rch_site_paypal_offerings')
      .select('id,title,description,amount_cents,currency,payment_url,active,created_at')
      .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(25);
    return error?send({error:'Could not load payment links.'},503):send({offerings:data??[]});
  }
  const slug=url.searchParams.get('slug');
  if(!isRchSiteSlug(slug))return send({error:'A valid published website is required.'},400);
  const db=getPublicClient() as any;
  if(!db)return send({error:'Payment links unavailable.'},503);
  const {data:site,error}=await db.from('rch_sites').select('organization_id')
    .eq('slug',slug).eq('status','published').maybeSingle();
  if(error)return send({error:'Payment links unavailable.'},503);
  if(!site)return send({error:'Organization website not found.'},404);
  const {data:links,error:linkError}=await db.from('rch_site_paypal_offerings')
    .select('id,title,description,amount_cents,currency,payment_url')
    .eq('organization_id',site.organization_id).eq('active',true)
    .order('created_at',{ascending:false}).limit(MAX_PAYPAL_OFFERINGS);
  return linkError?send({error:'Payment links unavailable.'},503):send({offerings:links??[]});
}
export async function POST(request:Request){
  if(!sameOrigin(request))return send({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length')||0)>4096)return send({error:'Request too large.'},413);
  let raw:Record<string,unknown>;
  try{
    const parsed:unknown=await request.json();
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid input');
    raw=parsed as Record<string,unknown>;
  }catch{return send({error:'Valid JSON is required.'},400);}
  if(typeof raw.organizationId!=='string'||!uuid.test(raw.organizationId))
    return send({error:'Choose a valid organization.'},400);
  if(!await owner(raw.organizationId))return send({error:'Only approved organization owners or managers can edit payment links.'},403);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return send({error:'Payment link setup is unavailable.'},503);
  if(raw.action==='create'){
    const safe=normalizePayPalOffering(raw);
    if(!safe)return send({error:'Enter a valid title, displayed price, and an official PayPal Business Payment Link.'},400);
    const {count,error:countError}=await admin.from('rch_site_paypal_offerings').select('id',{count:'exact',head:true})
      .eq('organization_id',raw.organizationId).eq('active',true);
    if(countError)return send({error:'Unable to verify limits.'},503);
    if((count??0)>=MAX_PAYPAL_OFFERINGS)return send({error:'Maximum 12 active links per organization.'},409);
    const {data,error}=await admin.from('rch_site_paypal_offerings').insert({
      organization_id:raw.organizationId,...safe,active:true,
    }).select('id').single();
    return error?send({error:'Unable to save this link.'},503):send({status:'created',id:data.id});
  }
  if(raw.action==='deactivate'){
    if(typeof raw.offeringId!=='string'||!uuid.test(raw.offeringId))
      return send({error:'Select a valid payment link.'},400);
    const {data,error}=await admin.from('rch_site_paypal_offerings').update({active:false})
      .eq('id',raw.offeringId).eq('organization_id',raw.organizationId).eq('active',true)
      .select('id').maybeSingle();
    if(error)return send({error:'Unable to disable this payment link.'},503);
    return data?send({status:'deactivated'}):send({error:'Active link not found.'},404);
  }
  return send({error:'Unsupported action.'},400);
}
