import Link from 'next/link';
import { Container } from '@/components/Container';
import { OrganizationDirectory, type DirectoryOrganization } from '@/components/network/OrganizationDirectory';
import { getPublicClient } from '@/lib/public-data';
import { COMMUNITY_ORGANIZATION_TYPES } from '@/lib/network-taxonomy';
import {
  FaArrowRight, FaBullhorn, FaCalendarDays, FaCar, FaHeart, FaLocationDot,
  FaPeopleGroup, FaPersonRunning, FaStore,
} from 'react-icons/fa6';

export const metadata = {
  title: 'RCH Community | Richmond & Virginia Culture',
  description: 'Discover community partners, social clubs, car culture, run clubs, local events, businesses, and organizations connected to Rich City Hoops.',
};

export const revalidate = 60;

type CommunityEvent = {
  id:string; slug:string; title:string; event_type:string; city:string|null; state:string;
  venue_name:string|null; starts_at:string; organization_id:string; external_url:string|null;
};

export default async function CommunityPage(){
  const client=getPublicClient();
  const db:any=client;
  const allTypes=[...COMMUNITY_ORGANIZATION_TYPES];
  const now=new Date().toISOString();

  const {data:organizationRows}=db ? await db
    .from('network_organizations')
    .select('id,slug,name,short_name,description,organization_type,region,city,state,is_verified,is_claimed,network_tier,is_featured,featured_rank')
    .eq('status','active')
    .in('organization_type',allTypes)
    .order('featured_rank',{ascending:true,nullsFirst:false})
    .order('name')
    .limit(200) : {data:[]};

  const organizations=(organizationRows??[]) as DirectoryOrganization[];
  const ids=organizations.map(item=>item.id);
  let events:CommunityEvent[]=[];
  if(db&&ids.length){
    const {data}=await db.from('network_events')
      .select('id,slug,title,event_type,city,state,venue_name,starts_at,organization_id,external_url')
      .eq('status','published')
      .in('organization_id',ids)
      .gte('starts_at',now)
      .order('starts_at',{ascending:true})
      .limit(12);
    events=(data??[]) as CommunityEvent[];
  }
  const orgMap=new Map(organizations.map(item=>[item.id,item]));

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="relative overflow-hidden border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_12%,rgba(21,159,255,.14),transparent_30%),radial-gradient(circle_at_12%_86%,rgba(249,115,22,.08),transparent_28%),linear-gradient(145deg,#071522,#03070d_70%)]">
      <Container maxWidth="xl" className="py-14 sm:py-20 lg:py-24">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-rcl-orange">RCH Community Network</p>
        <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[.92] tracking-[-.045em] sm:text-7xl lg:text-8xl">Basketball at the center.<br/><span className="text-rcl-blue">Richmond culture around it.</span></h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">Rich City Hoops connects more than games. Discover the social clubs, car communities, run crews, local businesses, creators, and organizations that overlap with Virginia basketball culture.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="#community-directory" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-[#03101a]">Explore community <FaArrowRight/></Link>
          <Link href="/network/partners" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-orange/35 bg-rcl-orange/[.06] px-5 text-xs font-black uppercase tracking-wide text-rcl-orange">Become a partner <FaBullhorn/></Link>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CultureCard icon={<FaCar/>} title="Car culture" copy="Cruise-ins, shows, clubs, meets, and enthusiast communities."/>
          <CultureCard icon={<FaHeart/>} title="Social life" copy="Social clubs, couples events, mixers, alumni groups, and networking."/>
          <CultureCard icon={<FaPersonRunning/>} title="Active RVA" copy="Run clubs, fitness communities, and lifestyle events."/>
          <CultureCard icon={<FaStore/>} title="Local business" copy="Brands and businesses that want to reach the RCH audience."/>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">The community flywheel</p>
          <h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Partners grow the audience. The audience creates value.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/45">Community organizations can join free, keep their own identity, publish activity, and gain another discovery channel. RCH then gives local businesses and sponsors a measurable way to reach the combined audience without turning community participation into a paywall.</p>
        </div>
        <div className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.045] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">For advertisers</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">Reach Richmond culture through RCH.</h2>
          <p className="mt-3 text-sm leading-6 text-white/45">Promote a business, event, launch, or offer through sponsored feed placements, featured events, community inventory, email, RCH TV, and recurring category sponsorships.</p>
          <Link href="/network/partners#advertising" className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rcl-orange">See advertising options <FaArrowRight/></Link>
        </div>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Weekend Guide foundation</p><h2 className="mt-2 font-display text-4xl font-black uppercase">What&apos;s happening around the community</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">As partners add events, RCH can turn this stream into a recurring Richmond weekend guide spanning hoops, cars, social events, fitness, and community activity.</p></div>
          <Link href="/network/partners/apply" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/60">Add your organization <FaArrowRight/></Link>
        </div>
        {events.length?<div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{events.slice(0,8).map(event=>{
          const org=orgMap.get(event.organization_id);
          const when=new Date(event.starts_at);
          return <article key={event.id} className="rounded-2xl border border-white/10 bg-[#071522]/55 p-5">
            <div className="flex items-center justify-between gap-3"><span className="rounded-full border border-rcl-blue/20 bg-rcl-blue/10 px-2.5 py-1 text-[9px] font-black uppercase text-rcl-blue">{event.event_type.replaceAll('-',' ')}</span><FaCalendarDays className="text-white/20"/></div>
            <h3 className="mt-4 font-display text-2xl font-black uppercase">{event.title}</h3>
            <p className="mt-2 text-xs text-white/40">{org?.name??'Community partner'}</p>
            <p className="mt-3 flex items-center gap-2 text-xs text-white/35"><FaLocationDot/>{event.city?`${event.city}, ${event.state}`:(event.venue_name??'Virginia')}</p>
            <p className="mt-2 text-xs font-bold text-white/55">{when.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {when.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</p>
            <Link href={`/network/events/${event.slug}`} className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase text-rcl-blue">View event <FaArrowRight/></Link>
          </article>;
        })}</div>:<div className="mt-6 rounded-3xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-8"><p className="text-sm text-white/40">Community events will populate here as the first partner class is onboarded.</p></div>}
      </section>

      <section id="community-directory" className="mt-14 scroll-mt-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Community partners</p><h2 className="mt-2 font-display text-4xl font-black uppercase">Find organizations connected to RCH</h2></div><p className="max-w-xl text-xs leading-5 text-white/35">{organizations.length} community organization{organizations.length===1?'':'s'} currently represented. Free participation stays separate from paid promotion.</p></div>
        <OrganizationDirectory organizations={organizations} showRegionLinks={false}/>
      </section>

      <section className="mt-14 overflow-hidden rounded-3xl border border-rcl-orange/25 bg-[linear-gradient(120deg,rgba(249,115,22,.07),#071522_45%,rgba(21,159,255,.08))] p-7 sm:p-10">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Founding partner class</p><h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Bring your community into the network.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">RCH does not take over your club, event, audience, or brand. The free community layer is about discovery and distribution. Paid promotion is optional when you want additional reach.</p></div>
          <Link href="/network/partners/apply?plan=community" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black">Join free <FaArrowRight/></Link>
        </div>
      </section>
    </Container>
  </main>;
}

function CultureCard({icon,title,copy}:{icon:React.ReactNode;title:string;copy:string}){
  return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-xl text-rcl-blue">{icon}</span><h3 className="mt-3 font-display text-2xl font-black uppercase">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{copy}</p></div>;
}
