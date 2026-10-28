import {NextResponse} from 'next/server';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {
  isRchSiteSlug,normalizeRchSiteDraft,RCH_SITE_TYPES,type RchSiteType,
} from '@/lib/rch-site-builder';
import {isRchSitePlanTier} from '@/lib/rch-sites-plans';
import {NETWORK_REGIONS} from '@/lib/network-taxonomy';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const headers={'Cache-Control':'private, no-store'};
const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedRegions=new Set<string>(NETWORK_REGIONS.map(region=>region.value));
const ownerRoles=new Set(['owner','manager']);
const basketballOrgTypes=new Set(['training','program','team','tournament','league','facility']);
const typeToOrg:Record<RchSiteType,'training'|'program'|'tournament'>={
  trainer:'training',coach:'training',aau:'program',organizer:'tournament',
};
function reply(data:Record<string,unknown>,status=200){
  return NextResponse.json(data,{status,headers});
}
function validOrigin(request:Request){
  try{
    const origin=request.headers.get('origin');
    const host=request.headers.get('host');
    if(!origin||!host)return false;
    const url=new URL(origin);
    return url.host.toLowerCase()===host.toLowerCase()
      && (url.protocol==='https:'||(url.protocol==='http:'&&url.hostname==='localhost'));
  }catch{return false;}
}
function safeText(value:unknown,max:number){
  return typeof value==='string'?value.replace(/<[^>]*>/g,'')
    .replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
}
async function account(){
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user||!user.email||!user.email_confirmed_at)return null;
  const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assuranceError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))return null;
  const {data:profile,error}=await (client as any).from('profiles')
    .select('is_active,onboarding_complete').eq('id',user.id).maybeSingle();
  if(error||profile?.is_active!==true||profile?.onboarding_complete!==true)return null;
  return {client,user};
}

export async function GET(){
  const context=await account();
  if(!context)return reply({error:'Sign in with a completed, verified RCH account to continue.'},401);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return reply({error:'Website setup is temporarily unavailable.'},503);
  const {data:draft,error}=await admin.from('rch_site_starter_drafts')
    .select('organization_name,desired_slug,preferred_tier,config,verification_inquiry_id,updated_at')
    .eq('profile_id',context.user.id).maybeSingle();
  if(error)return reply({error:'Could not load your saved website.'},503);
  let verificationStatus:null|string=null;
  if(draft?.verification_inquiry_id){
    const {data:inquiry}=await admin.from('network_partner_inquiries').select('status')
      .eq('id',draft.verification_inquiry_id).eq('submitted_by',context.user.id).maybeSingle();
    verificationStatus=inquiry?.status??'submitted';
  }
  return reply({draft:draft?{organizationName:draft.organization_name,slug:draft.desired_slug,
    tier:draft.preferred_tier,config:draft.config,
    verificationRequested:!!draft.verification_inquiry_id,verificationStatus,
    updatedAt:draft.updated_at}:null});
}

