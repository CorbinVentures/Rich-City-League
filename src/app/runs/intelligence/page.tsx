'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaChartLine,FaClipboardCheck,FaLocationDot,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Region={region:string;verified_games:number;scheduled_sessions:number};
type Intelligence={
 days:number;scheduled_runs:number;active_hosts:number;verified_matches:number;
 verified_players:number;pending_results:number;open_cases:number;active_queue_entries:number;
 claimed_crew_territories:number;courts_with_verified_games:number;regional_activity:Region[]
};
type Case={id:string;match_id:string;reason:string;status:string;details:string;created_at:string;resolution_notes:string|null};
const statuses=['under_review','dismissed','correction_requested','escalated'] as const;

export default function RunsIntelligencePage(){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [days,setDays]=useState<7|30|90>(30);
 const [report,setReport]=useState<Intelligence|null>(null);
 const [cases,setCases]=useState<Case[]>([]);
 const [denied,setDenied]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [reviewing,setReviewing]=useState('');
 const [decision,setDecision]=useState<typeof statuses[number]>('under_review');
 const [notes,setNotes]=useState('');
 const [revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  if(!db||!user?.id){setLoading(false);return;}
  setLoading(true);setError('');
  const {data,error:failure}=await db.rpc('get_rch_runs_intelligence',{p_days:days});
  if(failure){
   setDenied(true);setReport(null);setCases([]);setError('Statewide Runs intelligence is available only to authorized RCH staff.');
  }else{
   setDenied(false);setReport(data as Intelligence);
   const {data:rows,error:caseError}=await db.from('rch_run_result_cases')
    .select('id,match_id,reason,status,details,created_at,resolution_notes')
    .in('status',['open','under_review']).order('created_at',{ascending:true}).limit(60);
   if(caseError)setError('The integrity queue could not be loaded.');
   setCases((rows??[]) as Case[]);
  }
  setLoading(false);
 },[db,days,user?.id,revision]);
 useEffect(()=>{void load();},[load]);
 const judge=async()=>{
  if(!db||!reviewing||notes.trim().length<8)return;
  setError('');
  const {error:failure}=await db.rpc('rch_review_run_result_case',{
    p_case:reviewing,p_decision:decision,p_notes:notes.trim()
  });
  if(failure)setError(failure.message);
  else{setNotes('');setReviewing('');setRevision(v=>v+1);}
 };

 const fmt=(n:number|undefined)=>Number(n||0).toLocaleString();
 const regions=report?.regional_activity??[];
 const max=Math.max(1,...regions.map(x=>x.verified_games));
 return <main className="min-h-screen bg-[#121212] px-4 pb-24 pt-12 text-white sm:px-8">
  <div className="mx-auto max-w-6xl">
   <Link href="/runs" className="text-xs font-bold text-[#cccccc]">← Back to Runs</Link>
   <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
    <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#bfbfbf]"><FaChartLine/> RCH · Command Intelligence</p>
      <h1 className="mt-3 font-display text-3xl font-black uppercase sm:text-5xl">Virginia Runs Network</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c1c1c1]">Operational truth from actual Runs activity — verified competition, regional expansion signals, real player participation and integrity workload. No estimated live crowd data.</p></div>
    <label className="text-xs font-bold text-[#d3d3d3]">Period
     <select value={days} onChange={e=>setDays(Number(e.target.value) as 7|30|90)} className="ml-3 min-h-11 rounded-xl border border-[#6b6b6b] bg-[#252525] px-3 text-white">
      {[7,30,90].map(n=><option key={n} value={n}>{n} days</option>)}
     </select>
    </label>
   </header>
   {!user&&<p className="mt-8 rounded-xl border border-[#616161] p-5 text-sm">Sign in with an authorized RCH staff account to access intelligence. <Link href="/auth/sign-in?next=%2Fruns%2Fintelligence" className="font-bold text-[#c3c3c3] underline">Sign in</Link></p>}
   {loading&&<p className="mt-8 text-sm text-[#c3c3c3]">Loading verified statewide metrics…</p>}
   {denied&&!loading&&<p role="alert" className="mt-8 rounded-xl border border-[#7f7f7f] bg-[#323232]/50 p-5 text-sm text-[#d7d7d7]">{error}</p>}
   {report&&!denied&&!loading&&<>
    <section aria-label="Network metrics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
     {([
      ['Verified games',report.verified_matches,FaBasketball],
      ['Verified players',report.verified_players,FaChartLine],
      ['Scheduled Runs',report.scheduled_runs,FaLocationDot],
      ['Active hosts',report.active_hosts,FaClipboardCheck],
      ['Courts with matches',report.courts_with_verified_games,FaBasketball],
      ['Crew territories',report.claimed_crew_territories,FaLocationDot],
      ['Next Up entries',report.active_queue_entries,FaClipboardCheck],
      ['Results awaiting proof',report.pending_results,FaShieldHalved],
      ['Open integrity cases',report.open_cases,FaShieldHalved],
     ] as const).map(([label,count,Icon])=><article key={label} className="rounded-2xl border border-[#5f5f5f] bg-[#252525] p-4">
       <Icon className="text-[#b4b4b4]"/>
       <strong className="mt-3 block text-2xl font-black">{fmt(count)}</strong>
       <span className="mt-1 block text-[11px] font-bold text-[#cacaca]">{label}</span>
      </article>)}
    </section>
    <section aria-label="Regional competitive activity" className="mt-7 rounded-3xl border border-[#555555] bg-[#202020] p-5 sm:p-7">
      <h2 className="text-xl font-black uppercase">Regional Activity</h2>
      <p className="mt-1 text-xs text-[#bebebe]">Verified ranked games and recorded Run sessions. Regions with no confirmed games are not given fictional activity.</p>
      <div className="mt-6 space-y-4">
       {regions.map(x=><div key={x.region}>
         <div className="flex items-center justify-between gap-3 text-xs"><strong>{x.region}</strong><span className="text-[#cfcfcf]">{fmt(x.verified_games)} verified · {fmt(x.scheduled_sessions)} sessions</span></div>
         <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#363636]"><div style={{width:Math.round(100*x.verified_games/max)+'%'}} className="h-full rounded-full bg-[#9a9a9a]"/></div>
       </div>)}
       {!regions.length&&<p className="text-sm text-[#c7c7c7]">Regional history begins with actual Run participation.</p>}
      </div>
    </section>
    <section aria-label="Integrity case adjudication" className="mt-7 rounded-3xl border border-[#525252] bg-[#1f1f1f] p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-xl font-black uppercase"><FaShieldHalved className="text-[#c8c8c8]"/> Competition Integrity Desk</h2>
      <p className="mt-2 text-xs leading-5 text-[#c2c2c2]">Only RCH staff can adjudicate cases. Correction requests reject pending results for resubmission; verified results require separate audited remediation rather than silent rating changes.</p>
      {error&&<p role="alert" className="mt-4 text-sm text-gray-200">{error}</p>}
      <div className="mt-5 space-y-3">{cases.map(c=><article key={c.id} className="rounded-xl border border-[#626262] bg-[#212121] p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <strong className="uppercase text-[#d9d9d9]">{c.reason.replaceAll('_',' ')}</strong>
          <span className="rounded-full bg-[#393939] px-2 py-1 text-[#d2d2d2]">{c.status.replaceAll('_',' ')}</span>
          <span className="text-[#b1b1b1]">{new Date(c.created_at).toLocaleDateString()}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#d9d9d9]">{c.details}</p>
        {reviewing===c.id?<div className="mt-4 space-y-3">
          <select aria-label="Case decision" value={decision} onChange={e=>setDecision(e.target.value as typeof statuses[number])} className="min-h-11 w-full rounded-xl border border-[#717171] bg-[#1b1b1b] px-3 text-sm">
            {statuses.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}
          </select>
          <textarea aria-label="Review rationale" value={notes} onChange={e=>setNotes(e.target.value.slice(0,1600))} rows={3} placeholder="Document evidence and reasons (at least 8 characters)" className="w-full rounded-xl border border-[#717171] bg-[#1b1b1b] p-3 text-sm"/>
          <button type="button" disabled={notes.trim().length<8} onClick={()=>void judge()} className="min-h-10 rounded-xl bg-[#bebebe] px-4 text-xs font-black text-[#1c1c1c] disabled:opacity-50">Record adjudication</button>
          <button type="button" onClick={()=>setReviewing('')} className="ml-3 text-xs text-[#c0c0c0]">Cancel</button>
        </div>:<button type="button" onClick={()=>{setReviewing(c.id);setNotes('');setDecision('under_review');}} className="mt-4 min-h-10 rounded-xl border border-[#757575] px-4 text-xs font-bold">Review case</button>}
      </article>)}
      {!cases.length&&<p className="rounded-xl border border-dashed border-[#626262] p-4 text-sm text-[#c8c8c8]">No unresolved competition integrity cases.</p>}
      </div>
    </section>
   </>}
  </div>
 </main>;
}
