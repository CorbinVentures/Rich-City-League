import {NextResponse} from 'next/server';
import {getRchSitesBillingPrincipal,verifiedRchSiteBillingOrg,
  isRchSiteUuid,rchSitesBillingOriginAllowed} from '@/lib/rch-sites-billing-auth';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {EMPTY_BUDGET,parseToolkitTeams,parseToolkitGames,parseToolkitBudget,
  parseToolkitForm} from '@/lib/rch-sites-free-toolkit';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const reply=(body:Record<string,unknown>,status=200)=>NextResponse.json(body,{status,headers});
const enabled=()=>process.env.RCH_SITES_TOOLKIT_ENABLED==='true';
const empty={teams:[],games:[],budget:EMPTY_BUDGET,
  form:{title:'Basketball Registration',open:false},schedule_public:false,revision:0};
async function authorized(organizationId:unknown){
  if(!isRchSiteUuid(organizationId))return null;
  const principal=await getRchSitesBillingPrincipal();
  if(!principal)return null;
  const org=await verifiedRchSiteBillingOrg(principal,organizationId);
  return org?{principal,org}:null;
}
export async function GET(request:Request){
  if(!enabled())return reply({error:'The basketball toolkit is not released yet.'},503);
  const organizationId=new URL(request.url).searchParams.get('organizationId');
  const context=await authorized(organizationId);
  if(!context)return reply({error:'Verified organization owner or manager access required.'},403);
  const admin=context.principal.admin as any;
  const [{data,error},{data:registrations,error:regError},{data:site}]=await Promise.all([
    admin.from('rch_site_toolkit').select('teams,games,budget,form,schedule_public,revision,updated_at')
      .eq('organization_id',organizationId).maybeSingle(),
    admin.from('rch_site_toolkit_registrations').select('id,name,email,created_at')
      .eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(250),
    admin.from('rch_sites').select('slug,status').eq('organization_id',organizationId).maybeSingle(),
  ]);
  if(error||regError)return reply({error:'Toolkit data is unavailable.'},503);
  const project=data?{...data,budget:{...EMPTY_BUDGET,...(data.budget||{})}}:empty;
  return reply({project,registrations:registrations??[],
    publicSlug:site?.status==='published'?site.slug:null,organizationName:context.org.name});
}
export async function POST(request:Request){
  if(!enabled())return reply({error:'The basketball toolkit is not released yet.'},503);
  if(!rchSitesBillingOriginAllowed(request))return reply({error:'Invalid request origin.'},403);
  if(Number(request.headers.get('content-length')||0)>100000)return reply({error:'Request too large.'},413);
  let input:Record<string,unknown>;
  try{const body:unknown=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error();input=body as Record<string,unknown>;}
  catch{return reply({error:'Valid JSON is required.'},400);}
  const organizationId=input.organizationId;
  const context=await authorized(organizationId);
  if(!context)return reply({error:'Verified organization owner or manager access required.'},403);
  const action=input.action;
  if(action==='deleteRegistration'){
    if(!isRchSiteUuid(input.registrationId))
      return reply({error:'Invalid registration identifier.'},400);
    const {error}=await (context.principal.admin as any).from('rch_site_toolkit_registrations')
      .delete().eq('organization_id',organizationId).eq('id',input.registrationId);
    return error?reply({error:'Unable to delete this registration.'},503):reply({status:'deleted'});
  }
  if(!['saveTeams','saveGames','saveForm','saveBudget','publishSchedule','unpublishSchedule'].includes(String(action)))
    return reply({error:'Unsupported toolkit action.'},400);
  if(typeof input.revision!=='number'||!Number.isSafeInteger(input.revision)||input.revision<0)
    return reply({error:'Refresh this toolkit before saving.'},400);
  const admin=context.principal.admin as any;
  const {data:stored,error:readError}=await admin.from('rch_site_toolkit')
    .select('revision,teams,games').eq('organization_id',organizationId).maybeSingle();
  if(readError)return reply({error:'Could not check the latest toolkit revision.'},503);
  if((stored?.revision??0)!==input.revision)
    return reply({error:'Another edit was saved. Refresh to protect your changes.'},409);
  const patch:Record<string,unknown>={};
  try{
    switch(action){
      case 'saveTeams':{
        const teams=parseToolkitTeams(input.value);
        if(stored?.games?.length)parseToolkitGames(stored.games,teams);
        patch.teams=teams;break;
      }
      case 'saveGames':
        patch.games=parseToolkitGames(input.value,parseToolkitTeams(stored?.teams??[]));
        patch.schedule_public=false;break;
      case 'publishSchedule':{
        if(!stored?.games?.length)return reply({error:'Save a valid schedule before publishing.'},409);
        const {data:site,error:siteError}=await admin.from('rch_sites').select('status')
          .eq('organization_id',organizationId).maybeSingle();
        if(siteError||site?.status!=='published')return reply({error:'Publish your organization website first.'},409);
        patch.schedule_public=true;break;
      }
      case 'unpublishSchedule':
        patch.schedule_public=false;break;
      case 'saveBudget':
        patch.budget=parseToolkitBudget(input.value);break;
      case 'saveForm':{
        const form=parseToolkitForm(input.value);
        if(form.open){
          const {data:site,error:siteError}=await admin.from('rch_sites')
            .select('status').eq('organization_id',organizationId).maybeSingle();
          if(siteError||site?.status!=='published')
            return reply({error:'Publish your organization website before opening registration.'},409);
        }
        patch.form=form;break;
      }
    }
  }catch(e){return reply({error:e instanceof Error?e.message:'Invalid toolkit data.'},400);}
  const revision=(stored?.revision??0)+1;
  if(stored){
    const {data,error}=await admin.from('rch_site_toolkit')
      .update({...patch,revision,updated_at:new Date().toISOString()})
      .eq('organization_id',organizationId).eq('revision',input.revision)
      .select('revision').maybeSingle();
    if(error)return reply({error:'Unable to save toolkit data.'},503);
    if(!data)return reply({error:'Another edit was saved. Refresh before retrying.'},409);
  }else{
    const {error}=await admin.from('rch_site_toolkit').insert({
      organization_id:organizationId,...patch,revision,
    });
    if(error)return reply({error:error.code==='23505'?'Another edit was saved. Refresh before retrying.':
      'Unable to initialize toolkit data.'},error.code==='23505'?409:503);
  }
  return reply({status:'saved',revision});
}
