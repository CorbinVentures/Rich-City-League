'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowLeft, FaArrowTrendUp, FaBullhorn, FaChartColumn, FaClock, FaEye, FaFloppyDisk, FaGlobe, FaHeart, FaLink, FaShareNodes, FaUsers } from 'react-icons/fa6';

type Organization = { id:string; name:string; slug:string; network_tier:string; follower_count:number };
type Membership = { organization_id:string; member_role:string; organization:Organization };
type Daily = { organization_id:string; metric_date:string; impressions:number; organization_views:number; event_views:number; outbound_clicks:number; follower_growth:number; shares:number; media_views:number; saves:number };
type Breakdown = Daily & { id:string; surface:string; network_event_id:string|null; campaign_id:string|null; promotion_id:string|null };
type Campaign = { id:string; name:string; package:string; objective:string; requested_placement:string; requested_budget_cents:number|null; requested_starts_at:string; requested_ends_at:string; target_regions:string[]; status:string };
type EventRow = { id:string; title:string; slug:string };

type Totals = {
  impressions:number; organizationViews:number; eventViews:number; outboundClicks:number;
  followerGrowth:number; shares:number; mediaViews:number; saves:number; reach:number; engagements:number;
};

const emptyTotals:Totals = { impressions:0,organizationViews:0,eventViews:0,outboundClicks:0,followerGrowth:0,shares:0,mediaViews:0,saves:0,reach:0,engagements:0 };
const inputClass='w-full min-h-11 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-rcl-blue/55';

function totalsFrom(rows:Daily[]):Totals {
  const total=rows.reduce((acc,row)=>({
    impressions:acc.impressions+(row.impressions||0),
    organizationViews:acc.organizationViews+(row.organization_views||0),
    eventViews:acc.eventViews+(row.event_views||0),
    outboundClicks:acc.outboundClicks+(row.outbound_clicks||0),
    followerGrowth:acc.followerGrowth+(row.follower_growth||0),
    shares:acc.shares+(row.shares||0),
    mediaViews:acc.mediaViews+(row.media_views||0),
    saves:acc.saves+(row.saves||0),
    reach:0,
    engagements:0,
  }),{...emptyTotals});
  total.reach=total.impressions+total.organizationViews+total.eventViews+total.mediaViews;
  total.engagements=total.outboundClicks+total.shares+total.saves+total.followerGrowth;
  return total;
}

function startDate(days:number,offset=0) {
  const value=new Date();
  value.setUTCHours(0,0,0,0);
  value.setUTCDate(value.getUTCDate()-days-offset+1);
  return value.toISOString().slice(0,10);
}

