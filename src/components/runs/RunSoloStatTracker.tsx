'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import Link from 'next/link';
import {FaBasketball,FaBolt} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {useAuth} from '@/hooks/useAuth';

type StatKey='points'|'rebounds'|'assists'|'three_made'|'three_attempted'|'steals'|'blocks'|'turnovers'|'defensive_stops';
type StatValues=Record<StatKey,string>;
type Entry=Record<StatKey,number>&{game_number:number;created_at:string};
const fields:{key:StatKey;label:string}[]=[
 {key:'points',label:'Points'},{key:'rebounds',label:'Rebounds'},
 {key:'assists',label:'Assists'},{key:'three_made',label:'3PT made'},
 {key:'three_attempted',label:'3PT attempted'},{key:'steals',label:'Steals'},
 {key:'blocks',label:'Blocks'},{key:'turnovers',label:'Turnovers'},
 {key:'defensive_stops',label:'Defensive stops'},
];
const blankStats=():StatValues=>({
 points:'0',rebounds:'0',assists:'0',three_made:'0',three_attempted:'0',
 steals:'0',blocks:'0',turnovers:'0',defensive_stops:'0',
});
const toForm=(entry?:Entry):StatValues=>Object.fromEntries(
 fields.map(({key})=>[key,String(entry?.[key]??0)])
) as StatValues;

