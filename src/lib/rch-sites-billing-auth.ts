import 'server-only';
import {getServerSupabaseClient} from '@/lib/supabase-server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const kinds=new Set(['training','program','team','tournament','league','facility']);
export function rchBillingOriginIsValid(request:Request){
  const origin=request.headers.get('origin'),host=request.headers.get('host');
  if(!origin||!host)return false;
  try{const url=new URL(origin);
    return (url.protocol==='https:'||(url.protocol==='http:'&&url.hostname==='localhost'))
      &&url.host.toLowerCase()===host.toLowerCase();
  }catch{return false;}
}
export async function rchBillingAccount(){
  const client=await getServerSupabaseClient();
  if(!client)return null;
  const {data:{user}}=await client.auth.getUser();
  if(!user?.email||!user.email_confirmed_at)return null;
  const {data:assurance,error:mfaError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(mfaError||!assurance||(assurance.nextLevel==='aal2'&&assurance.currentLevel!=='aal2'))return null;
  const {data:profile,error}=await (client as any).from('profiles')
    .select('is_active,onboarding_complete').eq('id',user.id).maybeSingle();
  if(error||profile?.is_active!==true||profile?.onboarding_complete!==true)return null;
  return {client,user,admin:getSupabaseAdminClient() as any};
}
export async function rchBillingManagedOrganization(
  context:NonNullable<Awaited<ReturnType<typeof rchBillingAccount>>>,id:unknown
){
  if(typeof id!=='string'||!uuid.test(id)||!context.admin)return null;
  const {data:member,error}=await (context.client as any).from('network_organization_members')
    .select('member_role,status').eq('organization_id',id).eq('profile_id',context.user.id)
    .eq('status','active').maybeSingle();
  if(error||!member||!['owner','manager'].includes(member.member_role))return null;
  const {data:org,error:orgError}=await context.admin.from('network_organizations')
    .select('id,name,status,is_verified,is_claimed,network_tier,organization_type')
    .eq('id',id).maybeSingle();
  if(orgError||!org||org.status!=='active'||org.is_verified!==true||
    org.is_claimed!==true||org.network_tier==='flagship'||!kinds.has(org.organization_type))return null;
  return org as {id:string;name:string};
}
