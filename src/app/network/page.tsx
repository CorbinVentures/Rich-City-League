import Link from 'next/link';
import { Container } from '@/components/Container';
import { NetworkImpression, TrackedNetworkLink } from '@/components/network/NetworkExposure';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowRight, FaBullhorn, FaChartLine, FaCircleCheck, FaLocationDot, FaPeopleGroup } from 'react-icons/fa6';

export const metadata = {
  title: 'RCL Network | Virginia Basketball',
  description: 'Discover Virginia basketball organizations, leagues, tournaments, programs, events, and stories through the RCL Network.',
};

export const revalidate = 60;

type Organization = {
  id:string; slug:string; name:string; short_name:string|null; description:string|null;
  organization_type:string; region:string; city:string|null; state:string; website_url:string|null;
  is_verified:boolean; verification_label:string|null; network_tier:string; is_featured:boolean; featured_rank:number|null;
};

type NetworkEvent = {
  id:string; organization_id:string; slug:string; title:string; event_type:string; city:string|null; state:string;
  venue_name:string|null; starts_at:string; external_url:string|null; is_featured:boolean;
};

type Promotion = {
  id:string; organization_id:string; event_id:string|null; campaign_id:string|null; placement:string;
  headline:string|null; disclosure_label:string; destination_url:string|null; starts_at:string; ends_at:string;
  organization:{id:string;slug:string;name:string;short_name:string|null}|null;
};

