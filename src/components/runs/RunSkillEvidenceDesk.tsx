'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaBasketball,FaCheck,FaClipboardCheck,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type Match={
 id:string;game_id:string;game_format:string;home_score:number;away_score:number;
 home_roster:string[];away_roster:string[];verified_at:string;
};
type Receipt={
 match_id:string;profile_id:string;review_status:string;recorded_by:string;
 reviewed_by:string|null;points:number;rebounds:number|null;assists:number|null;
 three_made:number|null;three_attempted:number|null;steals:number|null;blocks:number|null;
 turnovers:number|null;defensive_stops:number|null;
};
type StatKey='points'|'rebounds'|'assists'|'three_made'|'three_attempted'|'steals'|'blocks'|'turnovers'|'defensive_stops';
const keys:{field:StatKey;label:string}[]=[
 {field:'points',label:'Points'},{field:'rebounds',label:'Rebounds'},
 {field:'assists',label:'Assists'},{field:'three_made',label:'3PT made'},
 {field:'three_attempted',label:'3PT attempted'},{field:'steals',label:'Steals'},
 {field:'blocks',label:'Blocks'},{field:'turnovers',label:'Turnovers'},
 {field:'defensive_stops',label:'Verified defensive stops'},
];
const empty:Record<StatKey,string>={
 points:'',rebounds:'',assists:'',three_made:'',three_attempted:'',
 steals:'',blocks:'',turnovers:'',defensive_stops:'',
};
const optionalNumber=(s:string)=>s.trim()===''?null:Number(s);

