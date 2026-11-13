'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball} from 'react-icons/fa6';
import {findPlayableRuns,isRookieFriendly,type GameplayRun} from '@/lib/runs-gameplay-readiness';

type Props={
 runs:readonly GameplayRun[];loading:boolean;rookieOnly:boolean;onRookieChange:(next:boolean)=>void;
 soloOnly:boolean;onSoloChange:(next:boolean)=>void;
};
export function RunQuickPlay({runs,loading,rookieOnly,onRookieChange,soloOnly,onSoloChange}:Props){
 const available=findPlayableRuns(runs);
 const featured=available.filter(run=>!rookieOnly||isRookieFriendly(run)).slice(0,2);
 return <section aria-labelledby="rch-quick-play-title" className="rch-quickplay-board">
  <header className="rch-quickplay-head">
   <div><span>RUN BOARD · OPEN GAMES</span><h2 id="rch-quick-play-title">Pick your next run</h2></div>
  </header>
  <div className="rch-quickplay-filters" role="group" aria-label="Run preferences">
   <button type="button" aria-pressed={rookieOnly} onClick={()=>onRookieChange(!rookieOnly)}>{rookieOnly?'✓ ':''}Rookie friendly</button>
   <button type="button" aria-pressed={soloOnly} onClick={()=>onSoloChange(!soloOnly)}>{soloOnly?'✓ ':''}Solo spots</button>
  </div>
  <div className="rch-quickplay-cards" aria-live="polite">
   {loading?<p role="status" className="rch-quickplay-empty">Checking upcoming games…</p>:
   featured.length?featured.map(run=>{
    const registered=run.players?.length??0;
    const openSpots=Math.max(0,run.max_players-registered);
    return <Link key={run.id} href={'/runs/'+encodeURIComponent(run.id)} className="rch-quickplay-card">
     <span className="rch-quickplay-game-icon"><FaBasketball aria-hidden="true"/></span>
     <span className="rch-quickplay-card-top"><small>{run.game_format} · {openSpots} SPOTS OPEN</small><FaArrowRight aria-hidden="true"/></span>
     <strong>{run.title}</strong>
     <span className="rch-quickplay-place">{run.location}</span>
     <span className="rch-quickplay-time">{new Date(run.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} ET · {registered} joined</span>
    </Link>;
   }):<div className="rch-quickplay-empty">
    <span className="rch-quickplay-empty-ball"><FaBasketball aria-hidden="true"/></span>
    <span><strong>{rookieOnly&&available.length?'No beginner-friendly runs right now.':'No open games on the board.'}</strong><small>Start a pickup and bring your crew.</small></span>
    <Link href="/runs?create=1">HOST A RUN <FaArrowRight aria-hidden="true"/></Link>
   </div>}
  </div>
 </section>;
}