export default async function NetworkPage() {
  const client = getPublicClient();
  const db:any = client;
  const now = new Date().toISOString();
  const [{data:organizationsRaw},{data:eventsRaw},{data:promotionsRaw}] = db ? await Promise.all([
    db.from('network_organizations').select('id,slug,name,short_name,description,organization_type,region,city,state,website_url,is_verified,verification_label,network_tier,is_featured,featured_rank').eq('status','active').order('featured_rank',{ascending:true,nullsFirst:false}).order('name').limit(12),
    db.from('network_events').select('id,organization_id,slug,title,event_type,city,state,venue_name,starts_at,external_url,is_featured').eq('status','published').gte('starts_at',now).order('is_featured',{ascending:false}).order('starts_at',{ascending:true}).limit(8),
    db.from('network_promotions').select('id,organization_id,event_id,campaign_id,placement,headline,disclosure_label,destination_url,starts_at,ends_at,organization:network_organizations!organization_id(id,slug,name,short_name)').eq('status','active').eq('placement','network-home').lte('starts_at',now).gte('ends_at',now).order('sort_weight',{ascending:false}).limit(2),
  ]) : [{data:[]},{data:[]},{data:[]}];
  const organizations=(organizationsRaw??[]) as Organization[];
  const events=(eventsRaw??[]) as NetworkEvent[];
  const promotions=(promotionsRaw??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})) as Promotion[];
  const orgMap=new Map(organizations.map((org)=>[org.id,org]));
  const flagship=organizations.find((org)=>org.network_tier==='flagship');

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="relative overflow-hidden border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_75%_20%,rgba(21,159,255,.16),transparent_32%),linear-gradient(145deg,#071522,#03070d_68%)]">
      <Container maxWidth="xl" className="relative py-14 sm:py-20 lg:py-24">
        <div className="max-w-4xl">
          <p className="text-[11px] font-black uppercase tracking-[.24em] text-rcl-orange">RCL Network · Virginia Basketball</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.92] tracking-[-.045em] sm:text-6xl lg:text-8xl">One network.<br/><span className="text-rcl-blue">Virginia hoops.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">Discover leagues, tournaments, programs, events, creators, and basketball culture across Virginia—while Rich City League remains RCL&apos;s flagship competitive property.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/organizations" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-[#03101a]">Explore organizations <FaArrowRight/></Link>
            <Link href="/network/partners" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-orange/35 bg-rcl-orange/[.06] px-5 text-xs font-black uppercase tracking-wide text-rcl-orange">Grow your exposure <FaBullhorn/></Link>
            <Link href="/network/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-xs font-black uppercase tracking-wide text-white/55">Partner dashboard <FaChartLine/></Link>
          </div>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <ValueStat icon={<FaPeopleGroup/>} label="Discover" detail="Virginia basketball organizations in one place."/>
          <ValueStat icon={<FaBullhorn/>} label="Amplify" detail="Events and stories distributed to a basketball audience."/>
          <ValueStat icon={<FaChartLine/>} label="Measure" detail="Reach, views, clicks, shares, and audience growth."/>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      {promotions.length>0 && <section className="mb-14"><SectionHeading eyebrow="Sponsored across RCL Network" title="Featured partner exposure" detail="Paid placement is always disclosed. Sponsorship changes distribution, never competitive rankings, REP, awards, or basketball results."/><div className="grid gap-4 md:grid-cols-2">{promotions.map(p=><SponsoredCard key={p.id} promotion={p}/>)}</div></section>}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
        <div>
          <SectionHeading eyebrow="Virginia Network" title="Basketball lives beyond one league" detail="RCL Network is built to expose the entire ecosystem without taking over how other organizations operate." actionHref="/organizations" actionLabel="See directory"/>
          {organizations.length ? <div className="grid gap-3 sm:grid-cols-2">{organizations.slice(0,6).map((org)=><OrganizationCard key={org.id} org={org}/>)}</div> : <EmptyState copy="Virginia organizations will appear as the RCL Network directory grows."/>}
        </div>
        <aside className="rounded-2xl border border-rcl-orange/20 bg-[linear-gradient(145deg,rgba(255,79,22,.08),rgba(7,21,34,.72))] p-6">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">Flagship property</p>
          <h2 className="mt-3 font-display text-4xl font-black uppercase">{flagship?.name ?? 'Rich City League'}</h2>
          <p className="mt-3 text-sm leading-6 text-white/50">RCL&apos;s own league receives the deepest native competition experience—official games, stats, standings, rankings, fantasy, media, and league history—because it is an RCL-owned property.</p>
          <div className="mt-5 space-y-2 text-sm text-white/60">
            <p className="flex items-center gap-2"><FaCircleCheck className="text-rcl-orange"/> Premier RCL competition</p>
            <p className="flex items-center gap-2"><FaCircleCheck className="text-rcl-orange"/> Full native game data</p>
            <p className="flex items-center gap-2"><FaCircleCheck className="text-rcl-orange"/> Signature RCL media</p>
          </div>
          <Link href="/league" className="mt-7 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-rcl-orange">Enter Rich City League <FaArrowRight/></Link>
        </aside>
      </section>

      <section className="mt-14">
        <SectionHeading eyebrow="What&apos;s happening" title="Upcoming across the network" detail="Events remain owned and operated by the organizations behind them. RCL helps people find them." />
        {events.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{events.map((event)=><EventCard key={event.id} event={event} organization={orgMap.get(event.organization_id)}/>)}</div> : <EmptyState copy="Upcoming partner events will appear here as organizations join the Network."/>}
      </section>

      <section className="mt-14 overflow-hidden rounded-3xl border border-rcl-blue/20 bg-[linear-gradient(120deg,#071522,#08111b_55%,rgba(21,159,255,.08))] p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">For Virginia organizations</p>
            <h2 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Keep running your organization.<br/><span className="text-rcl-blue">We help Virginia find it.</span></h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">No registration migration. No roster takeover. No payment platform requirement. RCL Network focuses on discovery, audience, media, promotion, and measurable exposure.</p>
          </div>
          <Link href="/network/partners" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wide text-black">See exposure options <FaArrowRight/></Link>
        </div>
      </section>
    </Container>
  </main>;
}

