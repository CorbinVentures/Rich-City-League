'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { NETWORK_EVENT_TYPES } from '@/lib/network-taxonomy';
import { FaArrowRight, FaBullhorn, FaCalendarPlus, FaChartLine, FaCircleCheck, FaClock, FaPeopleGroup, FaShieldHalved } from 'react-icons/fa6';

type Organization = { id:string; name:string; slug:string; network_tier:string; is_verified:boolean };
type Membership = { organization_id:string; member_role:string; organization:Organization };
type Exposure = { organization_id:string; impressions:number; organization_views:number; event_views:number; outbound_clicks:number; shares:number; media_views:number };
type Submission = { id:string; organization_id:string; title:string; event_type:string; starts_at:string; status:string; created_at:string };
type Campaign = { id:string; organization_id:string; name:string; package:string; requested_placement:string; status:string; requested_starts_at:string; requested_ends_at:string };

const inputClass = 'w-full min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-rcl-blue/55';

export default function NetworkDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [exposure, setExposure] = useState<Exposure[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string|null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: membershipRows } = await db.from('network_organization_members')
      .select('organization_id,member_role,organization:network_organizations!organization_id(id,name,slug,network_tier,is_verified)')
      .eq('status','active');
    const normalized = (membershipRows ?? []).map((row:any)=>({ ...row, organization:Array.isArray(row.organization)?row.organization[0]:row.organization })).filter((row:any)=>row.organization) as Membership[];
    setMemberships(normalized);
    const ids = normalized.map(row=>row.organization_id);
    if (ids.length) {
      const [{data: exposureRows},{data: submissionRows},{data: campaignRows}] = await Promise.all([
        db.from('network_exposure_daily').select('organization_id,impressions,organization_views,event_views,outbound_clicks,shares,media_views').in('organization_id',ids),
        db.from('network_event_submissions').select('id,organization_id,title,event_type,starts_at,status,created_at').in('organization_id',ids).order('created_at',{ascending:false}).limit(30),
        db.from('network_campaigns').select('id,organization_id,name,package,requested_placement,status,requested_starts_at,requested_ends_at').in('organization_id',ids).order('created_at',{ascending:false}).limit(30),
      ]);
      setExposure(exposureRows ?? []); setSubmissions(submissionRows ?? []); setCampaigns(campaignRows ?? []);
    } else { setExposure([]); setSubmissions([]); setCampaigns([]); }
    setLoading(false);
  }, [db, user]);

  useEffect(()=>{ if (!authLoading) { if (user) void load(); else setLoading(false); } },[authLoading,user,load]);

  if (authLoading || loading) return <main className="min-h-screen bg-[#03070d] py-16 text-white"><Container maxWidth="xl"><p className="text-sm text-white/45">Loading RCL Network dashboard…</p></Container></main>;
  if (!user) return <main className="min-h-screen bg-[#03070d] py-16 text-white"><Container maxWidth="md"><div className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/70 p-7"><FaShieldHalved className="text-2xl text-rcl-blue"/><h1 className="mt-3 font-display text-4xl font-black uppercase">Partner access requires sign-in</h1><p className="mt-3 text-sm leading-6 text-white/50">Organization management, submissions, campaigns, and analytics are tied to your RCL account.</p><Link href="/auth/sign-in?next=/network/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wide text-[#03101a]">Sign in <FaArrowRight/></Link></div></Container></main>;

  if (!memberships.length) return <main className="min-h-screen bg-[#03070d] py-16 text-white"><Container maxWidth="lg"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Network · Operator console</p><h1 className="mt-3 font-display text-5xl font-black uppercase">Claim your organization first.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">Once RCL verifies your connection to an organization, this dashboard unlocks event submission, exposure campaigns, and analytics.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/organizations" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Find your organization <FaArrowRight/></Link><Link href="/network/partners/apply" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-5 text-xs font-black uppercase text-rcl-blue">Organization not listed?</Link></div></Container></main>;

  const totals = exposure.reduce((acc,row)=>({
    impressions:acc.impressions+(row.impressions||0), views:acc.views+(row.organization_views||0)+(row.event_views||0), clicks:acc.clicks+(row.outbound_clicks||0), shares:acc.shares+(row.shares||0), media:acc.media+(row.media_views||0)
  }),{impressions:0,views:0,clicks:0,shares:0,media:0});
  const ctr = totals.impressions ? ((totals.clicks/totals.impressions)*100).toFixed(1) : '0.0';

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_80%_10%,rgba(44,166,255,.12),transparent_26%),linear-gradient(145deg,#071522,#03070d)]"><Container maxWidth="xl" className="py-12 sm:py-16"><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Network · Operator console</p><h1 className="mt-3 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-7xl">Exposure you can <span className="text-rcl-blue">operate.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">Manage what RCL publishes about your organization, request distribution inventory, and see the audience RCL sends your way. Your registration, payments, schedules, teams, and standings remain in your own systems.</p></Container></section>

    <Container maxWidth="xl" className="py-8">
      {message && <div className="mb-6 rounded-xl border border-emerald-400/25 bg-emerald-400/[.05] p-3 text-xs text-emerald-200">{message}</div>}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Impressions" value={totals.impressions}/><Metric label="Views" value={totals.views}/><Metric label="Outbound clicks" value={totals.clicks}/><Metric label="CTR" value={`${ctr}%`}/><Metric label="Media views" value={totals.media}/></section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">{memberships.map(m=><article key={m.organization_id} className="rounded-2xl border border-rcl-blue/20 bg-[#071522]/65 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">{m.member_role} access</p><h2 className="mt-1 font-display text-3xl font-black uppercase">{m.organization.name}</h2></div>{m.organization.is_verified&&<FaCircleCheck className="text-rcl-blue"/>}</div><p className="mt-3 text-xs uppercase tracking-wide text-white/35">{m.organization.network_tier} · verified operator</p><Link href={`/organizations/${m.organization.slug}`} className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-orange">Public page <FaArrowRight/></Link></article>)}</section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <EventSubmissionForm organizations={memberships.map(m=>m.organization)} userId={user.id} db={db} onSuccess={()=>{setMessage('Event submitted for RCL review.');void load();}}/>
        <CampaignRequestForm organizations={memberships.map(m=>m.organization)} userId={user.id} db={db} onSuccess={()=>{setMessage('Exposure campaign requested. RCL will confirm inventory before activation.');void load();}}/>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <Panel eyebrow="Publishing queue" title="Event submissions" icon={<FaCalendarPlus/>}>{submissions.length?submissions.map(item=><QueueRow key={item.id} title={item.title} meta={`${item.event_type} · ${new Date(item.starts_at).toLocaleDateString()}`} status={item.status}/>):<Empty text="No event submissions yet."/>}</Panel>
        <Panel eyebrow="Distribution queue" title="Campaign requests" icon={<FaBullhorn/>}>{campaigns.length?campaigns.map(item=><QueueRow key={item.id} title={item.name} meta={`${item.package} · ${item.requested_placement}`} status={item.status}/>):<Empty text="No exposure campaigns requested yet."/>}</Panel>
      </section>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-start gap-3"><FaPeopleGroup className="mt-1 text-rcl-orange"/><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-orange">Operating boundary</p><h2 className="mt-1 font-display text-3xl font-black uppercase">RCL distributes. You operate.</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-white/45">This console intentionally does not contain registration, payments, rosters, scheduling, standings, or team administration for partner organizations. Public CTAs and campaign traffic point back to destinations you control.</p></div></div></section>
    </Container>
  </main>;
}

function Metric({label,value}:{label:string;value:string|number}) { return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-4"><FaChartLine className="text-rcl-blue"/><strong className="mt-2 block font-display text-3xl font-black">{typeof value==='number'?value.toLocaleString():value}</strong><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/35">{label}</span></div>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</span>{children}</label>; }
function Panel({eyebrow,title,icon,children}:{eyebrow:string;title:string;icon:React.ReactNode;children:React.ReactNode}) { return <section className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><span className="text-rcl-blue">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">{eyebrow}</p><h2 className="font-display text-3xl font-black uppercase">{title}</h2></div></div><div className="mt-5 space-y-2">{children}</div></section>; }
function QueueRow({title,meta,status}:{title:string;meta:string;status:string}) { const active=status==='approved'||status==='active'; return <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-4"><div><b className="block text-sm text-white/80">{title}</b><span className="mt-1 block text-[11px] uppercase tracking-wide text-white/30">{meta}</span></div><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${active?'border-emerald-400/25 text-emerald-300':status==='rejected'?'border-red-400/25 text-red-300':'border-amber-400/25 text-amber-200'}`}>{status}</span></div>; }
function Empty({text}:{text:string}) { return <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/30">{text}</p>; }

function EventSubmissionForm({organizations,userId,db,onSuccess}:{organizations:Organization[];userId:string;db:any;onSuccess:()=>void}) {
  const [form,setForm]=useState({organizationId:organizations[0]?.id??'',title:'',eventType:'tournament',venue:'',city:'',startsAt:'',endsAt:'',externalUrl:'',description:''});
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setError(null);if(!form.organizationId||!form.title||!form.startsAt)return setError('Organization, title, and start time are required.');setBusy(true);const {error:err}=await db.from('network_event_submissions').insert({organization_id:form.organizationId,submitted_by:userId,title:form.title.trim(),event_type:form.eventType,venue_name:form.venue.trim()||null,city:form.city.trim()||null,starts_at:new Date(form.startsAt).toISOString(),ends_at:form.endsAt?new Date(form.endsAt).toISOString():null,external_url:form.externalUrl.trim()||null,description:form.description.trim()||null,status:'pending'});setBusy(false);if(err)return setError(err.message);setForm({...form,title:'',venue:'',city:'',startsAt:'',endsAt:'',externalUrl:'',description:''});onSuccess();};
  return <form onSubmit={submit} className="rounded-3xl border border-rcl-blue/20 bg-[#071522]/65 p-6"><div className="flex items-center gap-3"><FaCalendarPlus className="text-rcl-blue"/><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-blue">Self-service publishing</p><h2 className="font-display text-3xl font-black uppercase">Submit an event</h2></div></div><p className="mt-3 text-xs leading-5 text-white/35">RCL reviews submissions before they become public Network listings.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Organization"><select className={inputClass} value={form.organizationId} onChange={e=>setForm({...form,organizationId:e.target.value})}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="Event type"><select className={inputClass} value={form.eventType} onChange={e=>setForm({...form,eventType:e.target.value})}>{NETWORK_EVENT_TYPES.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><div className="sm:col-span-2"><Field label="Event title"><input className={inputClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} maxLength={180}/></Field></div><Field label="Starts"><input className={inputClass} type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></Field><Field label="Ends (optional)"><input className={inputClass} type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></Field><Field label="Venue"><input className={inputClass} value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></Field><Field label="City"><input className={inputClass} value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field><div className="sm:col-span-2"><Field label="Your event/registration URL"><input className={inputClass} type="url" value={form.externalUrl} onChange={e=>setForm({...form,externalUrl:e.target.value})} placeholder="https://…"/></Field></div><div className="sm:col-span-2"><Field label="Description"><textarea className={`${inputClass} min-h-24 resize-y`} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={3000}/></Field></div></div>{error&&<p className="mt-3 text-xs text-red-300">{error}</p>}<button disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase text-[#03101a] disabled:opacity-50">{busy?'Submitting…':'Send for review'} <FaArrowRight/></button></form>;
}

function CampaignRequestForm({organizations,userId,db,onSuccess}:{organizations:Organization[];userId:string;db:any;onSuccess:()=>void}) {
  const now=new Date(); const later=new Date(now.getTime()+7*86400000); const local=(d:Date)=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const [form,setForm]=useState({organizationId:organizations[0]?.id??'',name:'',package:'amplify',objective:'awareness',placement:'regional-feature',headline:'',destinationUrl:'',startsAt:local(now),endsAt:local(later)});
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setError(null);if(!form.organizationId||!form.name||!form.destinationUrl)return setError('Organization, campaign name, and destination URL are required.');if(new Date(form.endsAt)<=new Date(form.startsAt))return setError('Campaign end must be after its start.');setBusy(true);const {error:err}=await db.from('network_campaigns').insert({organization_id:form.organizationId,name:form.name.trim(),package:form.package,objective:form.objective,requested_placement:form.placement,headline:form.headline.trim()||null,destination_url:form.destinationUrl.trim(),requested_starts_at:new Date(form.startsAt).toISOString(),requested_ends_at:new Date(form.endsAt).toISOString(),created_by:userId,status:'pending'});setBusy(false);if(err)return setError(err.message);setForm({...form,name:'',headline:'',destinationUrl:''});onSuccess();};
  return <form onSubmit={submit} className="rounded-3xl border border-rcl-orange/20 bg-rcl-orange/[.035] p-6"><div className="flex items-center gap-3"><FaBullhorn className="text-rcl-orange"/><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-orange">Paid distribution inventory</p><h2 className="font-display text-3xl font-black uppercase">Request a campaign</h2></div></div><p className="mt-3 text-xs leading-5 text-white/35">Requests reserve no inventory until RCL approves the placement. Sponsored placements are labeled and campaign traffic remains measurable.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Organization"><select className={inputClass} value={form.organizationId} onChange={e=>setForm({...form,organizationId:e.target.value})}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="Package"><select className={inputClass} value={form.package} onChange={e=>setForm({...form,package:e.target.value})}><option value="amplify">Amplify · $49/mo</option><option value="premier">Premier · $149/mo</option><option value="custom">Custom</option></select></Field><div className="sm:col-span-2"><Field label="Campaign name"><input className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} maxLength={180}/></Field></div><Field label="Objective"><select className={inputClass} value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})}>{['awareness','event-traffic','website-traffic','media-views','audience-growth'].map(v=><option key={v} value={v}>{v}</option>)}</select></Field><Field label="Placement"><select className={inputClass} value={form.placement} onChange={e=>setForm({...form,placement:e.target.value})}>{['network-home','regional-feature','event-spotlight','social-feed','digest','media-feature'].map(v=><option key={v} value={v}>{v}</option>)}</select></Field><Field label="Starts"><input className={inputClass} type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></Field><Field label="Ends"><input className={inputClass} type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></Field><div className="sm:col-span-2"><Field label="Destination URL"><input className={inputClass} type="url" value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})} placeholder="https://…"/></Field></div><div className="sm:col-span-2"><Field label="Sponsored headline"><input className={inputClass} value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} maxLength={180}/></Field></div></div>{error&&<p className="mt-3 text-xs text-red-300">{error}</p>}<button disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black disabled:opacity-50">{busy?'Requesting…':'Request inventory'} <FaArrowRight/></button><p className="mt-4 flex gap-2 text-[11px] leading-5 text-white/30"><FaClock className="mt-1 shrink-0"/>Approval confirms placement availability; commercial terms can be completed separately before or alongside activation.</p></form>;
}
