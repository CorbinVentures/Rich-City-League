'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCircleCheck,FaClock,FaCrown,FaEye,FaLocationDot,FaTrophy} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';
import {buildDailyCircuitPicks,getDailyPlaybook,scoreDailyRun,virginiaCircuitDay,type DailyCircuitCandidate,type RunFormat,type RunPlayType} from '@/lib/run-daily-circuit';

type Prefs={preferred_format:RunFormat;preferred_type:RunPlayType;watched_courts:string[]};
type Rating={game_format:string;rating:number;games:number;wins:number};
type Title={court_slug:string;division:string;defenses:number};
const defaults:Prefs={preferred_format:'all',preferred_type:'all',watched_courts:[]};
const formats:RunFormat[]=['all','1v1','2v2','3v3','4v4','5v5'];
const types:RunPlayType[]=['all','competitive','social','training'];
const formatLabel=(format:RunFormat)=>format==='all'?'Any format':format;
const typeLabel=(type:RunPlayType)=>type==='all'?'Any run':type==='competitive'?'Competitive':type==='social'?'Social hoops':'Training';

export function RunDailyCircuit({runs,cityId,radiusMiles,onPreferencesChange,now=Date.now()}:{
 runs:readonly DailyCircuitCandidate[];
 cityId:string|null;
 radiusMiles:25|50|100;
 onPreferencesChange?:(prefs:Prefs)=>void;
 now?:number;
}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [prefs,setPrefs]=useState<Prefs>(defaults);
 const [playedCourts,setPlayedCourts]=useState<string[]>([]);
 const [ratings,setRatings]=useState<Rating[]>([]);
 const [titles,setTitles]=useState<Title[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [clock,setClock]=useState(now);

 useEffect(()=>{
  // Date rollover changes the daily exploration pool; no need for a server cron.
  const t=setInterval(()=>setClock(Date.now()),300000);
  return()=>clearInterval(t);
 },[]);
 const load=useCallback(async()=>{
  if(!db||!user?.id){setPrefs(defaults);setRatings([]);setPlayedCourts([]);setTitles([]);return;}
  const [settings,games,played]=await Promise.all([
   db.from('rch_run_daily_preferences').select('preferred_format,preferred_type,watched_courts').eq('profile_id',user.id).maybeSingle(),
   db.from('run_competitive_ratings').select('game_format,rating,games,wins').eq('profile_id',user.id).limit(10),
   db.from('run_checkins').select('run_id').eq('profile_id',user.id).order('checked_in_at',{ascending:false}).limit(120)
  ]);
  const options:Prefs=settings.data?{
   preferred_format:settings.data.preferred_format as RunFormat,
   preferred_type:settings.data.preferred_type as RunPlayType,
   watched_courts:settings.data.watched_courts||[]
  }:defaults;
  setPrefs(options);
  onPreferencesChange?.(options);
  setRatings((games.data||[]) as Rating[]);
  const runIds=(played.data||[]).map((row:{run_id:string})=>row.run_id);
  if(runIds.length){
   const {data}=await db.from('runs').select('id,location_slug').in('id',runIds);
   setPlayedCourts([...new Set(((data||[]) as {location_slug:string|null}[]).map(x=>x.location_slug).filter((x):x is string=>Boolean(x)))]);
  }else setPlayedCourts([]);
  if(options.watched_courts.length){
   const {data}=await db.from('rch_court_master_titles').select('court_slug,division,defenses').in('court_slug',options.watched_courts).limit(60);
   setTitles((data||[]) as Title[]);
  }else setTitles([]);
 },[db,user?.id]);
 useEffect(()=>{void load();},[load]);
 async function update(next:Prefs,court:string|null=null,watch=true){
  if(busy)return;
  const previous=prefs;
  setPrefs(next);onPreferencesChange?.(next);setError('');setNotice('');
  if(!user?.id){setNotice('Sign in to save these preferences across your devices.');return;}
  setBusy(true);
  const {error:failure}=await db.rpc('rch_set_run_daily_preferences',{
   p_format:next.preferred_format,p_type:next.preferred_type,
   p_court:court,p_watch:watch
  });
  if(failure){setError(failure.message);setPrefs(previous);onPreferencesChange?.(previous);}
  else{
   setNotice('Your Runs board is updated.');
   void load();
  }
  setBusy(false);
 }
 const context=useMemo(()=>({
  now:clock, userId:user?.id,cityId,radiusMiles,
  preferredFormat:prefs.preferred_format,
  preferredType:prefs.preferred_type,
  watchedCourts:prefs.watched_courts,playedCourts
 }),[clock,user?.id,cityId,radiusMiles,prefs,playedCourts]);
 const picks=useMemo(()=>buildDailyCircuitPicks(runs,context),[runs,context]);
 const mine=ratings.find(row=>row.game_format===prefs.preferred_format)||ratings[0];
 const courtCards=[...new Set(prefs.watched_courts)];
 const uniquePickIds=[...new Set([picks.next?.id,picks.explore?.id,picks.week?.id].filter((x):x is string=>!!x))];
 const display=[
  {run:picks.next,headline:'YOUR NEXT RUN',tagline:'Best upcoming fit',icon:FaBasketball},
  {run:picks.explore,headline:'NEW COURT ENERGY',tagline:'A different host or court',icon:FaCrown},
  {run:picks.week,headline:'ON THE HORIZON',tagline:'Another real chance to hoop',icon:FaCalendarDays}
 ].filter(item=>item.run&&uniquePickIds.includes(item.run.id))
  .filter((item,index,arr)=>arr.findIndex(other=>other.run?.id===item.run?.id)===index);
 const dateLabel=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'long',month:'short',day:'numeric'}).format(new Date(clock));
 const openRuns=runs.filter(run=>scoreDailyRun(run,context).isJoinable).length;
 const playbook=getDailyPlaybook(clock);
 return <section id="rch-daily-circuit" aria-labelledby="rch-daily-circuit-title" className="mb-6 overflow-hidden rounded-3xl border border-[#3b83b5] bg-[radial-gradient(ellipse_at_90%_0%,#1c4267,#071b30_68%)] text-white shadow-[0_15px_55px_rgba(0,13,36,.3)]">
  <div className="border-b border-[#335c83] p-5 sm:p-7">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
     <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.21em] text-[#81c6fc]"><FaClock/> DAILY CIRCUIT · {dateLabel}</p>
     <h2 id="rch-daily-circuit-title" className="mt-3 text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">YOUR CITY. <span className="text-[#78c2fa]">YOUR NEXT MOVE.</span></h2>
     <p className="mt-3 max-w-2xl text-sm leading-6 text-[#bcd8ed]">Fresh real-world basketball opportunities every Virginia day. Find a matchup, discover a new court and build your verified résumé. No manufactured games or pressure to check in.</p>
    </div>
    <span className="rounded-xl border border-[#508bbb] bg-[#123c5c] px-3 py-2 text-xs font-black text-[#c1e7ff]">{openRuns} open {openRuns===1?'Run':'Runs'}</span>
   </div>
   <div className="mt-5 flex flex-wrap gap-3">
    <label className="text-[11px] font-black uppercase text-[#abd3ef]">My game
     <select aria-label="Preferred Runs game format" value={prefs.preferred_format} disabled={busy} onChange={e=>void update({...prefs,preferred_format:e.target.value as RunFormat})} className="mt-2 block min-h-11 min-w-32 rounded-xl border border-[#467c9d] bg-[#0a2b45] px-3 text-sm font-bold text-white">
      {formats.map(f=><option key={f} value={f}>{formatLabel(f)}</option>)}
     </select>
    </label>
    <label className="text-[11px] font-black uppercase text-[#abd3ef]">My vibe
     <select aria-label="Preferred Runs style" value={prefs.preferred_type} disabled={busy} onChange={e=>void update({...prefs,preferred_type:e.target.value as RunPlayType})} className="mt-2 block min-h-11 min-w-32 rounded-xl border border-[#467c9d] bg-[#0a2b45] px-3 text-sm font-bold text-white">
      {types.map(t=><option key={t} value={t}>{typeLabel(t)}</option>)}
     </select>
    </label>
    <Link href="/runs/partners" className="self-end rounded-xl border border-[#467c9d] px-4 py-3 text-xs font-black text-[#bde4ff]">Explore organizers <FaArrowRight className="ml-1 inline"/></Link>
   </div>
   {error&&<p role="alert" className="mt-4 rounded-lg border border-red-400/50 p-3 text-xs text-red-200">{error}</p>}
   {notice&&<p role="status" className="mt-4 text-xs font-semibold text-[#b0ebce]">{notice}</p>}
  </div>
  <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-3">
   {display.length?display.map(({run,headline,tagline,icon:Icon})=>run&&<article key={run.id} className="flex h-full flex-col rounded-2xl border border-[#315f86] bg-[#0b2843] p-5">
    <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#87cbfb]"><Icon/> {headline}</p>
    <p className="mt-1 text-xs text-[#a4c8df]">{tagline}</p>
    <h3 className="mt-4 text-xl font-black leading-tight">{run.title}</h3>
    <p className="mt-2 flex items-start gap-2 text-xs text-[#c2d6e5]"><FaLocationDot className="mt-0.5 shrink-0"/>{run.location}</p>
    <p className="mt-2 flex items-start gap-2 text-xs text-[#c2d6e5]"><FaCalendarDays className="mt-0.5 shrink-0"/>{new Date(run.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · {run.game_format}</p>
    <div className="mt-4 flex flex-wrap gap-1.5">{scoreDailyRun(run,context).reasons.map(reason=><span key={reason} className="rounded-full border border-[#3c6688] bg-[#123b59] px-2 py-1 text-[10px] font-semibold text-[#bce2fc]">{reason}</span>)}</div>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
     <Link href={'/runs/'+run.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2788e8] px-4 text-xs font-black">View Run <FaArrowRight/></Link>
     {run.location_slug&&<button type="button" disabled={busy||!user} onClick={()=>void update({...prefs,watched_courts:prefs.watched_courts.includes(run.location_slug!)?prefs.watched_courts.filter(c=>c!==run.location_slug):[...prefs.watched_courts,run.location_slug!]},run.location_slug,!prefs.watched_courts.includes(run.location_slug))} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#6096b5] px-3 text-[11px] font-bold text-[#b9ddf5] disabled:opacity-50"><FaEye/> {prefs.watched_courts.includes(run.location_slug)?'Watching':'Watch court'}</button>}
    </div>
   </article>):<div className="rounded-2xl border border-dashed border-[#3a6c93] bg-[#0c2942] p-7 text-[#c0d7e9] lg:col-span-3">
     <FaBasketball className="text-3xl text-[#72bcf3]"/><h3 className="mt-3 text-xl font-black">The next chapter is yours to start.</h3><p className="mt-2 max-w-lg text-sm leading-6">No available scheduled runs match the current feed yet. Host a real court session or discover Virginia organizers—nothing here is simulated.</p><Link href="/runs?create=1" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#288be9] px-5 text-xs font-black">Host the first Run <FaArrowRight className="ml-2"/></Link>
    </div>}
  </div>
  <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#946d34] bg-[linear-gradient(110deg,#40321d,#122e47)] p-5 sm:mx-6 sm:p-6">
   <div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#ffe09d]"><FaCrown/> TODAY'S PLAYBOOK · REAL-WORLD CHALLENGE</p><h3 className="mt-2 text-xl font-black uppercase sm:text-2xl">{playbook.headline}</h3><p className="mt-2 text-sm leading-6 text-[#f2e3c6]">{playbook.message}</p><p className="mt-2 text-[11px] text-[#c9b998]">Daily inspiration, not a scheduled game, automatic reward or verified victory. Play responsibly, confirm venue access and log real results.</p></div>
   <Link href={'/runs?create=1&format='+playbook.format+'&mode='+playbook.mode} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#eed197] px-4 text-xs font-black text-[#2b210f]">{playbook.callToAction} <FaArrowRight/></Link>
  </div>
  <div className="grid gap-3 border-t border-[#315779] bg-[#081c30]/80 p-4 sm:grid-cols-2 sm:p-6">
   <div className="rounded-xl border border-[#365a75] bg-[#0b273e] p-4">
    <p className="flex items-center gap-2 text-xs font-black uppercase text-[#f7d58d]"><FaTrophy/> Your verified competition</p>
    {user?<><p className="mt-3 text-2xl font-black">{mine?mine.rating+' rating':'First ranked game ahead'}</p><p className="mt-1 text-xs leading-5 text-[#b4cee1]">{mine?mine.game_format+' · '+mine.games+' verified games · '+mine.wins+' wins':'Play a real opponent-confirmed match to start an official rating. Playing, posting or buying REP cannot produce wins.'}</p><Link href="/runs#rch-ranked-heading" className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#9fd5fa]">View official ladders <FaArrowRight/></Link></>:
    <p className="mt-3 text-xs leading-5 text-[#b4cee1]">Sign in to see your real rating, verified games and competition progress.</p>}
   </div>
   <div className="rounded-xl border border-[#365a75] bg-[#0b273e] p-4">
    <p className="flex items-center gap-2 text-xs font-black uppercase text-[#9ccfff]"><FaCrown/> Your court watch</p>
    <p className="mt-3 text-2xl font-black">{courtCards.length?courtCards.length+' watched '+(courtCards.length===1?'court':'courts'):'Find your home court'}</p>
    <p className="mt-1 text-xs leading-5 text-[#b4cee1]">{courtCards.length?titles.length?titles.length+' recorded court master titles across your watched courts.':'Your courts are saved. Court title records appear after verified championships.':'Watch a mapped court to keep its Runs and verified competition close to the top.'}</p>
    {!!courtCards.length&&<div className="mt-3 flex flex-wrap gap-2">{courtCards.slice(0,4).map(court=><Link href={'/runs?court='+encodeURIComponent(court)} key={court} className="rounded-lg border border-[#47728b] px-2 py-1.5 text-[11px] font-bold text-[#b2dafa]">{court.replaceAll('-',' ')} →</Link>)}</div>}
    {!user&&<Link href="/auth/sign-in?next=%2Fruns" className="mt-3 inline-block text-xs font-black text-[#9bd7ff]">Sign in to follow courts <FaArrowRight className="ml-1 inline"/></Link>}
   </div>
  </div>
  <p className="px-5 pb-4 text-[10px] leading-5 text-[#8fadbf]">Daily rotation: {virginiaCircuitDay(clock)} · Recommendations use selected Virginia city, time, open spots, your chosen format and watched courts. They never change verified results, grant REP, or penalize rest days. You control your settings.</p>
 </section>;
}