function SponsoredCard({promotion}:{promotion:Promotion}) {
  const org=promotion.organization;
  if(!org) return null;
  const content=<><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-rcl-orange/35 bg-rcl-orange/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.15em] text-rcl-orange">{promotion.disclosure_label}</span><span className="text-[9px] font-black uppercase tracking-[.15em] text-white/25">Network Home</span></div><h3 className="mt-4 font-display text-3xl font-black uppercase">{promotion.headline||org.name}</h3><p className="mt-2 text-xs font-black uppercase tracking-wide text-rcl-blue">{org.name}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Learn more <FaArrowRight/></span></>;
  return <NetworkImpression organizationId={promotion.organization_id} eventId={promotion.event_id} promotionId={promotion.id} campaignId={promotion.campaign_id} surface="network-home-sponsored"><article className="rounded-2xl border border-rcl-orange/25 bg-[linear-gradient(145deg,rgba(255,79,22,.075),rgba(7,21,34,.7))] p-5">{promotion.destination_url?<TrackedNetworkLink href={promotion.destination_url} organizationId={promotion.organization_id} eventId={promotion.event_id} promotionId={promotion.id} campaignId={promotion.campaign_id} surface="network-home-sponsored-cta" className="block">{content}</TrackedNetworkLink>:<Link href={`/organizations/${org.slug}`} className="block">{content}</Link>}</article></NetworkImpression>;
}
function ValueStat({icon,label,detail}:{icon:React.ReactNode;label:string;detail:string}) { return <div className="rounded-2xl border border-rcl-blue/15 bg-black/20 p-4"><span className="text-xl text-rcl-blue">{icon}</span><b className="mt-3 block font-display text-xl uppercase">{label}</b><p className="mt-1 text-xs leading-5 text-white/40">{detail}</p></div>; }
function OrganizationCard({org}:{org:Organization}) { return <NetworkImpression organizationId={org.id} surface="network-home-organization-card"><Link href={`/organizations/${org.slug}`} className="group block rounded-2xl border border-rcl-blue/15 bg-[#071522]/60 p-5 transition hover:-translate-y-0.5 hover:border-rcl-blue/45"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-rcl-blue/20 bg-rcl-blue/10 font-display text-lg font-black text-rcl-blue">{(org.short_name||org.name).slice(0,3).toUpperCase()}</span><div className="flex flex-wrap justify-end gap-1.5">{org.network_tier==='flagship'&&<Badge copy="RCL Flagship" accent="orange"/>}{org.is_verified&&<Badge copy="Verified"/>}</div></div><h3 className="mt-4 font-display text-2xl font-black uppercase">{org.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-wide text-rcl-blue/60">{prettyType(org.organization_type)} · {prettyRegion(org.region)}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-white/40">{org.description||'Official organization in the RCL Virginia basketball network.'}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">View organization <FaArrowRight className="transition group-hover:translate-x-1"/></span></Link></NetworkImpression>; }
function EventCard({event,organization}:{event:NetworkEvent;organization?:Organization}) { return <NetworkImpression organizationId={event.organization_id} eventId={event.id} surface="network-home-event-card"><article className="rounded-2xl border border-white/10 bg-[#071522]/55 p-5"><div className="flex items-center justify-between gap-3"><Badge copy={prettyType(event.event_type)}/>{event.is_featured&&<Badge copy="Featured" accent="orange"/>}</div><h3 className="mt-4 font-display text-2xl font-black uppercase leading-6">{event.title}</h3><p className="mt-2 text-xs font-bold text-rcl-blue">{organization?.name ?? 'RCL Network Organization'}</p><div className="mt-4 space-y-2 text-xs text-white/40"><p>{formatDate(event.starts_at)}</p>{(event.venue_name||event.city)&&<p className="flex items-center gap-2"><FaLocationDot/>{[event.venue_name,event.city,event.state].filter(Boolean).join(' · ')}</p>}</div><Link href={`/network/events/${event.slug}`} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-white/65">Event details <FaArrowRight/></Link></article></NetworkImpression>; }
function SectionHeading({eyebrow,title,detail,actionHref,actionLabel}:{eyebrow:string;title:string;detail:string;actionHref?:string;actionLabel?:string}) { return <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">{eyebrow}</p><h2 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">{detail}</p></div>{actionHref&&<Link href={actionHref} className="inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">{actionLabel}<FaArrowRight/></Link>}</div>; }
function Badge({copy,accent='blue'}:{copy:string;accent?:'blue'|'orange'}) { return <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${accent==='orange'?'border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/30 bg-rcl-blue/10 text-rcl-blue'}`}>{copy}</span>; }
function EmptyState({copy}:{copy:string}) { return <div className="rounded-2xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-7 text-sm text-white/40">{copy}</div>; }
function prettyType(value:string) { return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
function prettyRegion(value:string) { return prettyType(value); }
function formatDate(value:string) { return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value)); }
