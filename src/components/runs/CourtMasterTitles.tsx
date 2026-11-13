'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaCrown,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';

type Belt={division:string;holder_id:string;player_name:string;since_at:string;defenses:number};
type Master={division:string;profile_id:string;player_name:string;rank:number;games:number;is_master:boolean};
type Challenge={id:string;division:string;run_id:string;challenger_id:string;defender_id:string;status:string};
type Run={id:string;title:string;game_format:string;starts_at:string};
const divisions=['1v1','2v2','3v3'] as const;

export function CourtMasterTitles({court}:{court:string}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [belts,setBelts]=useState<Belt[]>([]);
 const [ladder,setLadder]=useState<Master[]>([]);
 const [challenges,setChallenges]=useState<Challenge[]>([]);
 const [runs,setRuns]=useState<Run[]>([]);
 const [selectedRuns,setSelectedRuns]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [available,setAvailable]=useState(true);
 const [reload,setReload]=useState(0);
 const load=useCallback(async()=>{
  if(!db||!court)return;
  const [a,b,c,d]=await Promise.all([
   db.rpc('get_rch_court_master_belts',{p_court:court}),
   db.rpc('get_rch_court_masters',{p_court:court}),
   db.from('rch_court_master_challenges').select('id,division,run_id,challenger_id,defender_id,status')
     .eq('court_slug',court).in('status',['requested','accepted']).limit(5),
   db.from('runs').select('id,title,game_format,starts_at').eq('location_slug',court)
     .eq('run_type','competitive').in('status',['open','full'])
     .gte('starts_at',new Date(Date.now()-2*3600000).toISOString())
     .lte('starts_at',new Date(Date.now()+30*86400000).toISOString())
     .order('starts_at').limit(40),
  ]);
  setAvailable(!a.error);
  setBelts((a.data??[]) as Belt[]);setLadder((b.data??[]) as Master[]);
  setChallenges((c.data??[]) as Challenge[]);setRuns((d.data??[]) as Run[]);
 },[db,court]);
 useEffect(()=>{void load();},[load,reload]);
 const act=async(fn:string,args:Record<string,unknown>,success:string)=>{
  if(!db||busy)return;
  setBusy(true);setError('');setNotice('');
  const {error:failure}=await db.rpc(fn,args);
  if(failure)setError(failure.message);
  else{setNotice(success);setReload(v=>v+1);}
  setBusy(false);
 };
 if(!available||!court)return null;
 return <section aria-label="Certified Court Master Championship" className="mt-5 overflow-hidden rounded-2xl border border-[#7a7a7a] bg-[linear-gradient(135deg,#232323,#252525)] p-4 text-white sm:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#e3e3e3]"><FaCrown/> RCH · Court Crowns</p>
     <h3 className="mt-2 text-xl font-black uppercase">Take the Throne</h3>
     <p className="mt-2 max-w-2xl text-xs leading-5 text-[#d5d5d5]">Each court has three independently defended individual titles. The statistical ladder establishes qualified contenders; only an accepted, officiated and verified championship game transfers a crown.</p></div>
    <FaTrophy className="text-3xl text-[#c6c6c6]"/>
   </div>
   {error&&<p role="alert" className="mt-3 rounded-lg border border-gray-400/40 p-3 text-xs text-gray-100">{error}</p>}
   {notice&&<p role="status" className="mt-3 rounded-lg border border-[#909090] p-3 text-xs text-[#f0f0f0]">{notice}</p>}
   <div className="mt-5 grid gap-3 lg:grid-cols-3">
    {divisions.map(division=>{
     const belt=belts.find(x=>x.division===division);
     const provisional=ladder.find(x=>x.division===division&&x.is_master);
     const holder=belt?.holder_id||provisional?.profile_id;
     const holderName=belt?.player_name||provisional?.player_name;
     const challenge=challenges.find(x=>x.division===division);
     const eligible=ladder.some(x=>x.division===division&&x.profile_id===user?.id&&x.rank<=3&&x.games>=3);
     const canChallenge=Boolean(user?.id&&holder&&holder!==user.id&&eligible&&!challenge);
     const canAnswer=Boolean(user?.id&&challenge?.status==='requested'&&challenge.defender_id===user.id);
     const scheduled=runs.filter(r=>r.game_format===division);
     return <article key={division} className="rounded-xl border border-[#707070] bg-[#222222]/90 p-4">
      <div className="flex items-center justify-between"><strong className="text-xl font-black">{division}</strong><FaCrown className="text-[#dddddd]"/></div>
      <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-[#dbdbdb]">{belt?'Certified Title Holder':holder?'Eligible founding champion':'Crown unclaimed'}</p>
      <h4 className="mt-1 truncate text-lg font-black">{holderName||'No champion yet'}</h4>
      <p className="mt-1 text-[11px] text-[#c9c9c9]">{belt?belt.defenses+' verified title defense(s)':'Crown established after qualifying verified games'}</p>
      {challenge&&<div className="mt-3 rounded-lg border border-[#6c6c6c] bg-[#303030] p-3 text-xs">
       <span className="font-black text-[#e1e1e1]">{challenge.status==='accepted'?'TITLE FIGHT LOCKED':'CHALLENGE PENDING'}</span>
       <p className="mt-1 text-[#c5c5c5]">A signed-up challenger has called out the reigning Master.</p>
       {canAnswer&&<div className="mt-3 flex flex-wrap gap-2">
         <button disabled={busy} onClick={()=>void act('rch_answer_court_master_duel',{p_challenge:challenge.id,p_accept:true},'Defense accepted. An independent official must certify the match.')} className="min-h-10 rounded-lg bg-[#cccccc] px-3 text-xs font-black text-[#1c1c1c] disabled:opacity-50">Accept defense</button>
         <button disabled={busy} onClick={()=>void act('rch_answer_court_master_duel',{p_challenge:challenge.id,p_accept:false},'Challenge declined.')} className="min-h-10 rounded-lg border border-[#909090] px-3 text-xs font-bold disabled:opacity-50">Decline</button>
       </div>}
       {canAnswer&&<p className="mt-2 text-[10px] text-[#bdbdbd]">Join the challenged Run before accepting.</p>}
      </div>}
      {canChallenge&&<div className="mt-4 border-t border-[#666666] pt-3">
       <label className="text-xs font-bold text-[#dadada]">Choose the title Run
        <select value={selectedRuns[division]||''} onChange={e=>setSelectedRuns(v=>({...v,[division]:e.target.value}))} className="mt-2 min-h-11 w-full rounded-lg border border-[#7c7c7c] bg-[#1a1a1a] px-2 text-xs text-white">
         <option value="">Choose an upcoming Run</option>
         {scheduled.map(r=><option key={r.id} value={r.id}>{r.title} · {new Date(r.starts_at).toLocaleDateString()}</option>)}
        </select></label>
       <button disabled={busy||!selectedRuns[division]} onClick={()=>void act('rch_request_court_master_duel',{p_court:court,p_division:division,p_run:selectedRuns[division]},'Title challenge requested. Awaiting Master acceptance.')} className="mt-3 min-h-10 rounded-lg bg-[#cccccc] px-3 text-xs font-black text-[#191919] disabled:opacity-40">Challenge the Master</button>
       <p className="mt-2 text-[10px] text-[#c6c6c6]">You must already be registered for that Run. Court top-three challengers need three verified games across two sessions.</p>
      </div>}
      {!challenge&&!eligible&&user?.id&&holder&&holder!==user.id&&<p className="mt-3 text-xs text-[#c0c0c0]">Climb this court&apos;s verified leaderboard to unlock a title fight.</p>}
    </article>;
    })}
   </div>
   <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#cccccc]"><FaShieldHalved className="mt-1 shrink-0"/> Champion title lineage is stored independently of rating. A non-title game may change ranking, but not an existing crown.</p>
 </section>;
}
