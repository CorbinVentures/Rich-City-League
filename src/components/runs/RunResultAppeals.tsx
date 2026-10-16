'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaFlag,FaShieldHalved} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Match={id:string;home_score:number;away_score:number;home_roster:string[];away_roster:string[];status:string;submitted_at:string};
type Case={id:string;match_id:string;reason:string;status:string;created_at:string;resolution_notes:string|null};
const reasons=[
 ['incorrect_score','Incorrect final score'],['ineligible_player','Ineligible or substitute player'],
 ['suspected_fraud','Suspicious or invented game'],['conduct','Unsafe or unsporting conduct'],
 ['other','Other competition concern']
] as const;

export function RunResultAppeals({runId,hostId}:{runId:string;hostId:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [matches,setMatches]=useState<Match[]>([]);
 const [cases,setCases]=useState<Case[]>([]);
 const [match,setMatch]=useState('');
 const [reason,setReason]=useState('incorrect_score');
 const [details,setDetails]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [enabled,setEnabled]=useState(true);
 const [revision,setRevision]=useState(0);

 const load=useCallback(async()=>{
   if(!db||!user?.id)return;
   const [m,c]=await Promise.all([
    db.from('run_ranked_matches').select('id,home_score,away_score,home_roster,away_roster,status,submitted_at')
      .eq('run_id',runId).order('submitted_at',{ascending:false}).limit(50),
    db.from('rch_run_result_cases').select('id,match_id,reason,status,created_at,resolution_notes')
      .eq('run_id',runId).order('created_at',{ascending:false}).limit(20)
   ]);
   setEnabled(!c.error);
   setMatches((m.data??[]) as Match[]);
   setCases((c.data??[]) as Case[]);
 },[db,runId,user?.id]);
 useEffect(()=>{void load();},[load,revision]);

 if(!user||!enabled)return null;
 const eligible=matches.filter(m=>user.id===hostId||m.home_roster.includes(user.id)||m.away_roster.includes(user.id));
 const openCase=(id:string)=>cases.some(c=>c.match_id===id&&['open','under_review'].includes(c.status));
 const selected=eligible.find(m=>m.id===match);
 const submit=async()=>{
   if(!db||!selected||details.trim().length<15)return;
   setBusy(true);setError('');setNotice('');
   const {error:failure}=await db.rpc('rch_file_run_result_case',{
    p_match:selected.id,p_reason:reason,p_details:details.trim()
   });
   if(failure)setError(failure.message);
   else{setNotice('Your case is in the RCH integrity review queue.');setDetails('');setMatch('');setRevision(v=>v+1);}
   setBusy(false);
 };
 return <section aria-label="Run score disputes and appeals" className="mt-6 rounded-3xl border border-[#4c587a] bg-[#101a2e] p-5 text-white sm:p-7">
   <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#b2c8ff]"><FaShieldHalved/> RCH Competition Integrity</p>
   <h2 className="mt-2 text-2xl font-black uppercase">Fair Play &amp; Appeals</h2>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a4b7da]">Involved players and the host may report scoring, eligibility, conduct or integrity concerns within 14 days. Staff adjudication is recorded. Verified ratings cannot be silently overwritten.</p>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-rose-500/40 p-3 text-sm text-rose-200">{error}</p>}
   {notice&&<p role="status" className="mt-4 rounded-xl border border-[#5984b0] p-3 text-sm">{notice}</p>}
   {cases.length>0&&<div className="mt-4 space-y-2">{cases.map(c=><div key={c.id} className="rounded-xl border border-[#3f5679] bg-[#0d2035] p-3 text-xs">
      <span className="font-black uppercase text-[#a7caf8]">{c.status.replaceAll('_',' ')}</span>
      <span className="ml-2">{reasons.find(r=>r[0]===c.reason)?.[1]||c.reason}</span>
      <span className="ml-2 text-[#a3b6d0]">{new Date(c.created_at).toLocaleDateString()}</span>
      {c.resolution_notes&&<p className="mt-2 leading-5 text-[#bccce1]">{c.resolution_notes}</p>}
   </div>)}</div>}
   {eligible.length>0&&<div className="mt-5 grid gap-3 md:grid-cols-2">
     <label className="text-xs font-black">Match
      <select value={match} onChange={e=>setMatch(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-[#506580] bg-[#07182b] px-3 text-sm text-white">
       <option value="">Select your match</option>
       {eligible.filter(m=>!openCase(m.id)).map(m=><option key={m.id} value={m.id}>{new Date(m.submitted_at).toLocaleDateString()} · {m.home_score}–{m.away_score} · {m.status}</option>)}
      </select>
     </label>
     <label className="text-xs font-black">Reason
      <select value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-[#506580] bg-[#07182b] px-3 text-sm text-white">
       {reasons.map(([value,label])=><option value={value} key={value}>{label}</option>)}
      </select>
     </label>
     <label className="text-xs font-black md:col-span-2">Explain what happened
      <textarea value={details} onChange={e=>setDetails(e.target.value.slice(0,1800))} rows={3} maxLength={1800}
       placeholder="Include the correct score, what you witnessed and any available evidence…" className="mt-2 w-full rounded-lg border border-[#506580] bg-[#07182b] p-3 text-sm text-white"/>
     </label>
     <div className="md:col-span-2">
       <button type="button" disabled={busy||!selected||details.trim().length<15} onClick={()=>void submit()} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#7395e8] px-5 text-xs font-black text-[#091428] disabled:opacity-50"><FaFlag/> Submit integrity case</button>
     </div>
   </div>}
   {eligible.length===0&&cases.length===0&&<p className="mt-4 text-xs text-[#95add0]">An official ranked result will unlock appeals for its participants and host.</p>}
 </section>;
}