export async function POST(request:Request){
  if(!validOrigin(request))return reply({error:'Submit website setup from the RCH website.'},403);
  if(Number(request.headers.get('content-length')||0)>12000)return reply({error:'Setup details are too large.'},413);
  const context=await account();
  if(!context)return reply({error:'Sign in with a completed, verified RCH account.'},401);
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return reply({error:'Website setup is temporarily unavailable.'},503);
  let raw:Record<string,unknown>;
  try{
    const body:unknown=await request.json();
    if(!body||typeof body!=='object'||Array.isArray(body))throw Error();
    raw=body as Record<string,unknown>;
  }catch{return reply({error:'Valid setup details are required.'},400);}
  const {data:starter,error:starterError}=await admin.from('rch_site_starter_drafts')
    .select('profile_id,organization_name,desired_slug,preferred_tier,config,verification_inquiry_id')
    .eq('profile_id',context.user.id).maybeSingle();
  if(starterError)return reply({error:'Could not check your saved website.'},503);

  if(raw.action==='save'){
    const organizationName=safeText(raw.organizationName,140);
    if(organizationName.length<2)return reply({error:'Enter your basketball business or program name.'},400);
    if(!isRchSiteSlug(raw.slug))return reply({error:'Choose a website address with 3–48 letters, numbers or hyphens.'},400);
    if(!isRchSitePlanTier(raw.tier))return reply({error:'Select a website plan.'},400);
    const config=normalizeRchSiteDraft(raw.config);
    if(!RCH_SITE_TYPES.includes(config.siteType))return reply({error:'Choose a website template.'},400);
    if(!config.tagline||!config.about)return reply({error:'Add a headline and short description to save.'},400);
    if(starter?.verification_inquiry_id&&
        starter.organization_name.toLowerCase()!==organizationName.toLowerCase())
      return reply({error:'This name is attached to your pending verification. Contact RCH to change the organization.'},409);
    const values={organization_name:organizationName,desired_slug:raw.slug,
      preferred_tier:raw.tier,config};
    const result=starter
      ?await admin.from('rch_site_starter_drafts').update(values)
        .eq('profile_id',context.user.id)
      :await admin.from('rch_site_starter_drafts').insert({
        profile_id:context.user.id,...values,
      });
    if(result.error)return reply({error:'Unable to save your private website draft.'},503);
    return reply({status:'saved',slug:raw.slug});
  }

  if(!starter)return reply({error:'Save your website draft first.'},409);

  if(raw.action==='requestVerification'){
    if(starter.verification_inquiry_id)return reply({status:'already_requested'});
    const contactName=safeText(raw.contactName,120);
    const city=safeText(raw.city,120);
    const region=raw.region;
    const proofUrl=typeof raw.proofUrl==='string'?raw.proofUrl.trim():'';
    if(contactName.length<2)return reply({error:'Enter your name for organization verification.'},400);
    if(typeof region!=='string'||!allowedRegions.has(region))
      return reply({error:'Choose your operating region.'},400);
    if(proofUrl){
      try{if(new URL(proofUrl).protocol!=='https:')throw Error();}
      catch{return reply({error:'Proof links must use https://.'},400);}
      if(proofUrl.length>500)return reply({error:'Proof link is too long.'},400);
    }
    // Never silently claim a name that already has a Network listing.
    const {data:listings,error:matchError}=await admin.from('network_organizations')
      .select('id,slug,name,network_tier').eq('status','active')
      .ilike('name',starter.organization_name.replace(/[%_\\]/g,'\\$&')).limit(5);
    if(matchError)return reply({error:'Unable to check existing organization listings.'},503);
    const existing=(listings??[]).find((o:any)=>o.name.toLowerCase()===starter.organization_name.toLowerCase());
    if(existing)return reply({status:'existing_listing',slug:existing.slug},409);
    const siteType=normalizeRchSiteDraft(starter.config).siteType;
    const {data:inquiry,error}=await admin.from('network_partner_inquiries').insert({
      organization_name:starter.organization_name,
      organization_type:typeToOrg[siteType],
      contact_name:contactName,contact_email:context.user.email,
      city:city||null,region,website_url:proofUrl||null,
      submitted_by:context.user.id,
      plan_interest:'community',source:'partner-application',status:'new',
      goals:'RCH Sites publishing verification: private starter website completed. Preferred website tier: '
        +starter.preferred_tier+'. Proposed address: '+starter.desired_slug+'.',
    }).select('id').single();
    if(error||!inquiry)return reply({error:'Could not request website verification.'},503);
    const {error:updateError}=await admin.from('rch_site_starter_drafts')
      .update({verification_inquiry_id:inquiry.id,verification_requested_at:new Date().toISOString()})
      .eq('profile_id',context.user.id).is('verification_inquiry_id',null);
    if(updateError)return reply({error:'Your verification request was received, but we could not update your draft. Contact RCH support.'},503);
    return reply({status:'verification_requested'});
  }

  if(raw.action==='import'){
    if(typeof raw.organizationId!=='string'||!validUuid.test(raw.organizationId))
      return reply({error:'Choose your verified organization.'},400);
    const id=raw.organizationId;
    const {data:member,error:memberError}=await admin.from('network_organization_members')
      .select('member_role').eq('organization_id',id).eq('profile_id',context.user.id)
      .eq('status','active').maybeSingle();
    if(memberError||!member||!ownerRoles.has(member.member_role))
      return reply({error:'Verified organization owner or manager access is required.'},403);
    const {data:org,error:orgError}=await admin.from('network_organizations')
      .select('status,is_verified,is_claimed,network_tier,organization_type').eq('id',id).maybeSingle();
    if(orgError||!org||org.status!=='active'||org.is_verified!==true||
      org.is_claimed!==true||org.network_tier==='flagship'||!basketballOrgTypes.has(org.organization_type))
      return reply({error:'Organization verification must be completed before publishing.'},403);
    const [{data:existingDraft,error:draftError},{data:existingSite,error:siteError}]=await Promise.all([
      admin.from('rch_site_drafts').select('organization_id').eq('organization_id',id).maybeSingle(),
      admin.from('rch_sites').select('organization_id').eq('organization_id',id).maybeSingle(),
    ]);
    if(draftError||siteError)return reply({error:'Could not check your organization website.'},503);
    if(existingDraft||existingSite)
      return reply({error:'Your organization already has a website. Open Website Studio to continue instead.'},409);
    const config=normalizeRchSiteDraft(starter.config);
    if(!isRchSiteSlug(starter.desired_slug)||!config.tagline||!config.about)
      return reply({error:'Update your starter draft before importing.'},400);
    const {error:insertError}=await admin.from('rch_site_drafts').insert({
      organization_id:id,slug:starter.desired_slug,config,updated_by:context.user.id,
    });
    if(insertError)return reply({error:insertError.code==='23505'
      ?'This site address is already in use, or your organization has a draft. Open Website Studio or choose a new address.'
      :'Unable to copy your draft into Website Studio.'},insertError.code==='23505'?409:503);
    return reply({status:'imported',studioUrl:'/network/dashboard/sites'});
  }

  return reply({error:'Unknown website setup action.'},400);
}
