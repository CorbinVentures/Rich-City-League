import Link from 'next/link';
import { Container } from '@/components/Container';
import { OrganizationDirectory, type DirectoryOrganization } from '@/components/network/OrganizationDirectory';
import { getPublicClient } from '@/lib/public-data';
import { NETWORK_REGIONS } from '@/lib/network-taxonomy';
import { FaArrowRight, FaBullhorn, FaCircleCheck, FaLocationDot, FaPeopleGroup } from 'react-icons/fa6';

export const metadata = {
  title: 'Virginia Organizations & Community Partners | RCH Network',
  description: 'Discover basketball organizations, social clubs, car clubs, run clubs, creators, local businesses, and community partners across Virginia through Rich City Hoops.',
};

export const revalidate = 60;

export default async function OrganizationsPage() {
  const client=getPublicClient();
  const db:any=client;
  const {data}=db ? await db.from('network_organizations').select('id,slug,name,short_name,description,organization_type,region,city,state,is_verified,is_claimed,network_tier,is_featured,featured_rank').eq('status','active').order('featured_rank',{ascending:true,nullsFirst:false}).order('name') : {data:[]};
  const organizations=(data??[]) as DirectoryOrganization[];
  const verified=organizations.filter(org=>org.is_verified).length;
  const claimable=organizations.filter(org=>!org.is_claimed&&org.network_tier!=='flagship').length;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_8%,rgba(44,166,255,.12),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-12 sm:py-16">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCH Network Directory</p>
        <h1 className="mt-3 max-w-5xl font-display text-5xl font-black uppercase leading-[.94] tracking-[-.04em] sm:text-7xl">Virginia communities.<br/><span className="text-rcl-blue">One network to find them.</span></h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-white/50">Basketball stays at the center of Rich City Hoops, but the culture around it is bigger. Search leagues, clubs, creators, run crews, car communities, local businesses, events, and organizations while every partner keeps control of its own brand and operations.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/community" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-[#03101a]">RCH Community <FaPeopleGroup/></Link>
          <Link href="/network" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">Basketball Network <FaArrowRight/></Link>
          <Link href="/network/partners/apply?plan=community" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-orange/30 px-4 text-xs font-black uppercase text-rcl-orange">Add an organization <FaBullhorn/></Link>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat value={organizations.length} label="Organizations" icon={<FaLocationDot/>}/>
        <Stat value={verified} label="Verified operators" icon={<FaCircleCheck/>}/>
        <Stat value={claimable} label="Listings available to claim" icon={<FaBullhorn/>}/>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Statewide discovery</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Find an organization</h2></div><p className="max-w-xl text-xs leading-5 text-white/35">Don&apos;t see the group or business you need? Anyone can suggest a free listing. Organization representatives can claim it after RCH verifies their connection.</p></div>
        <OrganizationDirectory organizations={organizations}/>
      </section>

      <section className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NETWORK_REGIONS.filter(item=>item.value!=='other').map(({value,label})=>{
          const count=organizations.filter(org=>org.region===value).length;
          return <Link key={value} href={`/organizations/region/${value}`} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-rcl-blue/35"><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/30">Regional directory</p><h3 className="mt-2 font-display text-2xl font-black uppercase">{label}</h3><p className="mt-2 text-xs text-white/35">{count} organization{count===1?'':'s'}</p><span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase text-rcl-blue">Explore region <FaArrowRight className="transition group-hover:translate-x-1"/></span></Link>;
        })}
      </section>

      <section className="mt-12 rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">For community operators</p><div className="mt-2 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end"><div><h2 className="font-display text-4xl font-black uppercase">Your free listing should work for you.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">Claimed organizations can maintain their public presence, submit events for discovery, track RCH-generated views and outbound clicks, and decide later whether paid distribution makes sense.</p></div><Link href="/network/partners/apply?plan=community" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Join free <FaArrowRight/></Link></div></section>
    </Container>
  </main>;
}

function Stat({value,label,icon}:{value:number;label:string;icon:React.ReactNode}) { return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-rcl-blue">{icon}</span><strong className="mt-3 block font-display text-4xl font-black">{value.toLocaleString()}</strong><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/35">{label}</span></div>; }
