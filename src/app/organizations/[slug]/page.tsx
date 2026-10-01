import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowLeft, FaArrowRight, FaBasketball, FaCircleCheck, FaGlobe, FaLocationDot } from 'react-icons/fa6';

export const revalidate = 60;

type Organization = {
  id:string; slug:string; name:string; short_name:string|null; description:string|null;
  organization_type:string; region:string; city:string|null; state:string; website_url:string|null;
  instagram_url:string|null; facebook_url:string|null; x_url:string|null; youtube_url:string|null;
  logo_url:string|null; cover_url:string|null; is_verified:boolean; verification_label:string|null;
  network_tier:string; is_featured:boolean;
};

type NetworkEvent = {
  id:string; slug:string; title:string; description:string|null; event_type:string; venue_name:string|null;
  city:string|null; state:string; starts_at:string; ends_at:string|null; external_url:string|null; is_featured:boolean;
};

export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const client=getPublicClient(); const db:any=client;
  const {data}=db ? await db.from('network_organizations').select('name,description').eq('slug',slug).eq('status','active').maybeSingle() : {data:null};
  return {title:data?.name ? `${data.name} | RCL Network` : 'Organization | RCL Network',description:data?.description || 'Virginia basketball organization in the RCL Network.'};
}

export default async function OrganizationPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const client=getPublicClient(); const db:any=client;
  if(!db) notFound();
  const {data:organizationRaw}=await db.from('network_organizations').select('id,slug,name,short_name,description,organization_type,region,city,state,website_url,instagram_url,facebook_url,x_url,youtube_url,logo_url,cover_url,is_verified,verification_label,network_tier,is_featured').eq('slug',slug).eq('status','active').maybeSingle();
  if(!organizationRaw) notFound();
  const organization=organizationRaw as Organization;
  const {data:eventsRaw}=await db.from('network_events').select('id,slug,title,description,event_type,venue_name,city,state,starts_at,ends_at,external_url,is_featured').eq('organization_id',organization.id).eq('status','published').gte('starts_at',new Date().toISOString()).order('starts_at',{ascending:true}).limit(12);
  const events=(eventsRaw??[]) as NetworkEvent[];
  const flagship=organization.network_tier==='flagship';
  const socialLinks=[['Instagram',organization.instagram_url],['Facebook',organization.facebook_url],['X',organization.x_url],['YouTube',organization.youtube_url]].filter((entry):entry is [string,string]=>Boolean(entry[1]));

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className={`border-b ${flagship?'border-rcl-orange/20':'border-rcl-blue/15'} bg-[radial-gradient(circle_at_80%_15%,rgba(21,159,255,.12),transparent_30%),linear-gradient(145deg,#071522,#03070d)]`}>
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <Link href="/organizations" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45"><FaArrowLeft/> Organizations</Link>
        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2"><span className={`grid h-16 w-16 place-items-center rounded-2xl border font-display text-2xl font-black ${flagship?'border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/25 bg-rcl-blue/10 text-rcl-blue'}`}>{(organization.short_name||organization.name).slice(0,3).toUpperCase()}</span><div>{flagship&&<Pill copy="RCL Flagship" orange/>}{organization.network_tier==='premier'&&<Pill copy="Premier Partner" orange/>}{organization.is_verified&&<Pill copy={organization.verification_label||'Verified Organization'}/>}</div></div>
            <h1 className="mt-5 font-display text-5xl font-black uppercase leading-[.95] tracking-[-.04em] sm:text-6xl">{organization.name}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-black uppercase tracking-wide text-white/40"><span className="flex items-center gap-2"><FaBasketball/>{pretty(organization.organization_type)}</span><span className="flex items-center gap-2"><FaLocationDot/>{organization.city ? `${organization.city}, ${organization.state}` : pretty(organization.region)}</span></div>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">{organization.description||'Official Virginia basketball organization represented in the RCL Network.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">{organization.website_url&&<a href={organization.website_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase text-[#03101a]"><FaGlobe/> Official website</a>}{socialLinks.map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-xs font-black uppercase text-white/55">{label}</a>)}</div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">On the calendar</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Upcoming events</h2><p className="mt-2 text-sm text-white/40">Discover what this organization has coming up. Registration and event operations remain with the organization.</p></div>
          {events.length ? <div className="grid gap-4 md:grid-cols-2">{events.map((event)=><EventCard key={event.id} event={event}/>)}</div> : <div className="rounded-2xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-7 text-sm text-white/40">No upcoming events are currently published to RCL Network.</div>}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/65 p-5">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">RCL Network role</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase">Exposure, not control.</h2>
            <p className="mt-3 text-sm leading-6 text-white/45">RCL Network helps people discover this organization and its public basketball activity. Registration, payments, schedules, rosters, and program operations stay with the organization.</p>
          </section>
          {flagship ? <section className="rounded-2xl border border-rcl-orange/25 bg-rcl-orange/[.055] p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Why this page goes deeper</p><h3 className="mt-2 font-display text-2xl font-black uppercase">RCL-owned flagship.</h3><p className="mt-3 text-sm leading-6 text-white/45">Rich City League can carry official stats, standings, game data, fantasy, rankings, and native media because RCL owns and operates the competition.</p><Link href="/league" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">League Center <FaArrowRight/></Link></section> : <section className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/35">Represent an organization?</p><h3 className="mt-2 font-display text-2xl font-black uppercase">Want more reach?</h3><p className="mt-3 text-sm leading-6 text-white/45">RCL Amplify and Premier Partner packages add placement inventory, content amplification, and measurable exposure.</p><Link href="/network/partners" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">Exposure options <FaArrowRight/></Link></section>}
        </aside>
      </div>
    </Container>
  </main>;
}

function EventCard({event}:{event:NetworkEvent}) { return <article className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/60 p-5"><div className="flex flex-wrap items-center gap-2"><Pill copy={pretty(event.event_type)}/>{event.is_featured&&<Pill copy="Featured" orange/>}</div><h3 className="mt-4 font-display text-2xl font-black uppercase">{event.title}</h3>{event.description&&<p className="mt-2 line-clamp-3 text-sm leading-6 text-white/40">{event.description}</p>}<div className="mt-4 space-y-2 text-xs text-white/40"><p>{formatDate(event.starts_at)}</p>{(event.venue_name||event.city)&&<p className="flex items-center gap-2"><FaLocationDot/>{[event.venue_name,event.city,event.state].filter(Boolean).join(' · ')}</p>}</div>{event.external_url&&<a href={event.external_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">Event details <FaArrowRight/></a>}</article>; }
function Pill({copy,orange=false}:{copy:string;orange?:boolean}) { return <span className={`mr-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${orange?'border-rcl-orange/30 bg-rcl-orange/10 text-rcl-orange':'border-rcl-blue/30 bg-rcl-blue/10 text-rcl-blue'}`}>{!orange&&<FaCircleCheck/>}{copy}</span>; }
function pretty(value:string) { return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
function formatDate(value:string) { return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value)); }
