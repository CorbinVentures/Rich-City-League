import {NextResponse} from 'next/server';
import {getSupabaseAdminClient} from '@/lib/supabase-admin';
import {isRchSiteSlug} from '@/lib/rch-site-builder';
import {cleanLabel,parseToolkitForm} from '@/lib/rch-sites-free-toolkit';
import {rchSitesBillingOriginAllowed} from '@/lib/rch-sites-billing-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,
  {status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
async function findRegistration(slug:string){
  if(!isRchSiteSlug(slug))return null;
  const admin=getSupabaseAdminClient() as any;
  if(!admin)return null;
  const {data:site,error:siteError}=await admin.from('rch_sites').select('organization_id')
    .eq('slug',slug).eq('status','published').maybeSingle();
  if(siteError||!site)return null;
  const [{data:org,error:orgError},{data:toolkit,error:toolkitError}]=await Promise.all([
    admin.from('network_organizations').select('name,status,is_verified,is_claimed,network_tier')
      .eq('id',site.organization_id).maybeSingle(),
    admin.from('rch_site_toolkit').select('form').eq('organization_id',site.organization_id).maybeSingle(),
  ]);
  if(orgError||toolkitError||!org||org.status!=='active'||!org.is_verified||!org.is_claimed||
    org.network_tier==='flagship'||!toolkit)return null;
  let form;
  try{form=parseToolkitForm(toolkit.form);}catch{return null;}
  if(!form.open)return null;
  return {admin,organizationId:site.organization_id,name:org.name as string,form};
}
export async function GET(request:Request){
  if(process.env.RCH_SITES_TOOLKIT_ENABLED!=='true')return reply({error:'Not available'},404);
  const slug=new URL(request.url).searchParams.get('slug')||'';
  const target=await findRegistration(slug);
  return target?reply({title:target.form.title,organizationName:target.name}):
    reply({error:'Registration is not open.'},404);
}
export async function POST(request:Request){
  if(process.env.RCH_SITES_TOOLKIT_ENABLED!=='true')return reply({error:'Not available'},404);
  if(!rchSitesBillingOriginAllowed(request))return reply({error:'Invalid origin'},403);
  if(Number(request.headers.get('content-length')||0)>3000)return reply({error:'Request too large'},413);
  let body:Record<string,unknown>;
  try{const raw:unknown=await request.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error();body=raw as Record<string,unknown>;}
  catch{return reply({error:'Valid registration information is required.'},400);}
  if(body.website!==undefined&&body.website!=='')return reply({status:'received'});
  if(body.isAdult!==true||body.privacyConsent!==true)
    return reply({error:'Adult confirmation and privacy agreement are required.'},400);
  const name=cleanLabel(body.name,90),email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)
    return reply({error:'Enter a valid name and email.'},400);
  const slug=typeof body.slug==='string'?body.slug:'';
  const target=await findRegistration(slug);
  if(!target)return reply({error:'Registration is not open.'},404);
  const {error}=await target.admin.from('rch_site_toolkit_registrations').insert({
    organization_id:target.organizationId,name,email,
  });
  if(error?.code==='23505')return reply({status:'received'});
  if(error?.code==='P0001')return reply({error:'This organization has reached its current registration limit.'},409);
  if(error)return reply({error:'Registration could not be completed.'},503);
  return reply({status:'received'});
}
