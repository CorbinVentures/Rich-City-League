import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { NetworkExposureTracker, TrackedNetworkLink } from '@/components/network/NetworkExposure';
import { getPublicClient } from '@/lib/public-data';
import { FaArrowLeft, FaArrowRight, FaCalendarDays, FaLocationDot } from 'react-icons/fa6';

export const revalidate = 60;

export async function generateMetadata({ params }:{ params:Promise<{slug:string}> }) {
  const { slug } = await params;
  const client = getPublicClient();
  const supabase:any = client;
  if (!supabase) return { title:'RCL Network Event' };
  const { data } = await supabase.from('network_events').select('title,description').eq('slug',slug).eq('status','published').maybeSingle();
  return data ? { title:`${data.title} | RCL Network`, description:data.description || 'Virginia basketball event on RCL Network.' } : { title:'RCL Network Event' };
}

export default async function NetworkEventPage({ params }:{ params:Promise<{slug:string}> }) {
  const { slug } = await params;
  const client = getPublicClient();
  const supabase:any = client;
  if (!supabase) notFound();
  const { data:eventData } = await supabase.from('network_events').select('id,organization_id,slug,title,description,event_type,venue_name,city,state,starts_at,ends_at,external_url,image_url,is_featured').eq('slug',slug).eq('status','published').maybeSingle();
  if (!eventData) notFound();
  const event = eventData as any;
  const { data:orgData } = await supabase.from('network_organizations').select('id,slug,name,short_name,is_verified,network_tier').eq('id',event.organization_id).eq('status','active').maybeSingle();
  if (!orgData) notFound();
  const org = orgData as any;
  const start = new Date(event.starts_at);

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <NetworkExposureTracker organizationId={org.id} eventId={event.id} eventType="event_view" surface="network-event-page"/>
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_78%_10%,rgba(255,79,22,.10),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="lg" className="py-12 sm:py-16">
        <Link href="/network" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/40"><FaArrowLeft/> Virginia Network</Link>
        <div className="mt-8 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.14em]"><span className="rounded-full border border-rcl-orange/25 bg-rcl-orange/[.06] px-3 py-1.5 text-rcl-orange">{event.event_type}</span>{event.is_featured&&<span className="rounded-full border border-rcl-blue/25 px-3 py-1.5 text-rcl-blue">Featured</span>}</div>
        <h1 className="mt-4 max-w-5xl font-display text-5xl font-black uppercase leading-[.95] tracking-[-.04em] sm:text-7xl">{event.title}</h1>
        <Link href={`/organizations/${org.slug}`} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-rcl-blue">{org.name}{org.is_verified&&<span aria-label="Verified">✓</span>} <FaArrowRight className="text-xs"/></Link>
      </Container>
    </section>
    <Container maxWidth="lg" className="py-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <article className="rounded-3xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">Event details</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info icon={<FaCalendarDays/>} label="Starts" value={start.toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}/>
            <Info icon={<FaLocationDot/>} label="Location" value={[event.venue_name,event.city,event.state].filter(Boolean).join(' · ') || 'Location TBA'}/>
          </div>
          {event.description&&<p className="mt-7 whitespace-pre-line text-sm leading-7 text-white/55">{event.description}</p>}
        </article>
        <aside className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/70 p-6">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Official destination</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">Continue with {org.short_name||org.name}</h2>
          <p className="mt-3 text-xs leading-5 text-white/40">RCL provides discovery and exposure. Registration, tickets, payments, eligibility, schedules, and event operations remain with the organization running this event.</p>
          {event.external_url ? <TrackedNetworkLink href={event.external_url} organizationId={org.id} eventId={event.id} surface="network-event-primary-cta" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wide text-black">Visit official event page <FaArrowRight/></TrackedNetworkLink> : <p className="mt-6 rounded-xl border border-dashed border-white/10 p-4 text-xs text-white/35">No external event link has been published yet.</p>}
        </aside>
      </section>
    </Container>
  </main>;
}

function Info({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><span className="text-rcl-blue">{icon}</span><span className="mt-2 block text-[9px] font-black uppercase tracking-[.14em] text-white/30">{label}</span><b className="mt-1 block text-sm leading-5 text-white/75">{value}</b></div>; }
