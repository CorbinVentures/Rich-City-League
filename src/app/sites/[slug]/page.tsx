import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {RchSiteView, type RchSiteOrganization, type RchSiteEvent} from '@/components/sites/RchSiteView';
import {isRchSiteSlug,normalizeRchSiteDraft} from '@/lib/rch-site-builder';
import {getPublicClient} from '@/lib/public-data';

export const dynamic='force-dynamic';
type Params={params:Promise<{slug:string}>};
type Snapshot={organization_id:string;slug:string;config:unknown;status:string};
const siteOrigin='https://www.richcityhoops.com';

async function loadPublicSite(slug:string){
  if(!isRchSiteSlug(slug))return null;
  const db=getPublicClient() as any;
  if(!db)return null;
  const {data:site,error}=await db.from('rch_sites')
    .select('organization_id,slug,config,status').eq('slug',slug).eq('status','published').maybeSingle();
  if(error||!site)return null;
  const snapshot=site as Snapshot;
  const {data:org}=await db.from('network_organizations')
    .select('slug,name,short_name,description,city,state,logo_url,cover_url,instagram_url,youtube_url')
    .eq('id',snapshot.organization_id).eq('status','active')
    .eq('is_verified',true).eq('is_claimed',true).maybeSingle();
  if(!org)return null;
  return {db,site:snapshot,organization:org as RchSiteOrganization,config:normalizeRchSiteDraft(snapshot.config)};
}
export async function generateMetadata({params}:Params):Promise<Metadata>{
  const {slug}=await params;
  const record=await loadPublicSite(slug);
  if(!record)return {title:'Website not found | Rich City Hoops',robots:{index:false,follow:false}};
  const title=record.organization.name;
  const description=record.config.about.slice(0,160)||'Basketball programs and opportunities on Rich City Hoops.';
  return {
    title:{absolute:title+' | RCH Sites'},description,
    alternates:{canonical:'/sites/'+slug},
    openGraph:{title,description,url:siteOrigin+'/sites/'+slug,type:'website'},
    robots:{index:true,follow:true},
  };
}
export default async function RchPublishedSite({params}:Params){
  const {slug}=await params;
  const record=await loadPublicSite(slug);
  if(!record)notFound();
  const {data:events}=record.config.sections.includes('schedule')
    ? await record.db.from('network_events')
      .select('id,slug,title,starts_at,city')
      .eq('organization_id',record.site.organization_id)
      .eq('status','published').gte('starts_at',new Date().toISOString())
      .order('starts_at',{ascending:true}).limit(6)
    : {data:[]};
  const {data:bookableServices}=await record.db.from('rch_site_services')
    .select('id').eq('organization_id',record.site.organization_id)
    .eq('status','active').limit(1);
  const bookingAvailable=Boolean(bookableServices?.length);
  const {data:paypalLinks}=await record.db.from('rch_site_paypal_offerings')
    .select('id').eq('organization_id',record.site.organization_id).eq('active',true).limit(1);
  const paypalAvailable=Boolean(paypalLinks?.length);
  const jsonld={
    '@context':'https://schema.org','@type':'Organization',
    name:record.organization.name,
    url:siteOrigin+'/sites/'+slug,
    description:record.config.about.slice(0,500),
    parentOrganization:{'@type':'Organization',name:'Rich City Hoops',url:siteOrigin},
  };
  return <>
    <RchSiteView organization={record.organization} config={record.config} events={(events??[]) as RchSiteEvent[]} bookingAvailable={bookingAvailable} paypalAvailable={paypalAvailable} siteSlug={slug}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonld).replace(/</g,'\\u003c')}}/>
  </>;
}
