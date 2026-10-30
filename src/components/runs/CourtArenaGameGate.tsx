'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaCalendarDays,FaCrown,FaLocationDot,FaShieldHalved,FaSwords} from 'react-icons/fa6';

type Run={id:string;title:string;starts_at:string;game_format:string;status:string};
export function CourtArenaGameGate({slug,name,locality,controller,registeredCrews,runs,watching,historyRecorded,historyLoading}:{
 slug:string;name:string;locality:string|null;controller:string|null;registeredCrews:number;
 runs:readonly Run[];watching:boolean;historyRecorded:number;historyLoading:boolean
}){
 const next=runs[0]||null;
 return <section className="rch-court-game-gate" aria-label="Court Arena game gateway" data-rch-court-game-gate="true">
  <div className="rch-court-game-title"><span><FaLocationDot aria-hidden="true"/> VERIFIED PARK COURT · {locality||'VIRGINIA'}</span><h2>ENTER THE ARENA</h2><p>{name}</p></div>
  <div className="rch-court-game-grid">
   <div><small>CREW CONTROL</small><strong>{controller||'UNCLAIMED'}</strong><span>Only verified competition can award court control</span></div>
   <div><small>CREWS RANKED HERE</small><strong>{registeredCrews}</strong><span>Recorded court standings</span></div>
   <div><small>UPCOMING HOSTED RUNS</small><strong>{runs.length}</strong><span>Actual scheduled games at this park</span></div>
   <div><small>CAREER CHRONICLES</small><strong>{historyLoading?'—':historyRecorded}</strong><span>Recorded master and takeover events</span></div>
  </div>
  {next?<Link className="rch-court-next-run" href={'/runs/'+encodeURIComponent(next.id)+'?fromCourt='+encodeURIComponent(slug)}>
   <FaBasketball aria-hidden="true"/><span><small>NEXT GAME LISTED AT THIS ARENA</small><strong>{next.title}</strong><span>{new Date(next.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · {next.game_format}</span></span><FaArrowRight aria-hidden="true"/>
  </Link>:<div className="rch-court-game-empty"><FaCalendarDays aria-hidden="true"/><span><strong>NO UPCOMING HOSTED GAME</strong><small>This verified park is not a reservation or proof that players will be there. Start a real Run with a confirmed organizer.</small></span></div>}
  <nav className="rch-court-game-actions" aria-label="Court Arena next moves">
   <Link href={'/runs?create=1&court='+encodeURIComponent(slug)}><FaBasketball aria-hidden="true"/> HOST A GAME</Link>
   <Link href={'/runs?view=list&competition=courts&court='+encodeURIComponent(slug)+'#rch-competition'}><FaSwords aria-hidden="true"/> COMPETE</Link>
   <a href="#rch-court-masters"><FaCrown aria-hidden="true"/> VIEW MASTERS</a>
  </nav>
  <p className="rch-court-game-caution"><FaShieldHalved aria-hidden="true"/> {watching?'Watching this court saves a discovery preference—not a booking or a verified visit.':'Park hours, court access, actual players and event permissions require independent confirmation before traveling.'}</p>
 </section>;
}