export function RunSkillEvidenceDesk({runId}:{runId:string}){
 const {user}=useAuth();
 const uid=user?.id;
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [matches,setMatches]=useState<Match[]>([]);
 const [receipts,setReceipts]=useState<Receipt[]>([]);
 const [names,setNames]=useState<Record<string,string>>({});
 const [selectedMatch,setSelectedMatch]=useState('');
 const [selectedPlayer,setSelectedPlayer]=useState('');
 const [stats,setStats]=useState<Record<StatKey,string>>(empty);
 const [sourceNote,setSourceNote]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [authorized,setAuthorized]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);
 const reload=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{
  if(!db||!uid){setLoading(false);return;}
  let alive=true;
  void (async()=>{
   setLoading(true);setError('');
   const [manager,operator]=await Promise.all([
    db.rpc('can_manage_run',{target_run:runId}),
    db.from('rch_run_operators').select('role').eq('run_id',runId).eq('profile_id',uid).maybeSingle(),
   ]);
   const allowed=Boolean(!manager.error&&manager.data)||
    Boolean(!operator.error&&['cohost','scorekeeper'].includes(operator.data?.role||''));
   if(!alive)return;
   setAuthorized(allowed);
   if(!allowed){setMatches([]);setLoading(false);return;}
   const m=await db.from('run_ranked_matches')
    .select('id,game_id,game_format,home_score,away_score,home_roster,away_roster,verified_at')
    .eq('run_id',runId).eq('status','verified').order('verified_at',{ascending:false}).limit(60);
   if(!alive)return;
   if(m.error){setError('Verified match records are temporarily unavailable.');setLoading(false);return;}
   const verified=(m.data||[]) as Match[];
   setMatches(verified);
   const ids=verified.map(x=>x.id);
   const persons=[...new Set(verified.flatMap(x=>[...x.home_roster,...x.away_roster]))];
   const [receiptResult,profileResult]=await Promise.all([
    ids.length?db.from('rch_match_skill_box_scores')
      .select('match_id,profile_id,review_status,recorded_by,reviewed_by,points,rebounds,assists,three_made,three_attempted,steals,blocks,turnovers,defensive_stops')
      .in('match_id',ids).limit(250):Promise.resolve({data:[],error:null}),
    persons.length?db.from('profiles').select('id,display_name,username').in('id',persons.slice(0,200)):
      Promise.resolve({data:[],error:null}),
   ]);
   if(!alive)return;
   if(receiptResult.error)setError('Skill evidence is not yet available. Check the database migration.');
   setReceipts((receiptResult.data||[]) as Receipt[]);
   setNames(Object.fromEntries(((profileResult.data||[]) as {id:string;display_name:string|null;username:string|null}[])
    .map(p=>[p.id,p.display_name||p.username||'RCH player'])));
   setLoading(false);
  })();
  return()=>{alive=false;};
 },[db,runId,uid,revision]);
 const match=matches.find(m=>m.id===selectedMatch);
 const players=match?[...match.home_roster,...match.away_roster]:[];
 const activeReceipt=receipts.find(r=>r.match_id===selectedMatch&&r.profile_id===selectedPlayer);
 function selectMatch(id:string){
  setSelectedMatch(id);setSelectedPlayer('');setStats(empty);setNotice('');setError('');
 }
 function selectPlayer(id:string){
  setSelectedPlayer(id);setStats(empty);setNotice('');setError('');
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!db||busy||!selectedMatch||!selectedPlayer)return;
  const points=Number(stats.points);
  if(stats.points.trim()===''||!Number.isInteger(points)){setError('Record official points; use 0 only when verified.');return;}
  setBusy(true);setError('');setNotice('');
  const data:Record<string,unknown>={
   p_match:selectedMatch,p_player:selectedPlayer,p_points:points,
   p_source_note:sourceNote.trim(),
  };
  for(const item of keys.filter(k=>k.field!=='points')){
   data['p_'+item.field]=optionalNumber(stats[item.field]);
  }
  const {error:failure}=await db.rpc('rch_submit_match_skill_stats',data);
  if(failure)setError(failure.message);
  else{setNotice('Official box score submitted. A different authorized reviewer must certify it.');setStats(empty);setSourceNote('');reload();}
  setBusy(false);
 }
 async function review(approve:boolean){
  if(!db||busy||!activeReceipt)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc('rch_review_match_skill_stats',{
   p_match:activeReceipt.match_id,p_player:activeReceipt.profile_id,p_approve:approve,
  });
  if(failure)setError(failure.message);
  else{setNotice(approve?'Stats independently certified. Skill progress is now eligible.':'Submission rejected for correction.');reload();}
  setBusy(false);
 }
 if(!uid||!authorized)return null;
 return <section aria-label="Skill Engine official game scorekeeping" className="my-6 rounded-3xl border border-[#537693] bg-[#091f35] p-5 text-white sm:p-6">
  <div className="flex items-start gap-3">
   <FaClipboardCheck className="mt-1 shrink-0 text-2xl text-[#f2ce83]"/>
   <div><p className="text-[10px] font-black uppercase tracking-widest text-[#9acaf0]">Official scorekeeper · Skill Engine V2</p>
    <h2 className="mt-2 font-display text-2xl font-black">Match-Level Skill Evidence</h2>
    <p className="mt-2 text-sm leading-6 text-[#b2cee1]">Record each player&apos;s actual stats from a verified game. A different authorized official must approve the evidence. A Run RSVP, personal claim or generic event box score cannot earn a competitive badge.</p>
   </div>
  </div>
  {loading&&<p className="mt-4 text-sm text-[#c4daed]" role="status">Loading official matches…</p>}
  {!loading&&!matches.length&&<p className="mt-4 rounded-xl border border-[#46647f] p-4 text-sm text-[#c2d7e8]">No independently verified matches yet. Finish a real game and confirm the result before recording badge statistics.</p>}
  {error&&<p role="alert" className="mt-4 rounded-xl border border-amber-500/40 p-3 text-sm text-amber-200">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-400/30 p-3 text-sm text-emerald-200">{notice}</p>}
  {!!matches.length&&<form onSubmit={e=>void submit(e)} className="mt-5 space-y-4">
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="block text-xs font-bold">Verified game
     <select value={selectedMatch} onChange={e=>selectMatch(e.target.value)}
      className="mt-2 min-h-11 w-full rounded-xl border border-[#456f90] bg-[#102d47] px-3 text-sm">
      <option value="">Select verified match</option>
      {matches.map(m=><option key={m.id} value={m.id}>{m.game_format} · {m.home_score}–{m.away_score} · {new Date(m.verified_at).toLocaleDateString()}</option>)}
     </select>
    </label>
    <label className="block text-xs font-bold">Verified participant
     <select value={selectedPlayer} onChange={e=>selectPlayer(e.target.value)} disabled={!match}
      className="mt-2 min-h-11 w-full rounded-xl border border-[#456f90] bg-[#102d47] px-3 text-sm disabled:opacity-40">
      <option value="">Select rostered player</option>
      {players.map(p=><option key={p} value={p}>{names[p]||'Verified player'}</option>)}
     </select>
    </label>
   </div>
   {activeReceipt&&<div className="rounded-xl border border-[#426586] bg-[#132d43] p-3 text-xs">
    <p className="font-bold uppercase tracking-wider text-[#e5c17e]">Existing evidence: {activeReceipt.review_status}</p>
    <p className="mt-1 text-[#bed2e2]">{activeReceipt.points} PTS · {activeReceipt.rebounds??'—'} REB · {activeReceipt.assists??'—'} AST</p>
    {activeReceipt.review_status==='pending'&&<div className="mt-3 flex flex-wrap gap-2">
     <button disabled={busy||activeReceipt.recorded_by===uid} type="button" onClick={()=>void review(true)} className="min-h-11 rounded-lg bg-[#91dbbf] px-4 text-xs font-black text-[#092d2b] disabled:opacity-40"><FaCheck className="mr-1 inline"/> Certify independently</button>
     <button disabled={busy||activeReceipt.recorded_by===uid} type="button" onClick={()=>void review(false)} className="min-h-11 rounded-lg border border-[#ac8080] px-4 text-xs font-bold disabled:opacity-40">Reject</button>
     {activeReceipt.recorded_by===uid&&<span className="self-center text-[#c3d4e1]">A different authorized reviewer must approve your entry.</span>}
    </div>}
    {activeReceipt.review_status==='verified'&&<p className="mt-2 text-emerald-200">Locked verified receipt. Corrections require audited staff revocation.</p>}
   </div>}
   {match&&selectedPlayer&&activeReceipt?.review_status!=='verified'&&<div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
     {keys.map(({field,label})=><label className="block text-xs font-bold" key={field}>{label}
      <input type="number" min="0" max="250" step="1" inputMode="numeric" required={field==='points'}
       value={stats[field]} onChange={e=>setStats(s=>({...s,[field]:e.target.value}))}
       placeholder={field==='points'?'Required':'Not tracked'}
       className="mt-2 min-h-11 w-full rounded-xl border border-[#456b8a] bg-[#102d45] px-3 text-sm"/>
     </label>)}
    </div>
    <label className="mt-4 block text-xs font-bold">Official evidence reference (required)
     <textarea value={sourceNote} onChange={e=>setSourceNote(e.target.value)} required minLength={10} maxLength={300}
      placeholder="Identify the official scorebook game, scorer sheet, or certified match evidence."
      rows={2} className="mt-2 w-full rounded-xl border border-[#456b8a] bg-[#102d45] p-3 text-sm"/>
    </label>
    <button disabled={busy||sourceNote.trim().length<10} type="submit"
     className="mt-4 min-h-11 rounded-xl bg-[#f3cb7e] px-5 text-sm font-black text-[#241908] disabled:opacity-40">
     <FaBasketball className="mr-2 inline"/> Submit for independent review
    </button>
    <p className="mt-2 text-xs text-[#a7c1d4]">Leave genuinely untracked stats blank—never substitute a zero. Badges are recalculated from verified match receipts only.</p>
   </div>}
  </form>}
  <p className="mt-5 flex items-center gap-2 text-xs text-[#a3bacd]"><FaShieldHalved/> Final score, roster, on-site check-in, independent review and completed event status are mandatory.</p>
 </section>;
}
