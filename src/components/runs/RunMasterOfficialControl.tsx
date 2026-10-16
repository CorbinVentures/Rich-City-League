'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaCrown,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Duel={id:string;division:string;challenger_id:string;defender_id:string;status:string};
type Match={id:string;home_roster:string[];away_roster:string[];home_score:number;away_score:number;status:string};
type Attestation={match_id:string};
export function RunMasterOfficialControl({runId}:{runId:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [isOfficial,setIsOfficial]=useState(false);
 const [duels,setDuels]=useState<Duel[]>([]);
 const [matches,setMatches]=useState<Match[]>([]);
 const [attestations,setAttestations]=useState<Attestation[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  if(!db||!user?.id)return;
  const {data:role}=await db.from('rch_run_operators').select('role')
    .eq('run_id',runId).eq('profile_id',user.id).maybeSingle();
  const official=role?.role==='official';
  setIsOfficial(official);
  if(!official)return;
  const [a,b]=await Promise.all([
   db.from('rch_court_master_challenges').select('id,division,challenger_id,defender_id,status')
     .eq('run_id',runId).eq('status','accepted').limit(3),
   db.from('run_ranked_matches').select('id,home_roster,away_roster,home_score,away_score,status')
     .eq('run_id',runId).eq('status','pending').limit(35),
  ]);
  const pending=(b.data??[]) as Match[];
  setDuels((a.data??[]) as Duel[]);
  setMatches(pending);
  if(pending.length){
   const {data:proof}=await db.from('rch_court_master_attestations')
    .select('match_id').in('match_id',pending.map(m=>m.id));
   setAttestations((proof??[]) as Attestation[]);
  }else setAttestations([]);
 },[db,runId,user?.id]);
 useEffect(()=>{void load();},[load,revision]);

 const certify=async(id:string)=>{
  setBusy(true);setMessage('');
  const {error}=await db.rpc('rch_certify_court_master_duel',{p_match:id});
  setMessage(error?error.message:'Court Master proof certified. Both opposing sides must still confirm the ranked score.');
  setBusy(false);
  if(!error)setRevision(v=>v+1);
 };
 if(!isOfficial||!duels.length)return null;
 const relevant=matches.filter(m=>duels.some(d=>
   (m.home_roster.includes(d.challenger_id)&&m.away_roster.includes(d.defender_id))
   ||(m.away_roster.includes(d.challenger_id)&&m.home_roster.includes(d.defender_id))
 ));
 return <section aria-label="Court Master official certification" className="mt-6 rounded-3xl border border-[#9e864c] bg-[#2a291f] p-5 text-white sm:p-7">
  <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#f3d78e]"><FaShieldHalved/> Independent Official · Court Crown</p>
  <h2 className="mt-2 flex items-center gap-2 text-xl font-black uppercase"><FaCrown/> Master Title Certification</h2>
  <p className="mt-2 text-sm leading-6 text-[#e6d9bb]">Verify the exact contender, champion and final score independently before a confirmed title game changes the court's Master.</p>
  {message&&<p role="status" className="mt-3 rounded-lg border border-[#988258] p-3 text-xs">{message}</p>}
  <div className="mt-4 space-y-3">{relevant.map(m=><div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#8b774f] p-3">
    <div><p className="text-xs font-black">{m.home_score} – {m.away_score}</p><p className="mt-1 text-[11px] text-[#dfd1b3]">Pending independently certified championship result</p></div>
    {attestations.some(a=>a.match_id===m.id)?<span className="text-xs font-black text-emerald-200">Certification recorded</span>:
     <button disabled={busy} onClick={()=>void certify(m.id)} className="min-h-10 rounded-lg bg-[#f3d28d] px-4 text-xs font-black text-[#2a2012] disabled:opacity-40">Certify Master Result</button>}
  </div>)}
  {!relevant.length&&<p className="text-xs text-[#e5d3b3]">The host must first record the champion-versus-challenger game. You can certify it while ranked confirmation is pending.</p>}</div>
 </section>;
}
