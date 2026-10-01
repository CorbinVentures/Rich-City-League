import Link from 'next/link';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowRight, FaBasketball, FaBullhorn, FaCircleCheck, FaLocationDot } from 'react-icons/fa6';

export const metadata = {
  title: 'Virginia Basketball Organizations | RCL Network',
  description: 'Discover leagues, tournaments, programs, clubs, facilities, creators, and basketball organizations across Virginia.',
};

export const revalidate = 60;

type Organization = {
  id:string; slug:string; name:string; short_name:string|null; description:string|null;
  organization_type:string; region:string; city:string|null; state:string;
  is_verified:boolean; verification_label:string|null; network_tier:string; is_featured:boolean; featured_rank:number|null;
};

export default async function OrganizationsPage() {
  const client=getPublicClient();
  const db:any=client;
  const {data}=db ? await db.from('network_organizations').select('id,slug,name,short_name,description,organization_type,region,city,state,is_verified,verification_label,network_tier,is_featured,featured_rank').eq('status','active').order('featured_rank',{ascending:true,nullsFirst:false}).order('name') : {data:[]};
  const organizations=(data??[]) as Organization[];
  const featured=organizations.filter((org)=>org.is_featured||org.network_tier==='flagship');
  const regions=[...new Set(organizations.map((org)=>org.region))].sort();

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-12 sm:py-16">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Network Directory</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-6xl">Virginia basketball.<br/><span className="text-rcl-blue">Find your next connection.</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">Explore organizations across the Commonwealth without changing how they operate. RCL Network is the discovery and exposure layer; each organization controls its own programs, registration, and operations.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/network" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">Network home <FaArrowRight/></Link>
          <Link href="/network/partners/apply" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase text-black">Add your organization <FaBullhorn/></Link>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      {featured.length>0&&<section className="mb-12">
        <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Featured in the Network</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Flagship & featured organizations</h2></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{featured.map((org)=><OrgCard key={org.id} org={org}/>)}</div>
      </section>}

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Statewide directory</p><h2 className="mt-2 font-display text-3xl font-black uppercase">All organizations</h2><p className="mt-2 text-sm text-white/40">{organizations.length} organization{organizations.length===1?'':'s'} currently represented.</p></div>{regions.length>0&&<div className="flex flex-wrap gap-2">{regions.map((region)=><span key={region} className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white/45">{pretty(region)}</span>)}</div>}</div>
        {organizations.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{organizations.map((org)=><OrgCard key={org.id} org={org}/>)}</div> : <div className="rounded-2xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-8 text-sm text-white/45">The directory is being built. Virginia basketball organizations can request a Network listing now.</div>}
      </section>
    </Container>
  </main>;
}

function OrgCard({org}:{org:Organization}) {
  const flagship=org.network_tier==='flagship';
  return <Link href={`/organizations/${org.slug}`} className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 ${flagship?'border-rcl-orange/30 bg-rcl-orange/[.045] hover:border-rcl-orange/55':'border-rcl-blue/15 bg-[#071522]/60 hover:border-rcl-blue/45'}`}>
    <div className="flex items-start justify-between gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border font-display text-lg font-black ${flagship?'border-rcl-orange/25 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/20 bg-rcl-blue/10 text-rcl-blue'}`}>{(org.short_name||org.name).slice(0,3).toUpperCase()}</span><div className="flex flex-wrap justify-end gap-1.5">{flagship&&<Badge copy="RCL Flagship" orange/>}{org.network_tier==='premier'&&<Badge copy="Premier Partner" orange/>}{org.is_verified&&<Badge copy="Verified"/>}</div></div>
    <h3 className="mt-4 font-display text-2xl font-black uppercase">{org.name}</h3>
    <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wide text-white/35"><span className="flex items-center gap-1.5"><FaBasketball/>{pretty(org.organization_type)}</span><span className="flex items-center gap-1.5"><FaLocationDot/>{org.city ? `${org.city}, ${org.state}` : pretty(org.region)}</span></div>
    <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/40">{org.description||'Official Virginia basketball organization in the RCL Network.'}</p>
    <span className={`mt-5 inline-flex items-center gap-2 text-xs font-black uppercase ${flagship?'text-rcl-orange':'text-rcl-blue'}`}>View organization <FaArrowRight className="transition group-hover:translate-x-1"/></span>
  </Link>;
}

function Badge({copy,orange=false}:{copy:string;orange?:boolean}) { return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${orange?'border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/30 bg-rcl-blue/10 text-rcl-blue'}`}>{!orange&&<FaCircleCheck/>}{copy}</span>; }
function pretty(value:string) { return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
