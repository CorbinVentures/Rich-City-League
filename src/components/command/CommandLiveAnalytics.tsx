'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowTrendDown, FaArrowTrendUp, FaBasketball, FaChartLine,
  FaCircleExclamation, FaClock, FaPause, FaPlay, FaRotate,
  FaShieldHalved, FaSignal, FaUsers,
} from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';

type LiveSection = { section: string; sessions: number; members: number };
type TrafficPoint = { bucket: string; visits: number; sessions: number };
type Pulse = { key: string; label: string; current: number; previous: number; latest: string | null };
type LiveReport = {
  generated_at: string;
  collection_since: string | null;
  active_sessions: number;
  active_members: number;
  guest_sessions: number;
  seen_15_minutes: number;
  sections: LiveSection[];
  traffic: TrafficPoint[];
  pulse: Pulse[];
};
const fmt = new Intl.NumberFormat('en-US');
const sectionLabel: Record<string,string> = {
  home: 'Home',social: 'Social / Pulse',discover: 'Discover',runs: 'Runs',
  crews: 'Crews',commonwealth: 'Commonwealth Cup',league: 'Rich City League',
  players: 'Players',teams: 'Teams',media: 'RCH TV',news: 'News',
  communities: 'Communities',organizations: 'Organizations',shop: 'Shop',
  professional: 'Professional',other: 'Other',
};
const pulseDescription: Record<string,string> = {
  members: 'New non-system accounts',
  posts: 'Published member-created posts',
  reactions: 'Recorded post reactions',
  comments: 'Published post comments',
  run_signups: 'Recorded roster joins',
  messages: 'Recorded non-deleted messages',
};
const colors: Record<string,string> = {
  members: '#7dcaff',posts: '#a7d8ff',reactions: '#76c6ef',
  comments: '#aac7ff',run_signups: '#91d7da',messages: '#90aff4',
};
function Timestamp({date}: {date: string | null}) {
  if (!date) return <span>No recent events</span>;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return <span>Time unavailable</span>;
  return <time dateTime={date}>{parsed.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',second:'2-digit'})}</time>;
}
function LiveKpi({label,value,detail,accent}: {label:string;value:number;detail:string;accent?:boolean}) {
  return <article className={`rounded-2xl border p-4 sm:p-5 ${accent?'border-[#70bffa] bg-[#173e60]':'border-[#315474] bg-[#0c253c]'}`}>
    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.13em] text-[#b3d5ef]">{accent?<FaSignal aria-hidden="true"/>:<FaChartLine aria-hidden="true"/>}{label}</div>
    <div className="text-4xl font-black tabular-nums text-white sm:text-5xl">{fmt.format(value)}</div>
    <p className="mt-2 text-xs leading-5 text-[#c1d7e7]">{detail}</p>
  </article>;
}
function MinuteTraffic({points}: {points:TrafficPoint[]}) {
  const peak=Math.max(1,...points.map(p=>Number(p.visits)||0));
  const total=points.reduce((sum,p)=>sum+(Number(p.visits)||0),0);
  return <section className="rounded-2xl border border-[#315474] bg-[#0b233a] p-5" aria-label="Recorded site entries over the last hour">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-black text-white">Traffic heartbeat</h3><p className="mt-1 text-xs leading-5 text-[#accce5]">Recorded section entries, grouped into five-minute buckets. Not every page render is counted.</p></div>
      <div className="text-right"><strong className="block text-2xl font-black text-[#8acdfb]">{fmt.format(total)}</strong><span className="text-[11px] text-[#abcce5]">observed entries / 60 min</span></div>
    </div>
    <div className="mt-6 flex h-44 items-end gap-2 border-b border-[#426484] pb-1">
      {points.map((p,index)=>{
        const value=Number(p.visits)||0;
        const time=new Date(p.bucket);
        const timeLabel=Number.isNaN(time.getTime())?'Time unavailable':time.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
        return <div key={p.bucket} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${timeLabel}: ${value} recorded entries; ${p.sessions} sessions`}>
          <div className="w-full rounded-t-md bg-[#5eb5f4] transition-[height] duration-300 group-hover:bg-[#9cddff]"
            style={{height:`${value?Math.max(7,(value/peak)*100):2}%`,opacity:index===points.length-1?1:.78}}/>
          <span className="sr-only">{timeLabel}: {value} entries</span>
        </div>;
      })}
    </div>
    <div className="mt-3 flex justify-between text-[11px] font-bold text-[#b9d1e6]"><span>{points.length?<Timestamp date={points[0].bucket}/>: 'No tracking yet'}</span><span>5-minute intervals</span><span>{points.length?<Timestamp date={points[points.length-1].bucket}/>: '—'}</span></div>
    {total===0&&<p className="mt-4 text-xs text-[#cbdcec]">No recorded section visits in this hour. Live activity is only shown once visitors generate eligible tracking events.</p>}
  </section>;
}
function PulseTile({item}: {item:Pulse}) {
  const curr=Number(item.current)||0, prev=Number(item.previous)||0;
  const delta=curr-prev;
  return <article className="rounded-xl border border-[#315474] bg-[#0a2136] p-4">
    <div className="mb-3 flex items-center justify-between gap-2"><strong className="text-sm text-[#d9efff]">{item.label}</strong><span className="h-2.5 w-2.5 rounded-full" style={{background:colors[item.key]||'#7ec5ff'}}/></div>
    <div className="flex flex-wrap items-end justify-between gap-2"><strong className="text-3xl font-black tabular-nums text-white">{fmt.format(curr)}</strong>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${delta>0?'bg-[#143e48] text-[#a1f3dd]':delta<0?'bg-[#42292b] text-[#ffb9b9]':'bg-[#263d53] text-[#c6d9e8]'}`}>
        {delta>0?<FaArrowTrendUp aria-hidden="true"/>:delta<0?<FaArrowTrendDown aria-hidden="true"/>:null}
        {delta>0?'+':''}{fmt.format(delta)} vs prior 15m
      </span>
    </div>
    <p className="mt-2 text-xs leading-5 text-[#aac9dd]">{pulseDescription[item.key]??'Recorded platform activity'}</p>
    <p className="mt-3 flex items-center gap-2 border-t border-[#274866] pt-3 text-[11px] text-[#c6d9e9]"><FaClock aria-hidden="true"/> Latest: <Timestamp date={item.latest}/></p>
  </article>;
}

/** Refreshes only while the Command analytics live tab is mounted and visible. */
export function CommandLiveAnalytics() {
  const db=useMemo(()=>getSupabaseClient() as any,[]);
  const [report,setReport]=useState<LiveReport|null>(null);
  const [error,setError]=useState('');
  const [refreshing,setRefreshing]=useState(false);
  const [automatic,setAutomatic]=useState(true);
  const inFlight=useRef(false);
  const alive=useRef(true);
  const [now,setNow]=useState(()=>Date.now());

  const refresh=useCallback(async()=>{
    if (inFlight.current) return;
    if (!db) {setError('Analytics service is not configured.');return;}
    if (typeof navigator!=='undefined'&&!navigator.onLine) {setError('Browser is offline. Showing the latest available snapshot.');return;}
    inFlight.current=true;
    setRefreshing(true);
    try {
      const {data,error:failure}=await db.rpc('get_rch_live_analytics');
      if (failure) throw new Error(failure.message);
      if (!data||!Array.isArray(data.sections)||!Array.isArray(data.traffic)||!Array.isArray(data.pulse))
        throw new Error('The live analytics service did not return a complete snapshot.');
      if (alive.current){setReport(data as LiveReport);setError('');setNow(Date.now());}
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error?cause.message:'Live analytics are unavailable.');
    } finally {
      inFlight.current=false;
      if (alive.current) setRefreshing(false);
    }
  },[db]);

  useEffect(()=>{
    alive.current=true;
    void refresh();
    return()=>{alive.current=false;};
  },[refresh]);

  useEffect(()=>{
    if(!automatic) return;
    const update=()=>{if(document.visibilityState==='visible')void refresh();};
    const interval=window.setInterval(update,30_000);
    document.addEventListener('visibilitychange',update);
    window.addEventListener('online',update);
    return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',update);window.removeEventListener('online',update);};
  },[automatic,refresh]);

  useEffect(()=>{
    const tick=window.setInterval(()=>setNow(Date.now()),1000);
    return()=>window.clearInterval(tick);
  },[]);

  const age=report?Math.max(0,Math.floor((now-new Date(report.generated_at).getTime())/1000)):null;
  const fresh=age!==null&&Number.isFinite(age)&&age<=75&&!error;
  const sectionPeak=Math.max(1,...(report?.sections??[]).map(s=>Number(s.sessions)||0));
  const allPulse=report?.pulse??[];
  const totals=allPulse.reduce((sum,item)=>sum+(Number(item.current)||0),0);

  return <section className="space-y-5" aria-label="Live Command Center analytics">
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#39769f] bg-[linear-gradient(120deg,#143956,#091e34)] p-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[.12em] ${fresh?'border-[#4ba8c5] bg-[#143e51] text-[#a9f0fb]':'border-[#6a7885] bg-[#2b3d50] text-[#e2eaf0]'}`}>
            <span className={`h-2 w-2 rounded-full ${fresh?'bg-[#62f0c5]':'bg-[#a5b0bc]'}`}/>{fresh?'Live signal':'Last snapshot'}
          </span>
          <span className="text-xs font-bold text-[#bddbef]">{report?<>Updated <Timestamp date={report.generated_at}/>{age!==null&&Number.isFinite(age)?` · ${age}s ago`:''}</>:'Connecting to live intelligence'}</span>
        </div>
        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">RCH Live <span className="text-[#84caff]">Command</span></h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#c5dceb]">A rolling operational snapshot: recent browser-tab activity, where attention is moving, and real basketball-community actions as they happen.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={()=>setAutomatic(value=>!value)} aria-pressed={automatic} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#648aad] px-3 text-xs font-bold text-white">{automatic?<FaPause aria-hidden="true"/>:<FaPlay aria-hidden="true"/>}{automatic?'Pause auto':'Resume auto'}</button>
        <button type="button" onClick={()=>void refresh()} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#8fd2ff] px-4 text-xs font-black text-[#09223b] disabled:opacity-60"><FaRotate aria-hidden="true" className={refreshing?'animate-spin':''}/>Refresh</button>
      </div>
    </div>

    {error&&<div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-[#ad7462] bg-[#432c32] p-4 text-xs text-[#ffe1d9]"><FaCircleExclamation aria-hidden="true"/>{error} {report&&'Last verified data remains visible; it is not live.'}</div>}
    {!report?<div className="rounded-2xl border border-[#355777] bg-[#0c2035] p-7 text-sm text-[#d4e9f8]" role="status">{refreshing?'Connecting to verified platform signals…':'No live analytics snapshot available.'}</div>:<>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <LiveKpi accent label="Active observed tabs" value={report.active_sessions} detail="Visible and opted-in browser-tab heartbeats received in the last 2 minutes"/>
        <LiveKpi label="Members observed" value={report.active_members} detail="Distinct signed-in members among recent browser-tab heartbeats"/>
        <LiveKpi label="Guest browsing tabs" value={report.guest_sessions} detail="Anonymous tabs observed recently; not unique individuals"/>
        <LiveKpi label="Tabs seen in 15m" value={report.seen_15_minutes} detail="Most recent heartbeat in the last 15 minutes, not continuous online time"/>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <MinuteTraffic points={report.traffic}/>
        <section className="rounded-2xl border border-[#315474] bg-[#0b233a] p-5">
          <div className="flex items-center gap-2"><FaUsers aria-hidden="true" className="text-[#91d0fb]"/><h3 className="text-lg font-black text-white">Where the action is</h3></div>
          <p className="mt-1 text-xs leading-5 text-[#accce5]">Recent sections by observed browser tabs, last 2 minutes.</p>
          <div className="mt-5 space-y-4">
            {report.sections.length?report.sections.slice(0,7).map(s=><div key={s.section}>
              <div className="mb-2 flex justify-between gap-3 text-xs"><span className="font-bold text-white">{sectionLabel[s.section]??s.section}</span><span className="tabular-nums text-[#b8d8ed]">{fmt.format(s.sessions)} tabs</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-[#284a69]"><div className="h-full rounded-full bg-[#7bc9f8]" style={{width:`${Math.max(3,100*Number(s.sessions)/sectionPeak)}%`}}/></div>
            </div>):<p className="py-8 text-center text-sm text-[#b5ccdf]">No eligible active tabs observed in the last two minutes.</p>}
          </div>
        </section>
      </div>
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-[#8bccff]">Platform activity</p><h3 className="mt-1 text-xl font-black text-white">The last 15 minutes</h3><p className="mt-1 text-xs text-[#bed6e9]">Current 15-minute window vs. the preceding 15 minutes. These are database events, not estimates.</p></div>
          <div className="rounded-xl border border-[#355777] px-4 py-2 text-xs text-[#c3d8e9]"><strong className="text-lg font-black text-white">{fmt.format(totals)}</strong> listed actions</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{allPulse.map(item=><PulseTile key={item.key} item={item}/>)}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <aside className="rounded-xl border border-[#41678a] bg-[#0d2943] p-4 text-xs leading-6 text-[#c7dfef]"><div className="mb-1 flex items-center gap-2 font-black text-white"><FaBasketball/> Basketball pulse</div>Run joins are actual roster writes, not attendance. Social activity counts only recorded platform events. This view does not infer sponsorship income or game revenue from engagement.</aside>
        <aside className="rounded-xl border border-[#41678a] bg-[#0d2943] p-4 text-xs leading-6 text-[#c7dfef]"><div className="mb-1 flex items-center gap-2 font-black text-white"><FaShieldHalved/> Data integrity</div>Refreshes every 30 seconds while this view is open and visible. Collection began with deployment; tracking opt-outs and hidden tabs are excluded. Counts reflect browser tabs, not unique visitors. No raw URLs, personal locations, device fingerprints or visitor roster are shown.</aside>
      </div>
    </>}
  </section>;
}
