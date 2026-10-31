'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { RchTvMode } from '@/lib/rch-tv-broadcast';

type History = {
 id: string; state: string; channel: RchTvMode; egress_id: string | null;
 started_at:string;deadline_at:string;stopped_at:string|null;verified_at:string|null;
 file_size_bytes:number|null;note:string|null;
};
type Dashboard = {
 state:'disabled'|'available'|'misconfigured'; active:boolean; egressId:string|null;
 safetyReady:boolean;maxMinutes:number;dailyMinutes:number;history:History[];
};
const prep = [
 {key:'rights',text:'Film, venue, participant and music permissions confirmed'},
 {key:'power',text:'Camera power, network speed and storage available'},
 {key:'mic',text:'Camera and microphone preview sounds right'},
 {key:'graphics',text:'Team names, score and sponsor graphics reviewed'},
 {key:'backup',text:'Independent local recording is running and tested'},
 {key:'viewer',text:'Second device can see and hear the public feed'},
] as const;
const replay = [
 {key:'ended',text:'Live room is offline and recording stop confirmed'},
 {key:'copy',text:'Complete backup and/or private cloud file checked'},
 {key:'watch',text:'Beginning, middle and end play with clear audio'},
 {key:'rights',text:'Distribution permissions and sponsor placements reviewed'},
 {key:'poster',text:'Title, thumbnail, section and description ready'},
 {key:'publish',text:'Replay uploaded as draft and reviewed before publishing'},
] as const;
type Step='prep'|'live'|'replay';
const niceTime=(stamp:string)=>new Date(stamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export default function RchGameDay() {
 const {user,profile,loading:authLoading}=useAuth();
 const client=useMemo(()=>getSupabaseClient(),[]);
 const authorized=!!user&&profile?.role==='admin';
 const [mode,setMode]=useState<RchTvMode>('live_games');
 const [step,setStep]=useState<Step>('prep');
 const [checks,setChecks]=useState<Record<string,boolean>>({});
 const [snapshot,setSnapshot]=useState<Dashboard|null>(null);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [ready,setReady]=useState(false);
 const card='rounded-2xl border border-white/10 bg-[#0a1421] p-5 shadow-[0_8px_30px_rgba(0,0,0,.15)]';
 const key='rch-tv:gameday:v1:'+mode;
 useEffect(()=>{
  setReady(false);setSnapshot(null);setError('');setNotice('');
  try{const saved=window.localStorage.getItem(key);setChecks(saved?JSON.parse(saved):{});}catch{setChecks({});}
  setReady(true);
 },[key]);
 function toggle(id:string,checked:boolean) {
  setChecks(current=>{
   const next={...current,[id]:checked};
   try{window.localStorage.setItem(key,JSON.stringify(next));}catch{}
   return next;
  });
 }
 const request=useCallback(async(action?:'emergency')=>{
  if(!client)throw new Error('Authentication client unavailable.');
  const {data}=await client.auth.getSession();
  if(!data.session?.access_token)throw new Error('Administrator session expired. Sign in again.');
  const response=await fetch(action?'/api/rch-tv/recording':'/api/rch-tv/recording?mode='+mode,{
   method:action?'POST':'GET',cache:'no-store',
   headers:{Authorization:'Bearer '+data.session.access_token,...(action?{'Content-Type':'application/json'}:{})},
   ...(action?{body:JSON.stringify({mode,action})}:{})});
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||'Unable to retrieve recording state.');
  return body;
 },[client,mode]);
 const refresh=useCallback(async()=>{
  if(!authorized)return;
  setLoading(true);setError('');
  try{setSnapshot(await request() as Dashboard);}catch(err){setError(err instanceof Error?err.message:'Unable to load recording status.');}
  finally{setLoading(false);}
 },[request,authorized]);
 useEffect(()=>{if(authorized&&ready)void refresh();},[authorized,ready,refresh]);
 async function emergency(){
  if(busy||!authorized)return;
  if(!window.confirm('EMERGENCY STOP: Take the '+(mode==='live_games'?'Live Games':'The Pulse')+' channel offline, disconnect its LiveKit room and stop any active cloud recorder? This can interrupt viewers.'))return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await request('emergency') as {note:string};
   setNotice(result.note);
   await refresh();
  }catch(err){setError(err instanceof Error?err.message:'Emergency stop could not be confirmed. Check provider dashboard.');}
  finally{setBusy(false);}
 }
 const completed=(values:readonly {key:string}[],scope:string)=>values.filter(item=>checks[scope+item.key]).length;
 const prepDone=completed(prep,'prep:');
 const replayDone=completed(replay,'replay:');
 if(authLoading)return <main className="min-h-dvh p-8 text-white">Loading Game Day Center…</main>;
 if(!authorized)return <main className="min-h-dvh p-8 text-white"><h1 className="text-xl font-bold">Administrator access required</h1><Link href="/media" className="mt-4 block text-sky-300">Back to RCH TV</Link></main>;
 const status=snapshot?.state==='disabled'?'Local backup only':snapshot?.state==='available'&&snapshot.safetyReady?'Cloud recording configured':'Recording service requires review';
 return <main className="min-h-dvh bg-[#060d17] pb-24 text-white">
  <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
   <header className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <p className="text-[11px] font-black uppercase tracking-[.22em] text-sky-300">RCH TV · Production operations</p>
     <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Game Day Center</h1>
     <p className="mt-2 max-w-xl text-sm text-white/50">One clear path from camera readiness to a reviewed game replay.</p>
    </div>
    <Link className="rounded-lg border border-white/20 px-4 py-3 text-sm font-bold" href="/admin/rch-tv">Media operations</Link>
   </header>
   <div className="flex gap-2 rounded-xl bg-white/[.035] p-1.5" role="group" aria-label="Broadcast channel">
    {(['live_games','the_pulse'] as const).map(m=><button type="button" key={m} aria-pressed={mode===m}
     onClick={()=>{setMode(m);setStep('prep');}} className={'min-h-11 flex-1 rounded-lg px-4 text-sm font-black '+(mode===m?'bg-sky-300 text-[#07101b]':'text-white/60')}>
     {m==='live_games'?'Live Games':'The Pulse'}</button>)}
   </div>
   <div className="grid grid-cols-3 gap-2" role="group" aria-label="Production workflow">
    {([['prep','1 · Prepare'],['live','2 · Broadcast'],['replay','3 · Replay']] as const).map(([id,label])=><button type="button" key={id} onClick={()=>setStep(id)}
      aria-pressed={step===id} className={'min-h-12 rounded-lg border px-2 text-xs font-extrabold sm:text-sm '+(step===id?'border-sky-400/60 bg-sky-300/15 text-white':'border-white/10 bg-white/[.035] text-white/55')}>
       {label}</button>)}
   </div>
   <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
    <section className={card}>
     {step==='prep'?<>
       <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Pregame readiness</h2><span className="text-xs font-bold tabular-nums text-sky-300">{prepDone}/{prep.length} checked</span></div>
       <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-sky-300" style={{width:(prepDone/prep.length*100)+'%'}}/></div>
       <div className="mt-5 space-y-2">
        {prep.map(item=><label key={item.key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-white/80">
          <input type="checkbox" checked={checks['prep:'+item.key]===true} onChange={e=>toggle('prep:'+item.key,e.target.checked)} className="h-5 w-5 accent-sky-300"/><span>{item.text}</span>
        </label>)}
       </div>
       <p className="mt-4 text-xs leading-5 text-white/45">These are the operator&apos;s local checks. The Studio independently enforces distribution-rights and backup confirmations before Go Live.</p>
       <button type="button" onClick={()=>setStep('live')} className="mt-5 min-h-12 rounded-lg bg-sky-300 px-5 text-sm font-black text-[#07101b]">Continue to broadcast</button>
     </>:step==='live'?<>
       <p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Broadcast control</p>
       <h2 className="mt-1 text-xl font-black">Produce the show</h2>
       <p className="mt-3 max-w-lg text-sm leading-6 text-white/60">The existing Studio controls camera, audio, scores, sponsor graphics and the actual Go Live action. Do not start a second producer while one is live.</p>
       <Link href={'/admin/rch-tv/studio?mode='+mode} className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-sky-300 px-5 text-sm font-black text-[#07101b]">Open Broadcast Studio</Link>
       <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a href="/media" target="_blank" rel="noreferrer" className="min-h-12 rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-bold">Open public viewer ↗</a>
        <button type="button" onClick={()=>void refresh()} disabled={loading} className="min-h-12 rounded-lg border border-white/20 px-4 py-3 text-sm font-bold disabled:opacity-40">{loading?'Checking…':'Refresh recording status'}</button>
       </div>
       <p className="mt-4 text-xs leading-5 text-white/45">The visible scoreboard and sponsor overlays are not necessarily burned into a cloud recording; confirm separately before agreeing to sponsor deliverables.</p>
       <button type="button" onClick={()=>setStep('replay')} className="mt-5 text-sm font-bold text-sky-300">Broadcast finished? Open replay review</button>
     </>:<>
       <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Replay quality review</h2><span className="text-xs font-bold text-sky-300">{replayDone}/{replay.length} checked</span></div>
       <p className="mt-3 text-sm leading-6 text-white/60">A stopped broadcast is not a verified replay. Confirm the source file and review its rights, picture and audio before publishing.</p>
       <div className="mt-5 space-y-2">{replay.map(item=><label key={item.key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-white/80">
          <input type="checkbox" checked={checks['replay:'+item.key]===true} onChange={e=>toggle('replay:'+item.key,e.target.checked)} className="h-5 w-5 accent-sky-300"/><span>{item.text}</span>
        </label>)}</div>
       <Link className="mt-5 inline-flex min-h-12 items-center rounded-lg bg-sky-300 px-5 text-sm font-black text-[#07101b]" href={'/admin/rch-tv?replay='+mode+'#upload-replay'}>Upload and review replay</Link>
     </>}
    </section>
    <aside className="space-y-5">
     <section className={card}>
      <div className="flex items-center justify-between gap-2">
       <h2 className="text-base font-black">Recording safety</h2>
       <button type="button" onClick={()=>void refresh()} disabled={loading} className="rounded-md border border-white/20 px-3 py-2 text-xs font-bold disabled:opacity-40">Refresh</button>
      </div>
      <p role="status" className="mt-4 text-sm font-bold text-sky-300">{loading?'Checking provider…':snapshot?status:'Status unavailable'}</p>
      {snapshot&&<>
       <p className="mt-1 text-xs text-white/55">{snapshot.active?'Recording or reservation active':'No active recording or reservation reported'}</p>
       {snapshot.state==='available'&&<p className="mt-3 text-xs leading-5 text-white/60">Session limit: {snapshot.maxMinutes||'not set'} minutes · Daily reserved budget: {snapshot.dailyMinutes||'not set'} minutes. Watchdog checks approximately every five minutes; provider-level limits are still required.</p>}
       {snapshot.state==='disabled'&&<p className="mt-3 text-xs leading-5 text-white/55">Paid cloud recording remains off. Record independently and review the upload afterward.</p>}
      </>}
      <div className="mt-5 border-t border-red-500/20 pt-4">
       <p className="text-xs font-bold uppercase tracking-wide text-red-200">Emergency cutoff</p>
       <p className="mt-2 text-xs leading-5 text-white/50">Closes the live room, requests Egress stop and takes this channel offline. If the provider cannot confirm shutdown, check LiveKit immediately.</p>
       <button type="button" disabled={busy} onClick={()=>void emergency()} className="mt-3 min-h-12 w-full rounded-lg border border-red-400/50 bg-red-500/10 px-3 text-sm font-black text-red-100 disabled:opacity-40">{busy?'Stopping…':'Emergency end broadcast'}</button>
      </div>
     </section>
     <section className={card}>
      <h2 className="text-base font-black">Recent recording sessions</h2>
      {!snapshot?.history?.length?<p className="mt-3 text-xs leading-6 text-white/50">No cloud recording history yet. Offline mode continues using a separate camera recording.</p>:<div className="mt-4 max-h-80 space-y-2 overflow-auto">
       {snapshot.history.map(item=><div key={item.id} className="rounded-lg border border-white/10 bg-white/[.03] p-3 text-xs">
        <div className="flex items-center justify-between gap-2"><strong className="font-black capitalize text-white">{item.state.replace(/_/g,' ')}</strong><span className="text-white/50">{niceTime(item.started_at)}</span></div>
        <p className="mt-1 text-white/55">{item.state==='verified'?'Storage object confirmed · playback review still required':item.state==='finalizing'?'Private file check pending':item.state==='needs_review'?'Needs operator investigation':item.note||'No verified replay yet'}</p>
        {item.file_size_bytes&&<p className="mt-1 text-sky-300">{(item.file_size_bytes/1024/1024).toFixed(1)} MB in private storage</p>}
       </div>)}
      </div>}
     </section>
    </aside>
   </div>
   {error&&<div role="alert" className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">{error}</div>}
   {notice&&<div role="status" className="rounded-lg border border-sky-300/30 bg-sky-400/10 p-4 text-sm text-sky-100">{notice}</div>}
  </div>
 </main>;
}
