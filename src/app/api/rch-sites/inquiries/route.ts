import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {isRchSiteSlug} from '@/lib/rch-site-builder';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const purposes=new Set(['training','program','event','general']);
const statuses=new Set(['contacted','closed']);
const orgTypes=new Set(['training','program','team','tournament','league','facility']);
const headers={'Cache-Control':'private, no-store'};
const respond=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers});

function sameOrigin(request:Request){
  try{
    const origin=request.headers.get('origin'),host=request.headers.get('host');
    if(!origin||!host)return false;
    const value=new URL(origin);
    return (value.protocol==='https:'||(value.protocol==='http:'&&value.hostname==='localhost'))
      && value.host.toLowerCase()===host.toLowerCase();
  }catch{return false;}
}
async function adultContext(){
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user||!user.email||!user.email_confirmed_at)return null;
  const {data:assurance,error:mfaError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(mfaError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))return null;
  const db=client as any;
  const [{data:profile,error:profileError},{data:adult,error:ageError}]=await Promise.all([
    db.from('profiles').select('is_active,onboarding_complete').eq('id',user.id).maybeSingle(),
    db.rpc('is_my_profile_adult'),
  ]);
  if(profileError||!profile||profile.is_active!==true||profile.onboarding_complete!==true||ageError||adult!==true)return null;
  return {user,db};
}
async function orgManager(context:NonNullable<Awaited<ReturnType<typeof adultContext>>>,organizationId:string,admin:any){
  if(!uuid.test(organizationId))return false;
  const [{data:member,error:memberError},{data:org,error:orgError}]=await Promise.all([
    context.db.from('network_organization_members').select('member_role,status')
      .eq('organization_id',organizationId).eq('profile_id',context.user.id).eq('status','active').maybeSingle(),
    admin.from('network_organizations').select('status,is_claimed,is_verified,network_tier,organization_type')
      .eq('id',organizationId).maybeSingle(),
  ]);
  if(memberError||orgError)return false;
  return member?.status==='active'&&['owner','manager'].includes(member.member_role)
    &&org?.status==='active'&&org?.is_verified===true&&org?.is_claimed===true
    &&org?.network_tier!=='flagship'&&orgTypes.has(org?.organization_type);
}
export async function GET(request:Request){
  const organizationId=new URL(request.url).searchParams.get('organizationId');
  if(!organizationId||!uuid.test(organizationId))return respond({error:'Choose an organization.'},400);
  const context=await adultContext();
  if(!context)return respond({error:'Sign in with a verified adult RCH account to manage inquiries.'},401);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return respond({error:'Organization inbox is unavailable.'},503);
  if(!await orgManager(context,organizationId,admin))return respond({error:'Only an approved organization owner or manager can access this inbox.'},403);
  const {data,error}=await admin.from('rch_site_inquiries')
    .select('id,contact_email,purpose,status,submitted_at,reviewed_at')
    .eq('organization_id',organizationId).order('submitted_at',{ascending:false}).limit(100);
  return error?respond({error:'Unable to load inquiries.'},503):respond({inquiries:data??[]});
}
export async function POST(request:Request){
  if(!sameOrigin(request))return respond({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length')||0)>2048)return respond({error:'Request too large.'},413);
  const context=await adultContext();
  if(!context)return respond({error:'Sign in to an email-verified adult RCH account before continuing.'},401);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return respond({error:'Organization inquiries are not available.'},503);
  let input:Record<string,unknown>;
  try{
    const parsed:unknown=await request.json();
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Invalid input');
    input=parsed as Record<string,unknown>;
  }catch{return respond({error:'Valid JSON is required.'},400);}
  if(input.action==='submit'){
    if(!isRchSiteSlug(input.slug)||typeof input.purpose!=='string'||!purposes.has(input.purpose)
      ||input.contactConsent!==true)return respond({error:'Select an interest type and agree to share your email.'},400);
    const {data:site,error:siteError}=await admin.from('rch_sites')
      .select('organization_id,status').eq('slug',input.slug).eq('status','published').maybeSingle();
    if(siteError)return respond({error:'Unable to verify the organization.'},503);
    if(!site)return respond({error:'Published organization website not found.'},404);
    const {data:org,error:orgError}=await admin.from('network_organizations')
      .select('status,is_claimed,is_verified,network_tier,organization_type')
      .eq('id',site.organization_id).maybeSingle();
    if(orgError)return respond({error:'Unable to verify the organization.'},503);
    if(!org||org.status!=='active'||org.is_claimed!==true||org.is_verified!==true||
       org.network_tier==='flagship'||!orgTypes.has(org.organization_type))
      return respond({error:'This organization is not accepting inquiries.'},403);
    const utcDay=new Date().toISOString().slice(0,10);
    const {count,error:countError}=await admin.from('rch_site_inquiries')
      .select('id',{head:true,count:'exact'}).eq('requester_id',context.user.id)
      .gte('submitted_on',utcDay);
    if(countError)return respond({error:'Unable to check inquiry limits.'},503);
    if((count??0)>=8)return respond({error:'Daily inquiry limit reached. You can submit another request tomorrow.'},429);
    const {error}=await admin.from('rch_site_inquiries').insert({
      organization_id:site.organization_id,requester_id:context.user.id,
      contact_email:context.user.email,purpose:input.purpose,contact_consent:true,
      submitted_on:utcDay,status:'new',
    });
    if(error)return respond({error:error.code==='23505'?'You already contacted this organization today. Try again tomorrow.':'Unable to send your inquiry.'},error.code==='23505'?409:503);
    return respond({status:'received'});
  }
  if(input.action==='setStatus'){
    if(typeof input.organizationId!=='string'||!uuid.test(input.organizationId)||
      typeof input.inquiryId!=='string'||!uuid.test(input.inquiryId)||
      typeof input.status!=='string'||!statuses.has(input.status))
      return respond({error:'Invalid inquiry update.'},400);
    if(!await orgManager(context,input.organizationId,admin))
      return respond({error:'Only an approved organization owner or manager can update this inquiry.'},403);
    const {data,error}=await admin.from('rch_site_inquiries').update({
      status:input.status,reviewed_at:new Date().toISOString(),reviewed_by:context.user.id,
    }).eq('id',input.inquiryId).eq('organization_id',input.organizationId).eq('status','new')
      .select('id').maybeSingle();
    if(error)return respond({error:'Unable to update this inquiry.'},503);
    return data?respond({status:input.status}):respond({error:'New inquiry not found or already handled.'},409);
  }
  return respond({error:'Unsupported inquiry action.'},400);
}
