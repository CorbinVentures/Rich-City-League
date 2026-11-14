'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
 FaArrowRight,FaBasketball,FaBell,FaBookOpen,
 FaCompass,FaCrown,FaLocationDot,FaMedal,FaPeopleGroup,FaPlus,
 FaPlay,FaShieldHalved,FaTrophy,FaXmark
} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {weeklyQuestCatalog,worldQuestProgress,worldXpProgress,type WorldJourney} from '@/lib/runs-world-progression';
import type {WorldRun} from '@/lib/runs-world-game';
import './runs-cinematic-home.css';

const INTRO_KEY='rch-runs-bmf-belt-intro-session-v1';
const RUNS_BMF_BELT='/runs/championships/bmf-belt.webp';
const INTRO_HOLD_MS=1050;
const INTRO_IMAGE_FALLBACK_MS=1850;
const INTRO_SPLIT_MS=780;

function formatWhen(value:string){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'Time to be confirmed';
 return date.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET';
}

/** A light, once-per-session title screen that leads straight into real Run play. */
/** RCH Runs' own lightweight championship-belt reveal, matching the PWA opening.
 * Once per session on the Runs game home, and always available through Replay.
 * Never blocks live games, links, deep links, or reduced-motion users. */
export function RunsCinematicIntro({enabled,replayToken}:{enabled:boolean;replayToken:number}){
 const [phase,setPhase]=useState<'done'|'reveal'|'opening'>('done');
 const [imageReady,setImageReady]=useState(false);
 const [imageFailed,setImageFailed]=useState(false);
 const skipRef=useRef<HTMLButtonElement>(null);
 const close=useCallback(()=>{
  setPhase('done');
  try{window.sessionStorage.setItem(INTRO_KEY,'seen');}catch{/* Session storage is optional. */}
 },[]);

 useEffect(()=>{
  if(!enabled){setPhase('done');return;}
  if(replayToken===0){
   try{if(window.sessionStorage.getItem(INTRO_KEY)==='seen')return;}catch{/* Continue when storage is unavailable. */}
  }
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){close();return;}
  setImageReady(false);
  setImageFailed(false);
  setPhase('reveal');
 },[enabled,replayToken,close]);

 useEffect(()=>{
  if(phase!=='reveal')return;
  // Open when the image has had time to paint; never trap visitors on slow networks.
  const timer=window.setTimeout(()=>setPhase('opening'),imageReady||imageFailed?INTRO_HOLD_MS:INTRO_IMAGE_FALLBACK_MS);
  return()=>window.clearTimeout(timer);
 },[phase,imageReady,imageFailed]);

 useEffect(()=>{
  if(phase!=='opening')return;
  const timer=window.setTimeout(close,INTRO_SPLIT_MS);
  return()=>window.clearTimeout(timer);
 },[phase,close]);

 useEffect(()=>{
  if(!enabled)return;
  if(phase==='done')return;
  const previousOverflow=document.body.style.overflow;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){event.preventDefault();skipRef.current?.focus();}
  };
  document.addEventListener('keydown',keyboard);
  skipRef.current?.focus({preventScroll:true});
  return()=>{
   document.removeEventListener('keydown',keyboard);
   document.body.style.overflow=previousOverflow;
   previousFocus?.focus({preventScroll:true});
  };
 },[enabled,phase,close]);

 if(!enabled||phase==='done')return null;
 return <div className={'rch-intro-overlay rch-bmf-opening '+(phase==='opening'?'is-opening':'is-revealing')}
   role="dialog" aria-modal="true" aria-label="Opening RCH Runs">
  <div className="rch-intro-curtain rch-intro-curtain-left" aria-hidden="true"/>
  <div className="rch-intro-curtain rch-intro-curtain-right" aria-hidden="true"/>
  <div className="rch-intro-spotlight" aria-hidden="true"/>
  <div className="rch-intro-belt" aria-hidden="true">
   {imageFailed?
    <div className="rch-intro-fallback"><FaCrown/><strong>RCH RUNS</strong><span>BMF CHAMPION</span></div>:
    <>
     <div className="rch-intro-belt-half rch-intro-belt-left">
      <img src={RUNS_BMF_BELT} alt="" draggable={false} fetchPriority="high"
       onLoad={()=>setImageReady(true)} onError={()=>setImageFailed(true)}/>
     </div>
     <div className="rch-intro-belt-half rch-intro-belt-right">
      <img src={RUNS_BMF_BELT} alt="" draggable={false} fetchPriority="high"
       onError={()=>setImageFailed(true)}/>
     </div>
    </>}
  </div>
  <div className="rch-intro-caption" aria-hidden="true">
   <span>RICH CITY HOOPS PRESENTS</span>
   <strong>RCH RUNS</strong>
   <small>REAL COURTS. REAL COMPETITION. REAL LEGACY.</small>
  </div>
  <button ref={skipRef} type="button" className="rch-intro-skip" onClick={close} aria-label="Skip cinematic opening">
   Skip intro <FaXmark aria-hidden="true"/>
  </button>
 </div>;
}

