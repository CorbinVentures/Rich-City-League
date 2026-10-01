import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { OrganizationDirectory, type DirectoryOrganization } from '@/components/network/OrganizationDirectory';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowLeft, FaArrowRight, FaBullhorn } from 'react-icons/fa6';

export const revalidate=60;

const REGIONS:Record<string,{label:string;description:string}>={
  'central-virginia':{label:'Central Virginia',description:'Discover basketball leagues, programs, tournaments, training, facilities, and creators across Richmond and Central Virginia.'},
  'hampton-roads':{label:'Hampton Roads',description:'Discover basketball organizations and opportunities across Hampton Roads and Coastal Virginia.'},
  'northern-virginia':{label:'Northern Virginia',description:'Discover basketball organizations and opportunities across Northern Virginia.'},
  'shenandoah':{label:'Shenandoah Valley',description:'Discover basketball organizations and opportunities throughout the Shenandoah Valley.'},
  'southwest-virginia':{label:'Southwest Virginia',description:'Discover basketball organizations and opportunities across Southwest Virginia.'},
  'statewide':{label:'Statewide',description:'Discover Virginia basketball organizations that operate across multiple regions of the Commonwealth.'},
  'other':{label:'Other Virginia Areas',description:'Discover Virginia basketball organizations outside the Network’s primary regional groupings.'},
};

export async function generateMetadata({params}:{params:Promise<{region:string}>}) {
  const {region}=await params; const item=REGIONS[region];
  if(!item) return {title:'Virginia Basketball | RCL Network'};
  return {title:`${item.label} Basketball Organizations | RCL Network`,description:item.description};
}

export default async function RegionalOrganizationsPage({params}:{params:Promise<{region:string}>}) {
  const {region}=await params; const item=REGIONS[region]; if(!item) notFound();
  const client=getPublicClient(); const db:any=client;
  const {data}=db?await db.from('network_organizations').select('id,slug,name,short_name,description,organization_type,region,city,state,is_verified,is_claimed,network_tier,is_featured,featured_rank').eq('status','active').order('featured_rank',{ascending:true,nullsFirst:false}).order('name'):{data:[]};
  const organizations=(data??[]) as DirectoryOrganization[];
  const regionCount=organizations.filter(org=>org.region===region).length;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_80%_10%,rgba(44,166,255,.11),transparent_28%),linear-gradient(145deg,#071522,#03070d)]"><Container maxWidth="xl" className="py-12 sm:py-16"><Link href="/organizations" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Virginia directory</Link><p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Network · Regional discovery</p><h1 className="mt-3 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-7xl">{item.label}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/50">{item.description}</p><div className="mt-6 flex flex-wrap gap-3"><span className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/55">{regionCount} listed organization{regionCount===1?'':'s'}</span><Link href="/network/partners/apply" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black">Add one free <FaBullhorn/></Link></div></Container></section>
    <Container maxWidth="xl" className="py-10 sm:py-14"><OrganizationDirectory organizations={organizations} initialRegion={region} showRegionLinks={false}/>{regionCount===0&&<section className="mt-10 rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Build the map</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Be one of the first organizations represented in {item.label}.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">A standard Network listing is free. Once RCL creates the page, an authorized representative can claim it and manage the organization’s public presence.</p><Link href="/network/partners/apply" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Submit an organization <FaArrowRight/></Link></section>}</Container>
  </main>;
}