export function RunSoloStatTracker({runId,startsAt,eligible}:{runId:string;startsAt:string;eligible:boolean}){
 const {user}=useAuth();
 const uid=user?.id;
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [entries,setEntries]=useState<Entry[]>([]);
 const [gameNumber,setGameNumber]=useState('1');
 const [stats,setStats]=useState<StatValues>(blankStats);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const start=Date.parse(startsAt);
 const opensAt=start-2*60*60*1000;
 const closesAt=start+72*60*60*1000;
 const now=Date.now();
 const withinWindow=Number.isFinite(start)&&now>=opensAt&&now<=closesAt;
 const signInHref='/auth/sign-in?next='+encodeURIComponent('/runs/'+runId+'#rch-solo-stats');

 const reload=useCallback(async()=>{
  if(!db||!uid||!eligible){setEntries([]);setLoading(false);return;}
  setLoading(true);
  const {data,error:failure}=await db.from('rch_solo_run_stat_entries')
   .select('game_number,points,rebounds,assists,three_made,three_attempted,steals,blocks,turnovers,defensive_stops,created_at')
   .eq('run_id',runId).eq('profile_id',uid).order('game_number');
  if(failure)setError(failure.message);
  else{
   const rows=(data??[]) as Entry[];
   setEntries(rows);
   setGameNumber(current=>{
    if(rows.some(row=>row.game_number===Number(current)))return current;
    return String(Math.min(20,rows.length?Math.max(...rows.map(row=>row.game_number))+1:1));
   });
  }
  setLoading(false);
 },[db,eligible,runId,uid]);

 useEffect(()=>{void reload();},[reload]);

 function selectGame(value:string){
  setGameNumber(value);
  setStats(toForm(entries.find(row=>row.game_number===Number(value))));
  setError('');
  setNotice('');
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!db||!uid||!eligible||!withinWindow||busy)return;
  const values=Object.fromEntries(fields.map(({key})=>[key,Number(stats[key])])) as Record<StatKey,number>;
  if(fields.some(({key})=>!Number.isInteger(values[key])||values[key]<0||values[key]>250)){
   setError('Use whole numbers from 0 to 250 for each stat.');return;
  }
  if(values.three_made>values.three_attempted){
   setError('3PT made cannot be higher than 3PT attempted.');return;
  }
  setBusy(true);setError('');setNotice('');
  const {data,error:failure}=await db.rpc('rch_submit_solo_run_stats',{
   p_run:runId,p_game_number:Number(gameNumber),
   p_points:values.points,p_rebounds:values.rebounds,p_assists:values.assists,
   p_three_made:values.three_made,p_three_attempted:values.three_attempted,
   p_steals:values.steals,p_blocks:values.blocks,p_turnovers:values.turnovers,
   p_defensive_stops:values.defensive_stops,
  });
  if(failure)setError(failure.message);
  else{
   const xp=Number(data?.[0]?.xp_awarded??0);
   setNotice(xp>0
    ?'Stats saved. +'+xp+' XP and +'+xp+' REP wallet credit for this Run; additional game logs do not award more.'
    :'Stats saved. Your once-per-Run XP and REP wallet credit were already awarded.');
   await reload();
  }
  setBusy(false);
 }

 return <section id="rch-solo-stats" aria-label="Solo self-reported Run stats"
  className="my-6 rounded-3xl border border-[#696969] bg-[#111111] p-5 text-white sm:p-6">
  <div className="flex items-start gap-3">
   <FaBasketball className="mt-1 shrink-0 text-2xl text-[#d0d0d0]"/>
   <div>
    <p className="text-[10px] font-black uppercase tracking-widest text-[#d0d0d0]">Solo player tracker · self-reported</p>
    <h2 className="mt-2 font-display text-2xl font-black">Track your stats</h2>
    <p className="mt-2 text-sm leading-6 text-[#d2d2d2]">Log your own line even if you are the only RCH player at the Run. No review is required. These stats stay labeled self-reported, count toward official Runs stats and stat rankings, and earn REP wallet credit through the Run XP reward. They do not unlock badges.</p>
   </div>
  </div>

  <div className="mt-4 rounded-2xl border border-[#777777]/40 bg-white/[.035] p-4">
   <p className="flex items-center gap-2 text-sm font-black text-white"><FaBolt className="text-[#d4d4d4]"/> XP + REP wallet</p>
   <p className="mt-1 text-sm leading-5 text-[#c8c8c8]">Earn 15 XP and 15 REP wallet credit once for this hosted Run. You can save up to 20 personal game lines; later saves and edits do not add more.</p>
  </div>

  {!uid
   ?<div className="mt-4"><p className="text-sm text-[#c9c9c9]">Sign in and join this Run to use your personal stat tracker.</p><Link href={signInHref} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#d4d4d4] px-4 text-sm font-black text-[#151515]">Sign in to track stats</Link></div>
   :!eligible
    ?<p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-[#cecece]">Join this Run or check in before saving your own stats.</p>
    :!withinWindow
     ?<p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-[#cecece]">{now<opensAt?'Personal stats open two hours before the Run.':'This Run’s personal stat window has closed.'} Entry stays open until 72 hours after the Run starts.</p>
     :<div className="mt-5">
      {loading?<p role="status" className="text-sm text-[#c9c9c9]">Loading your saved lines…</p>
       :<form onSubmit={event=>void submit(event)} className="space-y-4">
        <label className="block text-sm font-bold">Game number
         <select value={gameNumber} onChange={event=>selectGame(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-[#686868] bg-[#222222] px-3 text-sm sm:max-w-xs">
          {Array.from({length:20},(_,index)=>index+1).map(number=><option key={number} value={number}>
           Game {number}{entries.some(row=>row.game_number===number)?' · saved':''}
          </option>)}
         </select>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
         {fields.map(({key,label})=><label className="block text-sm font-bold" key={key}>{label}
          <input type="number" min="0" max="250" step="1" inputMode="numeric" required
           value={stats[key]} onChange={event=>setStats(current=>({...current,[key]:event.target.value}))}
           className="mt-2 min-h-11 w-full rounded-xl border border-[#686868] bg-[#222222] px-3 text-sm"/>
         </label>)}
        </div>
        <button type="submit" disabled={busy}
         className="min-h-11 rounded-xl bg-[#d4d4d4] px-5 text-sm font-black text-[#151515] disabled:opacity-50">
         {busy?'Saving…':entries.some(row=>row.game_number===Number(gameNumber))?'Update my stats':'Save my stats'}
        </button>
       </form>}
      {error&&<p role="alert" className="mt-3 rounded-xl border border-red-500/30 p-3 text-sm text-red-200">{error}</p>}
      {notice&&<p role="status" className="mt-3 rounded-xl border border-[#777777]/40 p-3 text-sm text-[#eeeeee]">{notice}</p>}
      <div className="mt-5 space-y-2">
       <h3 className="text-sm font-black uppercase tracking-wider text-[#d0d0d0]">Your self-reported lines</h3>
       {entries.length
        ?entries.map(entry=><article key={entry.game_number} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3">
          <div><p className="text-sm font-bold">Game {entry.game_number} · Self-reported</p><p className="mt-1 text-xs text-[#c4c4c4]">{entry.points} PTS · {entry.rebounds} REB · {entry.assists} AST · {entry.steals} STL · {entry.blocks} BLK</p></div>
          <button type="button" onClick={()=>selectGame(String(entry.game_number))} className="min-h-10 rounded-lg border border-white/20 px-3 text-xs font-bold">Edit line</button>
         </article>)
        :<p className="text-sm text-[#bdbdbd]">You have not saved stats for this Run yet.</p>}
      </div>
     </div>}
 </section>;
}
