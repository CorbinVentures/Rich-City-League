import Link from 'next/link';
import { Container } from '@/components/Container';
import { OrganizationDirectory, type DirectoryOrganization } from '@/components/network/OrganizationDirectory';
import { getPublicClient } from '@/lib/public-data';
import { COMMUNITY_ORGANIZATION_TYPES } from '@/lib/network-taxonomy';
import { FaArrowRight, FaCalendarDays, FaLocationDot } from 'react-icons/fa6';

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
    <Container maxWidth="xl" className="pt-6 sm:pt-9">
      <h1 className="font-display text-3xl font-black uppercase">Community</h1>
      <p className="mt-1 text-sm text-white/60">Events, groups and local organizations</p>
    </Container>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <section className="mt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Weekend Guide foundation</p><h2 className="mt-2 font-display text-4xl font-black uppercase">Upcoming events</h2></div>
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
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">Community partners</p><h2 className="mt-2 font-display text-4xl font-black uppercase">Find organizations</h2></div><p className="max-w-xl text-xs leading-5 text-white/35">{organizations.length} community organization{organizations.length===1?'':'s'} currently represented. Free participation stays separate from paid promotion.</p></div>
        <OrganizationDirectory organizations={organizations} showRegionLinks={false}/>
      </section>

      <details className="mt-8 rounded-xl border border-white/15 p-4">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">For organizations and partners</summary>
        <p className="mt-3 text-sm text-white/60">Bring your events and community to Rich City Hoops. Joining is free; paid promotion is optional.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/network/partners/apply?plan=community" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-sm font-bold text-black">Join free <FaArrowRight/></Link>
          <Link href="/sponsors" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm font-bold">Sponsor RCH</Link>
        </div>
      </details>
    </Container>
  </main>;
}