type PlayerOverview={repBalance:number|null;verifiedGames:number|null;badges:number|null};
type Props={
 city:string|null;
 signedIn:boolean;
 name:string;
 avatar:string|null;
 journey:WorldJourney|null;
 journeyLoading:boolean;
 player:PlayerOverview;
 runs:readonly WorldRun[];
 runsLoading:boolean;
 featuredRunIds:readonly string[];
 onWorld:()=>void;
 onMissions:()=>void;
 onPlayer:()=>void;
 onVault:()=>void;
 onBattle:()=>void;
 onRules:()=>void;
 onReplay:()=>void;
};

export function RunsCinematicHome({
 city,signedIn,name,avatar,journey,journeyLoading,player,runs,runsLoading,featuredRunIds,
 onWorld,onMissions,onPlayer,onVault,onBattle,onRules,onReplay
}:Props){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [statewideRuns,setStatewideRuns]=useState<WorldRun[]>([]);
 const [boardUnavailable,setBoardUnavailable]=useState(false);
 const [verifiedRunIds,setVerifiedRunIds]=useState<Set<string>>(new Set());
 const [verifiedRunsLoading,setVerifiedRunsLoading]=useState(false);
 const [finding,setFinding]=useState(false);
 useEffect(()=>{
  // Public court suggestions are not committed, hosted games. Keep the home
  // board focused on real open Runs even when it has to search statewide.
  if(city||!db){setStatewideRuns([]);setBoardUnavailable(false);setFinding(false);return;}
  let active=true;
  setFinding(true);setBoardUnavailable(false);
  const load=async()=>{
   const {data,error}=await db.from('runs')
    .select('id,title,location,location_slug,starts_at,status,game_format,run_type')
    .eq('status','open').gte('starts_at',new Date().toISOString())
    .order('starts_at',{ascending:true}).limit(500);
   if(error)throw error;
   const candidates=(data||[]) as WorldRun[];
   const ids=candidates.map(run=>run.id);
   if(!ids.length){if(active)setStatewideRuns([]);return;}
   const {data:circuit,error:circuitError}=await db.from('rch_weekend_circuit_events')
    .select('run_id').in('run_id',ids);
   if(circuitError)throw circuitError;
   const suggested=new Set(((circuit||[]) as Array<{run_id:string}>).map(row=>row.run_id));
   if(active)setStatewideRuns(candidates.filter(run=>!suggested.has(run.id)));
  };
  void load().catch(()=>{if(active){setStatewideRuns([]);setBoardUnavailable(true);}})
   .finally(()=>{if(active)setFinding(false);});
  return()=>{active=false;};
 },[db,city]);
 const candidateRuns=city?runs:statewideRuns;
 useEffect(()=>{
  const ids=candidateRuns.map(run=>run.id);
  if(!db||ids.length===0){setVerifiedRunIds(new Set());setVerifiedRunsLoading(false);return;}
  let active=true;
  setVerifiedRunsLoading(true);
  void db.from('rch_run_verifications').select('run_id').in('run_id',ids).eq('verification_status','verified')
   .then(({data,error}:{data:Array<{run_id:string}>|null;error:unknown})=>{
    if(active){setVerifiedRunIds(error?new Set():new Set((data||[]).map(row=>row.run_id)));setVerifiedRunsLoading(false);}
   }).catch(()=>{if(active){setVerifiedRunIds(new Set());setVerifiedRunsLoading(false);}});
  return()=>{active=false;};
 },[db,candidateRuns]);
 const nextRun=candidateRuns.find(run=>run.status==='open')||null;
 const boardLoading=city?runsLoading:finding;
 const progress=journey?.signed_in?worldXpProgress(journey.world_xp):null;
 const missions=weeklyQuestCatalog.slice(0,3);
 const verifiedCount=candidateRuns.filter(run=>run.status==='open'&&verifiedRunIds.has(run.id)).length;
 const nextRunVerified=Boolean(nextRun&&verifiedRunIds.has(nextRun.id));
 const nextRunDouble=Boolean(nextRun&&featuredRunIds.includes(nextRun.id));
 return <section className="rch-gh rch-arcade-home" aria-label="RCH Runs game lobby">
  <header className="rch-gh-top rch-arcade-top">
   <div className="rch-gh-wordmark" aria-label="RCH Runs"><span>RCH</span> <em>RUNS</em><FaCrown aria-hidden="true"/></div>
   <div className="rch-gh-top-actions">
    <span className="rch-arcade-location"><i aria-hidden="true"/>{city||'VIRGINIA'}</span>
    <button type="button" className="rch-gh-guide" onClick={onRules}><FaBookOpen aria-hidden="true"/><span>Tutorials</span></button>
    <button type="button" className="rch-gh-icon rch-arcade-replay" onClick={onReplay} aria-label="Replay the Runs opening"><FaPlay aria-hidden="true"/></button>
    <Link href="/notifications" aria-label="Open notifications" className="rch-gh-icon"><FaBell aria-hidden="true"/></Link>
    <button type="button" onClick={onPlayer} className="rch-gh-avatar" aria-label="Open My Player">
     {avatar?<img src={avatar} alt=""/>:<FaCrown aria-hidden="true"/>}
    </button>
   </div>
  </header>

  <section className="rch-arcade-hero" aria-labelledby="rch-arcade-title">
   <div className="rch-arcade-scene" aria-hidden="true"/>
   <div className="rch-arcade-hero-top"><span><FaBasketball aria-hidden="true"/> RCH RUNS / PLAYER 1</span><span>COURT WORLD · {city||'VA'}</span></div>
   <div className="rch-arcade-copy">
    <span className="rch-arcade-eyebrow">THE COURT IS OPEN</span>
    <h1 id="rch-arcade-title">RUN WITH<br/><em>YOUR PEOPLE.</em></h1>
    <p>Find a real game near you, or set the next one in motion.</p>
    <div className="rch-arcade-actions">
     <Link href="/runs?view=list#rch-upcoming-runs" className="rch-arcade-primary"><FaBasketball aria-hidden="true"/> FIND A RUN <FaArrowRight aria-hidden="true"/></Link>
     <Link href="/runs?create=1" className="rch-arcade-secondary"><FaPlus aria-hidden="true"/> HOST PICKUP</Link>
     <Link href="/runs?view=world&amp;tutorial=1" className="rch-arcade-secondary"><FaBookOpen aria-hidden="true"/> HOW TO PLAY</Link>
    </div>
   </div>
   <button type="button" onClick={onPlayer} className="rch-arcade-player-hud" aria-label="Open My Player">
    <span className="rch-arcade-player-avatar">{avatar?<img src={avatar} alt=""/>:<FaCrown aria-hidden="true"/>}</span>
    <span className="rch-arcade-player-copy"><small>MY PLAYER</small><strong>{signedIn?name:'CREATE YOUR PLAYER'}</strong><span>{progress?'HOOPER LVL '+progress.level:journeyLoading?'SYNCING PLAYER…':signedIn?'YOUR RCH PLAYER':'FREE PROFILE · START PLAYING'}</span>
     {progress&&<progress max={progress.toNext} value={progress.within} aria-label="World XP toward next level"/>}
    </span>
    <FaArrowRight className="rch-arcade-hud-arrow" aria-hidden="true"/>
   </button>
   <div className="rch-arcade-pixel-label" aria-hidden="true">RVA · 804</div>
  </section>

  <div className="rch-arcade-player-stats" aria-label="Your Runs progress">
   <div><FaShieldHalved aria-hidden="true"/><strong>{player.verifiedGames??'—'}</strong><small>VERIFIED GAMES</small></div>
   <div><FaCrown aria-hidden="true"/><strong>{player.repBalance===null?'—':player.repBalance.toLocaleString()}</strong><small>REP</small></div>
   <div><FaMedal aria-hidden="true"/><strong>{player.badges??'—'}</strong><small>BADGES</small></div>
  </div>

  {nextRun?<Link className="rch-arcade-next" href={'/runs/'+encodeURIComponent(nextRun.id)}>
   <span className="rch-arcade-next-icon"><FaBasketball aria-hidden="true"/></span>
   <span className="rch-arcade-next-copy"><small>{nextRunVerified?'RCH VERIFIED RUN':'UP NEXT · REAL RUN'}</small><strong>{nextRun.title}</strong><span><FaLocationDot aria-hidden="true"/>{nextRun.location||'Court details in event'} · {formatWhen(nextRun.starts_at)}</span></span>
   {nextRunDouble&&<span className="rch-arcade-next-bonus">2× VERIFIED REP</span>}
   <span className="rch-arcade-next-format">{nextRun.game_format||'PICKUP'}</span><FaArrowRight className="rch-arcade-next-arrow" aria-hidden="true"/>
  </Link>:<div className="rch-arcade-empty" role="status">
   <span className="rch-arcade-next-icon"><FaBasketball aria-hidden="true"/></span>
   <span><strong>{boardLoading?'Checking the game board…':boardUnavailable?'Game listings are temporarily unavailable.':'No open games on the board yet.'}</strong><small>{boardLoading||boardUnavailable?'':`Host the first pickup in ${city||'Virginia'} and bring your crew.`}</small></span>
   {!boardLoading&&<Link href="/runs?create=1">HOST A RUN <FaArrowRight aria-hidden="true"/></Link>}
  </div>}

  <nav className="rch-arcade-doors" aria-label="Choose a Runs mode">
   <button type="button" onClick={onWorld}><span className="rch-arcade-door-art map"><FaCompass aria-hidden="true"/></span><span><small>EXPLORE</small><strong>COURT MAP</strong></span><FaArrowRight aria-hidden="true"/></button>
   <button type="button" onClick={onBattle}><span className="rch-arcade-door-art crown"><FaCrown aria-hidden="true"/></span><span><small>COMPETE</small><strong>TAKEOVER</strong></span><FaArrowRight aria-hidden="true"/></button>
   <Link href="/runs?view=list&verified=1#rch-upcoming-runs"><span className="rch-arcade-door-art verified"><FaShieldHalved aria-hidden="true"/></span><span><small>{verifiedRunsLoading?'CHECKING':verifiedCount+' LIVE'}</small><strong>VERIFIED RUNS</strong></span><FaArrowRight aria-hidden="true"/></Link>
   <Link href="/runs/partners"><span className="rch-arcade-door-art crew"><FaPeopleGroup aria-hidden="true"/></span><span><small>OFFICIAL 1V1</small><strong>SYB + PARTNERS</strong></span><FaArrowRight aria-hidden="true"/></Link>
   <Link href="/runs?view=world&mode=season"><span className="rch-arcade-door-art trophy"><FaTrophy aria-hidden="true"/></span><span><small>CHASE A TITLE</small><strong>RANKED CIRCUIT</strong></span><FaArrowRight aria-hidden="true"/></Link>
   <button type="button" onClick={onVault}><span className="rch-arcade-door-art medal"><FaMedal aria-hidden="true"/></span><span><small>YOUR COLLECTION</small><strong>BADGE VAULT</strong></span><FaArrowRight aria-hidden="true"/></button>
  </nav>

  <details className="rch-arcade-missions">
   <summary><span><FaBookOpen aria-hidden="true"/> DAILY MISSIONS</span><small>Open progress board <FaArrowRight aria-hidden="true"/></small></summary>
   <div className="rch-arcade-mission-grid">{missions.map(mission=>{
    const current=journey?.signed_in?Math.min(mission.target,worldQuestProgress(journey,mission.key)):0;
    return <button type="button" key={mission.key} onClick={onMissions}>
     <span aria-hidden="true">{mission.icon}</span><strong>{mission.title}</strong><small>{current}/{mission.target}</small>
     <progress max={mission.target} value={current} aria-label={mission.title+' progress'}/>
    </button>;
   })}</div>
  </details>
 </section>;
}