export default function ReachDashboardPage() {
  const { user, loading: authLoading }=useAuth();
  const supabase=useMemo(()=>getSupabaseClient(),[]);
  const db=supabase as any;
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [selectedOrg,setSelectedOrg]=useState('');
  const [period,setPeriod]=useState<7|30|90>(30);
  const [daily,setDaily]=useState<Daily[]>([]);
  const [breakdown,setBreakdown]=useState<Breakdown[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [events,setEvents]=useState<EventRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState<string|null>(null);

  const loadMemberships=useCallback(async()=>{
    if(!user)return;
    const {data}=await db.from('network_organization_members')
      .select('organization_id,member_role,organization:network_organizations!organization_id(id,name,slug,network_tier,follower_count)')
      .eq('status','active');
    const rows=(data??[]).map((row:any)=>({...row,organization:Array.isArray(row.organization)?row.organization[0]:row.organization})).filter((row:any)=>row.organization) as Membership[];
    setMemberships(rows);
    setSelectedOrg((current)=>current||rows[0]?.organization_id||'');
  },[db,user]);

  const loadReach=useCallback(async()=>{
    if(!selectedOrg)return;
    setLoading(true);
    const earliest=startDate(period*2);
    const [{data:dailyRows},{data:breakdownRows},{data:campaignRows},{data:eventRows}]=await Promise.all([
      db.from('network_exposure_daily').select('organization_id,metric_date,impressions,organization_views,event_views,outbound_clicks,follower_growth,shares,media_views,saves').eq('organization_id',selectedOrg).gte('metric_date',earliest).order('metric_date',{ascending:true}),
      db.from('network_reach_daily_breakdown').select('id,organization_id,metric_date,surface,network_event_id,campaign_id,promotion_id,impressions,organization_views,event_views,outbound_clicks,follower_growth,shares,media_views,saves').eq('organization_id',selectedOrg).gte('metric_date',startDate(period)).order('metric_date',{ascending:true}),
      db.from('network_campaigns').select('id,name,package,objective,requested_placement,requested_budget_cents,requested_starts_at,requested_ends_at,target_regions,status').eq('organization_id',selectedOrg).order('created_at',{ascending:false}).limit(30),
      db.from('network_events').select('id,title,slug').eq('organization_id',selectedOrg).limit(100),
    ]);
    setDaily(dailyRows??[]); setBreakdown(breakdownRows??[]); setCampaigns(campaignRows??[]); setEvents(eventRows??[]);
    setLoading(false);
  },[db,period,selectedOrg]);

  useEffect(()=>{ if(!authLoading&&user)void loadMemberships(); if(!authLoading&&!user)setLoading(false); },[authLoading,user,loadMemberships]);
  useEffect(()=>{ if(selectedOrg)void loadReach(); },[selectedOrg,period,loadReach]);

  const currentRows=daily.filter(row=>row.metric_date>=startDate(period));
  const previousStart=startDate(period,period);
  const previousEnd=startDate(period+1);
  const previousRows=daily.filter(row=>row.metric_date>=previousStart&&row.metric_date<=previousEnd);
  const totals=totalsFrom(currentRows);
  const previous=totalsFrom(previousRows);
  const selected=memberships.find(row=>row.organization_id===selectedOrg)?.organization;
  const reachChange=previous.reach?((totals.reach-previous.reach)/previous.reach)*100:null;
  const ctr=totals.reach?totals.outboundClicks/totals.reach*100:0;
  const engagementRate=totals.reach?totals.engagements/totals.reach*100:0;

  const surfaceRows=Object.entries(breakdown.reduce((map,row)=>{
    const value=map[row.surface]??{reach:0,clicks:0,engagements:0};
    value.reach+=row.impressions+row.organization_views+row.event_views+row.media_views;
    value.clicks+=row.outbound_clicks;
    value.engagements+=row.outbound_clicks+row.shares+row.saves+row.follower_growth;
    map[row.surface]=value;
    return map;
  },{} as Record<string,{reach:number;clicks:number;engagements:number}>)).sort((a,b)=>b[1].reach-a[1].reach).slice(0,8);

  const eventMap=new Map(events.map(event=>[event.id,event]));
  const topEvents=Object.entries(breakdown.filter(row=>row.network_event_id).reduce((map,row)=>{
    const id=row.network_event_id!;
    const value=map[id]??{reach:0,clicks:0};
    value.reach+=row.impressions+row.event_views+row.media_views;
    value.clicks+=row.outbound_clicks;
    map[id]=value;
    return map;
  },{} as Record<string,{reach:number;clicks:number}>)).sort((a,b)=>b[1].reach-a[1].reach).slice(0,5);

  const campaignMetrics=campaigns.map(campaign=>{
    const rows=breakdown.filter(row=>row.campaign_id===campaign.id);
    return {campaign,totals:totalsFrom(rows)};
  });

  if(authLoading||(!memberships.length&&loading))return <main className="min-h-screen bg-[#03070d] py-16 text-white"><Container maxWidth="xl"><p className="text-sm text-white/45">Loading RCL Reach…</p></Container></main>;
  if(!user)return <main className="min-h-screen bg-[#03070d] py-16 text-white"><Container maxWidth="md"><h1 className="font-display text-4xl font-black uppercase">Sign in to RCL Reach</h1><Link href="/auth/sign-in?next=/network/dashboard/reach" className="mt-5 inline-flex rounded-xl bg-rcl-blue px-5 py-3 text-xs font-black uppercase text-black">Sign in</Link></Container></main>;
  if(!memberships.length)return <main className="min-h-screen bg-[#03070d] py-16 text-white"><Container maxWidth="lg"><h1 className="font-display text-5xl font-black uppercase">Claim an organization first.</h1><p className="mt-4 max-w-2xl text-sm text-white/45">RCL Reach is available to verified organization operators.</p><Link href="/organizations" className="mt-6 inline-flex rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Find your organization</Link></Container></main>;

  return <main className="min-h-screen bg-[#03070d] pb-24 text-white">
    <section className="border-b border-rcl-blue/15 bg-[radial-gradient(circle_at_82%_10%,rgba(44,166,255,.14),transparent_28%),linear-gradient(145deg,#071522,#03070d)]">
      <Container maxWidth="xl" className="py-10 sm:py-14">
        <Link href="/network/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase text-white/40"><FaArrowLeft/> Partner dashboard</Link>
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL Network Analytics</p><h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-.04em] sm:text-7xl">RCL <span className="text-rcl-blue">Reach.</span></h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">See where RCL is exposing your organization and what that attention produces. RCL Reach is transparent: impressions + organization views + event views + media views.</p></div>
          <div className="flex flex-wrap gap-2"><select className={inputClass} value={selectedOrg} onChange={e=>setSelectedOrg(e.target.value)}>{memberships.map(m=><option key={m.organization_id} value={m.organization_id}>{m.organization.name}</option>)}</select><div className="flex rounded-xl border border-white/10 bg-black/25 p-1">{([7,30,90] as const).map(value=><button key={value} onClick={()=>setPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-black ${period===value?'bg-rcl-blue text-black':'text-white/45'}`}>{value}D</button>)}</div></div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-8">
      {message&&<div className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-400/[.06] p-3 text-xs text-emerald-200">{message}</div>}
      {loading?<p className="text-sm text-white/35">Refreshing Reach analytics…</p>:<>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<FaGlobe/>} label="RCL Reach" value={totals.reach} detail={reachChange===null?'No prior-period baseline':`${reachChange>=0?'+':''}${reachChange.toFixed(1)}% vs prior ${period} days`} accent/>
          <Metric icon={<FaEye/>} label="Impressions" value={totals.impressions} detail={`${(totals.organizationViews+totals.eventViews).toLocaleString()} page views`}/>
          <Metric icon={<FaLink/>} label="Outbound clicks" value={totals.outboundClicks} detail={`${ctr.toFixed(1)}% click-through from Reach`}/>
          <Metric icon={<FaUsers/>} label="Followers" value={selected?.follower_count??0} detail={`+${totals.followerGrowth.toLocaleString()} in this period`}/>
        </section>

        <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SmallMetric icon={<FaFloppyDisk/>} label="Saves" value={totals.saves}/><SmallMetric icon={<FaShareNodes/>} label="Shares" value={totals.shares}/><SmallMetric icon={<FaHeart/>} label="Engagements" value={totals.engagements}/><SmallMetric icon={<FaArrowTrendUp/>} label="Engagement rate" value={`${engagementRate.toFixed(1)}%`}/>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <Panel eyebrow="Distribution" title="Where your Reach comes from" icon={<FaChartColumn/>}>
            {surfaceRows.length?<div className="space-y-3">{surfaceRows.map(([surface,value])=>{const max=Math.max(surfaceRows[0]?.[1].reach||1,1);return <div key={surface}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-white/70">{pretty(surface)}</span><span className="text-white/35">{value.reach.toLocaleString()} Reach · {value.clicks.toLocaleString()} clicks</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-rcl-blue" style={{width:`${Math.max(value.reach/max*100,3)}%`}}/></div></div>})}</div>:<Empty text="Reach by surface will appear as people discover and engage with this organization."/>}
          </Panel>
          <Panel eyebrow="Event discovery" title="Top events" icon={<FaEye/>}>
            {topEvents.length?topEvents.map(([id,value])=><div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/15 p-3"><div><b className="block text-sm text-white/75">{eventMap.get(id)?.title??'Network event'}</b><span className="text-[10px] uppercase text-white/30">{value.clicks.toLocaleString()} outbound clicks</span></div><strong className="font-display text-2xl text-rcl-blue">{value.reach.toLocaleString()}</strong></div>):<Empty text="Event-level Reach will appear after your published events receive exposure."/>}
          </Panel>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Panel eyebrow="Paid + partner distribution" title="Campaign performance" icon={<FaBullhorn/>}>
            {campaignMetrics.length?campaignMetrics.map(({campaign,totals:result})=><div key={campaign.id} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="block text-sm text-white/80">{campaign.name}</b><span className="mt-1 block text-[10px] font-black uppercase tracking-wide text-white/30">{campaign.package} · {campaign.requested_placement} · {campaign.status}</span></div><span className="rounded-full border border-rcl-orange/25 px-2.5 py-1 text-[9px] font-black uppercase text-rcl-orange">Sponsored when active</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Mini label="Reach" value={result.reach}/><Mini label="Clicks" value={result.outboundClicks}/><Mini label="CTR" value={`${result.reach?(result.outboundClicks/result.reach*100).toFixed(1):'0.0'}%`}/></div></div>):<Empty text="No Boost or partner campaigns yet. Use the form beside this panel to request your first one."/>}
          </Panel>
          <BoostRequest organization={selected} userId={user.id} db={db} onSuccess={()=>{setMessage('Boost request submitted. RCL will review inventory and confirm before activation or billing.');void loadReach();}}/>
        </section>

        <section className="mt-8 rounded-3xl border border-rcl-blue/15 bg-[#071522]/55 p-6"><p className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue">Measurement standard</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Visibility is measurable. Credibility is earned.</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-white/45">RCL Reach measures distribution and engagement only. Boosts can increase where content appears, but they never change REP, player ratings, rankings, official stats, awards, results, or competitive selection.</p></section>
      </>}
    </Container>
  </main>;
}

function BoostRequest({organization,userId,db,onSuccess}:{organization?:Organization;userId:string;db:any;onSuccess:()=>void}) {
  const tomorrow=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);},[]);
  const nextWeek=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+8);return d.toISOString().slice(0,10);},[]);
  const [form,setForm]=useState({name:'',objective:'awareness',placement:'regional-feature',destinationUrl:'',region:'central-virginia',budget:'2500',startsAt:tomorrow,endsAt:nextWeek,headline:''});
  const [busy,setBusy]=useState(false); const [error,setError]=useState<string|null>(null);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setError(null);if(!organization)return setError('Choose an organization.');if(!form.name.trim()||!form.destinationUrl.trim())return setError('Campaign name and destination URL are required.');setBusy(true);const {error:err}=await db.from('network_campaigns').insert({organization_id:organization.id,name:form.name.trim(),objective:form.objective,package:'boost',requested_placement:form.placement,destination_url:form.destinationUrl.trim(),headline:form.headline.trim()||null,requested_starts_at:new Date(`${form.startsAt}T12:00:00`).toISOString(),requested_ends_at:new Date(`${form.endsAt}T12:00:00`).toISOString(),requested_budget_cents:Number(form.budget)||null,target_regions:form.region==='statewide'?['statewide']:[form.region],status:'pending',created_by:userId});setBusy(false);if(err)return setError(err.message);setForm({...form,name:'',destinationUrl:'',headline:''});onSuccess();};
  return <form onSubmit={submit} className="rounded-3xl border border-rcl-orange/20 bg-[linear-gradient(145deg,rgba(59,130,246,.065),rgba(7,21,34,.7))] p-6"><div className="flex items-center gap-3"><FaBullhorn className="text-rcl-orange"/><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-rcl-orange">Boost Exposure</p><h2 className="font-display text-3xl font-black uppercase">Request a Boost</h2></div></div><p className="mt-3 text-xs leading-5 text-white/40">Choose a visibility goal and budget preference. This sends a request only—RCL confirms inventory and final pricing before activation or billing.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Campaign name"><input className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} maxLength={180}/></Field><Field label="Objective"><select className={inputClass} value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})}><option value="awareness">Awareness</option><option value="event-traffic">Event traffic</option><option value="website-traffic">Website traffic</option><option value="media-views">Media views</option><option value="audience-growth">Audience growth</option></select></Field><Field label="Placement"><select className={inputClass} value={form.placement} onChange={e=>setForm({...form,placement:e.target.value})}><option value="regional-feature">Regional feature</option><option value="event-spotlight">Event spotlight</option><option value="network-home">Network home</option><option value="social-feed">Social feed</option><option value="digest">RCL digest</option><option value="media-feature">Media feature</option></select></Field><Field label="Target"><select className={inputClass} value={form.region} onChange={e=>setForm({...form,region:e.target.value})}><option value="central-virginia">Central Virginia</option><option value="hampton-roads">Hampton Roads</option><option value="northern-virginia">Northern Virginia</option><option value="tri-cities">Tri-Cities</option><option value="southwest-virginia">Southwest Virginia</option><option value="statewide">Statewide Virginia</option></select></Field><Field label="Budget preference"><select className={inputClass} value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}><option value="2500">$25</option><option value="5000">$50</option><option value="10000">$100</option><option value="15000">$150</option></select></Field><Field label="Headline"><input className={inputClass} value={form.headline} onChange={e=>setForm({...form,headline:e.target.value})} maxLength={180}/></Field><div className="sm:col-span-2"><Field label="Destination URL"><input className={inputClass} type="url" value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})} placeholder="https://..."/></Field></div><Field label="Requested start"><input className={inputClass} type="date" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></Field><Field label="Requested end"><input className={inputClass} type="date" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></Field></div>{error&&<p className="mt-3 text-xs text-red-300">{error}</p>}<button disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black disabled:opacity-60"><FaBullhorn/>{busy?'Submitting…':'Request Boost'}</button></form>;
}

function Metric({icon,label,value,detail,accent=false}:{icon:React.ReactNode;label:string;value:number|string;detail:string;accent?:boolean}) { return <div className={`rounded-2xl border p-5 ${accent?'border-rcl-blue/35 bg-rcl-blue/[.08]':'border-white/10 bg-white/[.025]'}`}><span className={accent?'text-rcl-blue':'text-white/45'}>{icon}</span><strong className="mt-3 block font-display text-4xl font-black">{typeof value==='number'?value.toLocaleString():value}</strong><span className="text-[10px] font-black uppercase tracking-[.14em] text-white/40">{label}</span><p className="mt-2 text-[11px] text-white/30">{detail}</p></div>; }
function SmallMetric({icon,label,value}:{icon:React.ReactNode;label:string;value:number|string}) { return <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/15 p-4"><span className="text-rcl-blue">{icon}</span><div><strong className="block font-display text-2xl">{typeof value==='number'?value.toLocaleString():value}</strong><span className="text-[9px] font-black uppercase tracking-wide text-white/30">{label}</span></div></div>; }
function Panel({eyebrow,title,icon,children}:{eyebrow:string;title:string;icon:React.ReactNode;children:React.ReactNode}) { return <section className="rounded-3xl border border-white/10 bg-white/[.025] p-6"><div className="flex items-center gap-3"><span className="text-rcl-blue">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/35">{eyebrow}</p><h2 className="font-display text-3xl font-black uppercase">{title}</h2></div></div><div className="mt-5 space-y-3">{children}</div></section>; }
function Mini({label,value}:{label:string;value:string|number}) { return <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><strong className="block font-display text-xl">{typeof value==='number'?value.toLocaleString():value}</strong><span className="text-[8px] font-black uppercase tracking-wide text-white/30">{label}</span></div>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</span>{children}</label>; }
function Empty({text}:{text:string}) { return <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/30">{text}</p>; }
function pretty(value:string) { return value.replaceAll('-',' ').replace(/\b\w/g,(letter)=>letter.toUpperCase()); }
