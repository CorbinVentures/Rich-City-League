'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaPeopleGroup,FaPlus,FaTrophy} from 'react-icons/fa6';
import {findPlayableRuns,isRookieFriendly,lobbySnapshot,type GameplayRun} from '@/lib/runs-gameplay-readiness';

type Props={
 runs:readonly GameplayRun[];loading:boolean;rookieOnly:boolean;onRookieChange:(next:boolean)=>void;
 soloOnly:boolean;onSoloChange:(next:boolean)=>void;
};
export function RunQuickPlay({runs,loading,rookieOnly,onRookieChange,soloOnly,onSoloChange}:Props){
 const available=findPlayableRuns(runs);
 const featured=available.filter(run=>!rookieOnly||isRookieFriendly(run)).slice(0,2);
 return <section aria-labelledby="rch-quick-play-title" className="mb-5 rounded-2xl border border-[#426d91] bg-[#091f33] p-4 text-white sm:p-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#95cdf1]">RCH Runs / Quick Play</p>
    <h2 id="rch-quick-play-title" className="mt-1 text-xl font-black uppercase sm:text-2xl">Your next real game</h2>
    <p className="mt-1 text-xs leading-5 text-[#b8d2e6]">Browse hosted games, join a roster, or start one. No simulated matchmaking.</p>
   </div>
   <Link href="/runs?create=1" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#92b9d9] px-4 text-sm font-bold"><FaPlus aria-hidden="true"/> Host Game</Link>
  </div>
  <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick Play preferences">
   <button type="button" aria-pressed={rookieOnly} onClick={()=>onRookieChange(!rookieOnly)} className={'min-h-11 rounded-lg border px-4 text-xs font-bold '+(rookieOnly?'border-[#a8d7fa] bg-[#1a567d] text-white':'border-[#406c8e] text-[#bcd8ed]')}>Rookie friendly {rookieOnly?'✓':''}</button>
   <button type="button" aria-pressed={soloOnly} onClick={()=>onSoloChange(!soloOnly)} className={'min-h-11 rounded-lg border px-4 text-xs font-bold '+(soloOnly?'border-[#a8d7fa] bg-[#1a567d] text-white':'border-[#406c8e] text-[#bcd8ed]')}>Solo spots {soloOnly?'✓':''}</button>
  </div>
  <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-live="polite">
   {loading?<p className="text-sm text-[#c1d8e8]">Checking real hosted Runs…</p>:
   featured.length?featured.map(run=>{
    const roster=lobbySnapshot({format:run.game_format,registered:run.players?.length??0,capacity:run.max_players,status:run.status,suggested:false,past:false});
    return <Link key={run.id} href={'/runs/'+encodeURIComponent(run.id)} className="group rounded-xl border border-[#3b698d] bg-[#0f2d45] p-4 hover:border-[#8dc8ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
     <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase text-[#9bd0f4]"><FaBasketball className="mr-1 inline" aria-hidden="true"/>{run.game_format} · {isRookieFriendly(run)?'Open to newer players':'Competitive'}</span><FaArrowRight aria-hidden="true"/></div>
     <h3 className="mt-2 text-base font-black">{run.title}</h3>
     <p className="mt-1 text-xs text-[#c0d9ec]">{run.location} · {new Date(run.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} ET</p>
     <p className="mt-3 text-xs font-bold text-[#cde5f6]">{run.players?.length??0}/{run.max_players} registered · {roster.state==='forming'?roster.title:'View roster'}</p>
     <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#213c50]" role="progressbar" aria-label={'Roster target for '+run.title} aria-valuenow={roster.percentage} aria-valuemin={0} aria-valuemax={100}><div style={{width:roster.percentage+'%'}} className="h-full rounded-full bg-[#78b9e9]"/></div>
    </Link>;
   }):<div className="rounded-xl border border-dashed border-[#4c6e86] p-4 sm:col-span-2">
      <p className="font-black">{rookieOnly&&available.length?'No rookie-friendly games match yet.':'No hosted games accepting RSVPs right now.'}</p>
      <p className="mt-1 text-xs text-[#b9d1e2]">An empty lobby is not a game. Create a real Run, invite local players, or check back when an organizer posts one.</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold"><Link href="/runs?create=1" className="text-[#a8d8f8] underline">Host the first Run</Link><Link href="/runs/partners" className="text-[#a8d8f8] underline">Find organizers</Link></div>
   </div>}
  </div>
  <div className="mt-4 flex flex-wrap gap-4 border-t border-[#294963] pt-4 text-xs font-bold text-[#c0d9ec]">
   <Link href="/crews?intent=mine" className="inline-flex min-h-10 items-center gap-2"><FaPeopleGroup aria-hidden="true"/> Build a crew</Link>
   <Link href="/runs?view=world&mode=missions" className="inline-flex min-h-10 items-center gap-2"><FaTrophy aria-hidden="true"/> Weekly progress</Link>
  </div>
 </section>;
}
