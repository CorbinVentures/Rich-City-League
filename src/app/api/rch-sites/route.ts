import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {isRchSiteSlug, normalizeRchSiteDraft} from '@/lib/rch-site-builder';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Org = {
  id:string; slug:string; name:string; short_name:string|null;
  description:string|null; city:string|null; state:string;
  organization_type:string; status:string; network_tier:string;
  is_verified:boolean; is_claimed:boolean; cover_url:string|null;
  logo_url:string|null; instagram_url:string|null; youtube_url:string|null;
};
type Membership = {organization_id:string;member_role:string;status:string};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orgTypes = new Set(['training','program','team','tournament','league','facility']);
const managerRoles = new Set(['owner','manager']);
const editorRoles = new Set(['owner','manager','editor']);
const noStore = {'Cache-Control':'private, no-store'};

function send(body:Record<string,unknown>,status=200){
  return NextResponse.json(body,{status,headers:noStore});
}
function originVerified(request:Request){
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try {
    const value=new URL(origin);
    const requestHost=request.headers.get('host');
    return (value.protocol==='https:' || (value.protocol==='http:' && value.hostname==='localhost'))
      && Boolean(requestHost) && value.host.toLowerCase()===requestHost.toLowerCase();
  }catch{return false;}
}
function eligible(org:Org){
  return org.status==='active' && org.is_verified && org.is_claimed
    && org.network_tier!=='flagship' && orgTypes.has(org.organization_type);
}

export async function GET(){
  const client=await getServerSupabaseClient();
  if(!client)return send({error:'RCH Sites authentication is unavailable.'},503);
  const {data:{user}}=await client.auth.getUser();
  if(!user)return send({error:'Sign in to manage your website.'},401);
  const db=client as any;
  const {data:rows,error:memberError}=await db.from('network_organization_members')
    .select('organization_id,member_role,status').eq('profile_id',user.id).eq('status','active');
  if(memberError)return send({error:'Unable to verify organization access.'},503);
  const memberships=(rows??[]) as Membership[];
  if(!memberships.length)return send({organizations:[],drafts:[],published:[]});
  const ids=memberships.map(m=>m.organization_id);
  const [orgResult,draftResult,publishedResult]=await Promise.all([
    db.from('network_organizations').select('id,slug,name,short_name,description,city,state,organization_type,status,network_tier,is_verified,is_claimed,cover_url,logo_url,instagram_url,youtube_url').in('id',ids),
    db.from('rch_site_drafts').select('organization_id,slug,config,updated_at').in('organization_id',ids),
    db.from('rch_sites').select('organization_id,slug,status,published_at').in('organization_id',ids),
  ]);
  if(orgResult.error || draftResult.error || publishedResult.error)
    return send({error:'Site storage is not available yet. Contact RCH support.'},503);
  const roles=new Map(memberships.map(m=>[m.organization_id,m.member_role]));
  const organizations=((orgResult.data??[]) as Org[]).map(o=>({...o,member_role:roles.get(o.id),eligible:eligible(o)}));
  return send({organizations,drafts:draftResult.data??[],published:publishedResult.data??[]});
}

export async function POST(request:Request){
  if(!originVerified(request))return send({error:'The request must originate from this RCH website.'},403);
  const size=Number(request.headers.get('content-length')||0);
  if(size>12000)return send({error:'Site draft is too large.'},413);
  const client=await getServerSupabaseClient();
  if(!client)return send({error:'Authentication is unavailable.'},503);
  const {data:{user}}=await client.auth.getUser();
  if(!user)return send({error:'Sign in first.'},401);
  const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assuranceError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))
    return send({error:'Finish account security verification.'},403);

  let raw:Record<string,unknown>;
  try {
    const parsed:unknown=await request.json();
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed))throw Error('Invalid input');
    raw=parsed as Record<string,unknown>;
  }catch{return send({error:'Valid JSON is required.'},400);}
  const organizationId=raw.organizationId;
  const action=raw.action;
  if(typeof organizationId!=='string'||!uuid.test(organizationId)||!['save','publish','unpublish'].includes(String(action)))
    return send({error:'Select a valid organization and site action.'},400);

  const db=client as any;
  const {data:profile,error:profileError}=await db.from('profiles')
    .select('is_active,onboarding_complete').eq('id',user.id).maybeSingle();
  if(profileError)return send({error:'Account security could not be checked.'},503);
  if(!profile || profile.is_active!==true || profile.onboarding_complete!==true)
    return send({error:'Complete your active RCH account before editing websites.'},403);
  const {data:member,error:memberError}=await db.from('network_organization_members')
    .select('member_role,status').eq('organization_id',organizationId).eq('profile_id',user.id).eq('status','active').maybeSingle();
  if(memberError)return send({error:'Unable to check site permissions.'},503);
  if(!member||!editorRoles.has(member.member_role))return send({error:'Organization access is required.'},403);
  if(action!=='save'&&!managerRoles.has(member.member_role))
    return send({error:'Only organization owners and managers can publish.'},403);

  const {data:org,error:orgError}=await db.from('network_organizations')
    .select('id,slug,name,short_name,description,city,state,organization_type,status,network_tier,is_verified,is_claimed,cover_url,logo_url,instagram_url,youtube_url')
    .eq('id',organizationId).maybeSingle();
  if(orgError)return send({error:'Could not verify the organization.'},503);
  if(!org||!eligible(org as Org))return send({error:'An approved, claimed basketball organization is required.'},403);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return send({error:'RCH Sites publishing is not configured.'},503);

  if(action==='unpublish'){
    const {data:current,error:lookupError}=await admin.from('rch_sites').select('organization_id')
      .eq('organization_id',organizationId).maybeSingle();
    if(lookupError)return send({error:'Unable to find the published website.'},503);
    if(!current)return send({error:'No published site exists.'},404);
    const {error}=await admin.from('rch_sites').update({status:'unpublished'})
      .eq('organization_id',organizationId);
    return error?send({error:'Unable to unpublish the website.'},503):send({status:'unpublished'});
  }

  if(!isRchSiteSlug(raw.slug))return send({error:'Use a unique website address of 3–48 lowercase letters, numbers or hyphens.'},400);
  const safe=normalizeRchSiteDraft(raw.config);
  if(!safe.tagline || !safe.about)return send({error:'Add a short headline and a description before saving.'},400);

  // The browser cannot provide the name, verified status, admin role or recipient of published data.
  const {error:saveError}=await admin.from('rch_site_drafts').upsert({
    organization_id:organizationId,slug:raw.slug,config:safe,updated_by:user.id,
  },{onConflict:'organization_id'});
  if(saveError)return send({error:saveError.code==='23505'?'That website address is already in use.':'Unable to save this draft.'},saveError.code==='23505'?409:503);
  if(action==='save')return send({status:'draft',slug:raw.slug});

  // Only a verified owner/manager can copy a safe snapshot to the public table.
  // Unpublished edits never overwrite the currently published version.
  const {error:publishError}=await admin.from('rch_sites').upsert({
    organization_id:organizationId,slug:raw.slug,config:safe,status:'published',
    published_by:user.id,published_at:new Date().toISOString(),
  },{onConflict:'organization_id'});
  if(publishError)return send({error:publishError.code==='23505'?'That public URL belongs to another organization.':'Unable to publish this site.'},publishError.code==='23505'?409:503);
  return send({status:'published',slug:raw.slug,url:'/sites/'+raw.slug});
}
