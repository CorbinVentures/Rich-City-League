import 'server-only';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orgTypes=new Set(['training','program','team','tournament','league','facility']);
export function isRchSiteUuid(v:unknown):v is string{return typeof v==='string'&&uuid.test(v);}
export function rchSitesBillingOriginAllowed(request:Request){
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{
    const parsed=new URL(origin);
    return parsed.host.toLowerCase()===host.toLowerCase()
      && (parsed.protocol==='https:'||(parsed.protocol==='http:'&&parsed.hostname==='localhost'));
  }catch{return false;}
}
export async function getRchSitesBillingPrincipal(){
  const client=await getServerSupabaseClient();
  const admin=getSupabaseAdminClient() as any;
  if(!client||!admin)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user||!user.email||!user.email_confirmed_at)return null;
  const {data:mfa,error:mfaError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(mfaError||!mfa||(mfa.nextLevel==='aal2'&&mfa.currentLevel!=='aal2'))return null;
  const {data:profile,error}=await (client as any).from('profiles')
    .select('is_active,onboarding_complete').eq('id',user.id).maybeSingle();
  if(error||profile?.is_active!==true||profile?.onboarding_complete!==true)return null;
  return {client,admin,user};
}
export async function verifiedRchSiteBillingOrg(
  principal:NonNullable<Awaited<ReturnType<typeof getRchSitesBillingPrincipal>>>,
  orgId:string,
){
  if(!isRchSiteUuid(orgId))return null;
  const {data:membership,error}=await (principal.client as any).from('network_organization_members')
    .select('member_role,status').eq('organization_id',orgId)
    .eq('profile_id',principal.user.id).eq('status','active').maybeSingle();
  if(error||!membership||!['owner','manager'].includes(membership.member_role))return null;
  const {data:organization,error:orgError}=await principal.admin.from('network_organizations')
    .select('id,name,organization_type,status,is_verified,is_claimed,network_tier').eq('id',orgId).maybeSingle();
  if(orgError||!organization||organization.status!=='active'
    ||organization.is_verified!==true||organization.is_claimed!==true
    ||organization.network_tier==='flagship'||!orgTypes.has(organization.organization_type))return null;
  return organization;
}
