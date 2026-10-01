'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaBullhorn, FaChartLine, FaCircleCheck, FaPeopleGroup } from 'react-icons/fa6';

type Inquiry = {
  id:string; organization_name:string; contact_name:string; contact_email:string; website_url:string|null;
  region:string; plan_interest:string; goals:string|null; status:string; created_at:string;
};

type Exposure = {
  organization_id:string; impressions:number; organization_views:number; event_views:number;
  outbound_clicks:number; follower_growth:number; shares:number; media_views:number;
};

export default function NetworkAdminPage() {
  const {user,profile,loading:authLoading}=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const db=supabase as any;
  const [loading,setLoading]=useState(true);
  const [organizations,setOrganizations]=useState<any[]>([]);
  const [events,setEvents]=useState<any[]>([]);
  const [promotions,setPromotions]=useState<any[]>([]);
  const [inquiries,setInquiries]=useState<Inquiry[]>([]);
  const [exposure,setExposure]=useState<Exposure[]>([]);
  const [error,setError]=useState('');

  const authorized=Boolean(user&&profile?.role==='admin');

  async function load() {
    if(!db||!authorized) return;
    setLoading(true); setError('');
    try {
      const [orgResult,eventResult,promoResult,inquiryResult,exposureResult]=await Promise.all([
        db.from('network_organizations').select('id,name,slug,network_tier,is_verified,status').order('featured_rank',{ascending:true,nullsFirst:false}).order('name'),
        db.from('network_events').select('id,title,organization_id,starts_at,status,is_featured').order('starts_at',{ascending:true}).limit(100),
        db.from('network_promotions').select('id,organization_id,event_id,placement,status,starts_at,ends_at').order('starts_at',{ascending:false}).limit(100),
        db.from('network_partner_inquiries').select('id,organization_name,contact_name,contact_email,website_url,region,plan_interest,goals,status,created_at').order('created_at',{ascending:false}),
        db.from('network_exposure_daily').select('organization_id,impressions,organization_views,event_views,outbound_clicks,follower_growth,shares,media_views'),
      ]);
      const failed=[orgResult,eventResult,promoResult,inquiryResult,exposureResult].find((result)=>result.error);
      if(failed?.error) throw failed.error;
      setOrganizations(orgResult.data??[]); setEvents(eventResult.data??[]); setPromotions(promoResult.data??[]);
      setInquiries(inquiryResult.data??[]); setExposure(exposureResult.data??[]);
    } catch(loadError) {
      console.error('Unable to load RCL Network admin',loadError);
      setError(loadError instanceof Error?loadError.message:'Unable to load Network operations.');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ if(!authLoading&&authorized) void load(); else if(!authLoading) setLoading(false); },[authLoading,authorized]);

  async function updateInquiry(id:string,status:string) {
    if(!db||!authorized) return;
    const {error:updateError}=await db.from('network_partner_inquiries').update({status}).eq('id',id);
    if(updateError) { setError(updateError.message); return; }
    setInquiries((current)=>current.map((item)=>item.id===id?{...item,status}:item));
  }

  if(authLoading||loading) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="xl" className="py-16"><p className="text-sm text-white/45">Loading RCL Network operations…</p></Container></main>;
  if(!authorized) return <main className="min-h-screen bg-[#03070d] text-white"><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-black uppercase">Admin access required.</h1><Link href="/" className="mt-6 inline-flex text-rcl-blue">Return to RCL</Link></Container></main>;

  const totals=exposure.reduce((sum,row)=>({
    impressions:sum.impressions+(row.impressions||0), views:sum.views+(row.organization_views||0)+(row.event_views||0),
    clicks:sum.clicks+(row.outbound_clicks||0), shares:sum.shares+(row.shares||0), media:sum.media+(row.media_views||0),
  }),{impressions:0,views:0,clicks:0,shares:0,media:0});
  const activePromotions=promotions.filter((item)=>item.status==='active').length;
  const newLeads=inquiries.filter((item)=>item.status==='new').length;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <Container maxWidth="xl" className="py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Admin</Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">RCL Network Operations</p><h1 className="mt-2 font-display text-4xl font-black uppercase sm:text-5xl">Exposure command center</h1><p className="mt-2 text-sm text-white/45">Organizations, exposure inventory, partner leads, and measurable distribution.</p></div><Link href="/network/partners" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-blue/25 px-4 text-xs font-black uppercase text-rcl-blue">View partner product <FaBullhorn/></Link></div>

      {error&&<p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Organizations" value={organizations.length} icon={<FaPeopleGroup/>}/>
        <Stat label="Published events" value={events.filter((item)=>item.status==='published').length} icon={<FaCircleCheck/>}/>
        <Stat label="Active promotions" value={activePromotions} icon={<FaBullhorn/>}/>
        <Stat label="New partner leads" value={newLeads} icon={<FaChartLine/>}/>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Impressions" value={totals.impressions}/><Metric label="Page + event views" value={totals.views}/><Metric label="Outbound clicks" value={totals.clicks}/><Metric label="Shares" value={totals.shares}/><Metric label="Media views" value={totals.media}/>
      </section>

      <section className="mt-10">
        <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Pipeline</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Organization inquiries</h2></div>
        {inquiries.length ? <div className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55"><div className="divide-y divide-white/10">{inquiries.map((item)=><article key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_.8fr_.7fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-black uppercase">{item.organization_name}</h3><span className="rounded-full border border-rcl-blue/20 px-2 py-1 text-[9px] font-black uppercase text-rcl-blue">{pretty(item.plan_interest)}</span></div><p className="mt-1 text-xs text-white/40">{item.contact_name} · {item.contact_email}</p>{item.goals&&<p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{item.goals}</p>}</div><div className="text-xs text-white/40"><p>{pretty(item.region)}</p><p className="mt-1">{new Date(item.created_at).toLocaleDateString()}</p></div><div>{item.website_url&&<a href={item.website_url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase text-rcl-blue">Open website</a>}</div><select value={item.status} onChange={(event)=>void updateInquiry(item.id,event.target.value)} className="min-h-10 rounded-xl border border-white/10 bg-[#050b12] px-3 text-xs font-black uppercase text-white"><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="closed">Closed</option></select></article>)}</div></div> : <div className="rounded-2xl border border-dashed border-rcl-blue/20 p-7 text-sm text-white/40">No organization inquiries yet.</div>}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Network inventory</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Organizations</h2><div className="mt-4 divide-y divide-white/10">{organizations.map((org)=><div key={org.id} className="flex items-center justify-between gap-3 py-3"><span><b className="block text-sm">{org.name}</b><small className="text-white/35">{pretty(org.network_tier)} · {org.is_verified?'Verified':'Unverified'}</small></span><Link href={`/organizations/${org.slug}`} className="text-xs font-black uppercase text-rcl-blue">View</Link></div>)}</div></div>
        <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Upcoming inventory</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Events</h2><div className="mt-4 divide-y divide-white/10">{events.slice(0,12).map((event)=><div key={event.id} className="flex items-center justify-between gap-3 py-3"><span><b className="block text-sm">{event.title}</b><small className="text-white/35">{new Date(event.starts_at).toLocaleString()} · {event.is_featured?'Featured':'Standard'}</small></span><span className="text-[9px] font-black uppercase text-white/35">{event.status}</span></div>)}{!events.length&&<p className="py-4 text-sm text-white/35">No Network events yet.</p>}</div></div>
      </section>
    </Container>
  </main>;
}

function Stat({label,value,icon}:{label:string;value:number;icon:React.ReactNode}) { return <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5"><span className="text-rcl-blue">{icon}</span><strong className="mt-3 block font-display text-4xl font-black">{value.toLocaleString()}</strong><span className="text-[10px] font-black uppercase tracking-wide text-white/35">{label}</span></div>; }
function Metric({label,value}:{label:string;value:number}) { return <div className="rounded-xl border border-white/10 bg-white/[.02] p-4"><b className="block text-xl">{value.toLocaleString()}</b><span className="text-[9px] font-black uppercase tracking-wide text-white/30">{label}</span></div>; }
function pretty(value:string) { return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
