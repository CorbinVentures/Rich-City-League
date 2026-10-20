'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {
 FaArrowRight,FaBasketball,FaBell,FaBookOpen,FaCalendarDays,
 FaCompass,FaCrown,FaLocationDot,FaMedal,FaPeopleGroup,
 FaPlay,FaShieldHalved,FaTrophy,FaXmark
} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {weeklyQuestCatalog,worldQuestProgress,worldXpProgress,type WorldJourney} from '@/lib/runs-world-progression';
import type {WorldRun} from '@/lib/runs-world-game';
import './runs-cinematic-home.css';

const INTRO_KEY='rch-runs-cinematic-intro-session-v1';
const RULES_KEY='rch-runs-rules-intro-session-v1';

function formatWhen(value:string){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return 'Time to be confirmed';
 return date.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET';
}

/** A skippable, once-per-session visual entrance. It does not alter any game data. */
export function RunsCinematicIntro({enabled,replayToken}:{enabled:boolean;replayToken:number}){
 const [step,setStep]=useState<'done'|'logo'|'world'>('done');
 const skipRef=useRef<HTMLButtonElement>(null);
 const close=useCallback(()=>{
  setStep('done');
  try{window.sessionStorage.setItem(INTRO_KEY,'seen');}catch{/* Optional session storage. */}
 },[]);
 useEffect(()=>{
  if(!enabled)return;
  let rulesSeen=true,alreadySeen=false;
  try{
   rulesSeen=window.sessionStorage.getItem(RULES_KEY)==='seen';
   alreadySeen=window.sessionStorage.getItem(INTRO_KEY)==='seen';
  }catch{/* Storage may be unavailable. */}
  if(!rulesSeen)return;
  if(replayToken===0&&alreadySeen)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   setStep('done');
   try{window.sessionStorage.setItem(INTRO_KEY,'seen');}catch{/* Optional. */}
   return;
  }
  setStep('logo');
  const next=window.setTimeout(()=>setStep('world'),1450);
  const done=window.setTimeout(()=>{
   setStep('done');
   try{window.sessionStorage.setItem(INTRO_KEY,'seen');}catch{/* Optional. */}
  },2650);
  return()=>{window.clearTimeout(next);window.clearTimeout(done);};
 },[enabled,replayToken]);
 useEffect(()=>{
  if(!enabled||step==='done')return;
  const prevOverflow=document.body.style.overflow;
  const prevFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  const keyboard=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){event.preventDefault();skipRef.current?.focus();}
  };
  document.addEventListener('keydown',keyboard);
  skipRef.current?.focus();
  return()=>{
   document.removeEventListener('keydown',keyboard);
   document.body.style.overflow=prevOverflow;
   prevFocus?.focus({preventScroll:true});
  };
 },[enabled,step,close]);
 if(!enabled||step==='done')return null;
 return <div className={'rch-intro-overlay stage-'+step} role="dialog" aria-modal="true" aria-label="Entering RCH Runs">
  <div className="rch-intro-court" aria-hidden="true"/>
  <div className="rch-intro-stage" aria-live="off">
   <span className="rch-intro-crown" aria-hidden="true"><FaCrown/></span>
   <p className="rch-intro-logo">RCH <em>RUNS</em></p>
   <div className="rch-intro-pulse" aria-hidden="true"><FaBasketball/></div>
   <strong>{step==='logo'?'THE REAL-WORLD BASKETBALL GAME':'VIRGINIA BUILDS DIFFERENT.'}</strong>
   <span>REAL RUNS · REAL HOOPERS · RICH CITY</span>
  </div>
  <button ref={skipRef} type="button" className="rch-intro-skip" onClick={close} aria-label="Skip cinematic opening">Skip intro <FaXmark aria-hidden="true"/></button>
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
 city,signedIn,name,avatar,journey,journeyLoading,player,runs,featuredRunIds,
 onWorld,onMissions,onPlayer,onVault,onBattle,onRules,onReplay
}:Props){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [statewideRuns,setStatewideRuns]=useState<WorldRun[]>([]);
 const [finding,setFinding]=useState(false);
 useEffect(()=>{
  // The court network is city-scoped. Show real, upcoming public listings for statewide visitors.
  if(city||!db){setStatewideRuns([]);return;}
  let active=true;
  setFinding(true);
  void db.from('runs')
   .select('id,title,location,location_slug,starts_at,status,game_format,run_type')
   .eq('status','open').gte('starts_at',new Date().toISOString())
   .order('starts_at',{ascending:true}).limit(8)
   .then(({data}:{data:WorldRun[]|null})=>{if(active)setStatewideRuns(data||[]);})
   .catch(()=>{if(active)setStatewideRuns([]);})
   .finally(()=>{if(active)setFinding(false);});
  return()=>{active=false;};
 },[db,city]);
 const nextRun=(city?runs:statewideRuns).find(run=>run.status==='open')||null;
 const progress=journey?.signed_in?worldXpProgress(journey.world_xp):null;
 const displayLevel=progress?.level??null;
 const doubleRep=Boolean(nextRun&&featuredRunIds.includes(nextRun.id));
 const missions=weeklyQuestCatalog.slice(0,3);
 const nextHref=nextRun?'/runs/'+encodeURIComponent(nextRun.id):'/runs?view=list#rch-upcoming-runs';
 return <section className="rch-gh" aria-label="Runs Game Home">
  <header className="rch-gh-top">
   <div className="rch-gh-wordmark" aria-label="RCH Runs"><span>RCH</span> <em>RUNS</em><FaCrown aria-hidden="true"/></div>
   <div className="rch-gh-top-actions">
    <button type="button" className="rch-gh-guide" onClick={onRules}><FaBookOpen/> <span>How to play</span></button>
    <Link href="/notifications" aria-label="Open notifications" className="rch-gh-icon"><FaBell/></Link>
    <button type="button" onClick={onPlayer} className="rch-gh-avatar" aria-label="Open My Player">
     {avatar?<img src={avatar} alt=""/>:<FaCrown aria-hidden="true"/>}
    </button>
   </div>
  </header>

  <div className="rch-gh-cinema">
   <span className="rch-gh-live"><span aria-hidden="true"/> {city?city.toUpperCase()+' COURTS':'VIRGINIA BASKETBALL'}</span>
   <div className="rch-gh-cinema-copy">
    <span className="rch-gh-eyebrow">THE REAL-WORLD BASKETBALL GAME</span>
    <h1>YOUR CITY.<br/><span>YOUR RUNS.</span></h1>
    <p>Find real courts. Meet real hoopers. Build a legacy you can prove.</p>
    <button type="button" onClick={onWorld} className="rch-gh-explore"><FaCompass/> EXPLORE THE WORLD <FaArrowRight/></button>
   </div>
   <div className="rch-gh-cinema-foot"><FaLocationDot/> REAL COURTS · REAL PEOPLE · REAL RUNS</div>
  </div>

  <div className="rch-gh-player-card">
   <button type="button" className="rch-gh-portrait" onClick={onPlayer} aria-label="Open My Player">
    {avatar?<img src={avatar} alt=""/>:<FaBasketball aria-hidden="true"/>}
   </button>
   <div className="rch-gh-player-main">
    <span className="rch-gh-kicker">{signedIn?'MY PLAYER · VERIFIED PROGRESSION':'YOUR BASKETBALL JOURNEY'}</span>
    <strong>{signedIn?name:'CREATE YOUR PLAYER'}</strong>
    <div className="rch-gh-level">
     <span>{displayLevel!==null?'WORLD LVL '+displayLevel:journeyLoading?'SYNCING WORLD XP':'WORLD LEVEL —'}</span>
     <small>{progress?progress.within.toLocaleString()+' / '+progress.toNext.toLocaleString()+' XP':'Earn XP from verified games'}</small>
    </div>
    <progress max={progress?.toNext||1} value={progress?.within||0} aria-label="World XP toward next level"/>
   </div>
   <button type="button" className="rch-gh-player-crown" onClick={onPlayer} aria-label="View player progression"><FaCrown/></button>
  </div>

  <div className="rch-gh-metrics" aria-label="Your verified performance">
   <div><FaShieldHalved/><strong>{player.verifiedGames===null?'—':player.verifiedGames}</strong><span>VERIFIED GAMES</span></div>
   <div><FaCrown/><strong>{player.repBalance===null?'—':player.repBalance.toLocaleString()}</strong><span>REP WALLET</span></div>
   <div><FaMedal/><strong>{player.badges===null?'—':player.badges}</strong><span>RUN BADGES</span></div>
  </div>

  <Link href={nextHref} className="rch-gh-play"><FaBasketball/><span>{nextRun?'PLAY NOW':'FIND A RUN'}<small>{nextRun?'Open the next real Run':'Browse upcoming basketball games'}</small></span><FaArrowRight/></Link>

  <section className="rch-gh-section" aria-labelledby="rch-next-run">
   <div className="rch-gh-section-title"><h2 id="rch-next-run">NEXT REAL RUN</h2><Link href="/runs?view=list#rch-upcoming-runs">VIEW ALL <FaArrowRight/></Link></div>
   {nextRun?<Link className="rch-gh-next-card" href={nextHref}>
    <span className="rch-gh-run-photo" aria-hidden="true"><FaBasketball/></span>
    <span className="rch-gh-run-body"><strong>{nextRun.title}</strong><small><FaLocationDot/> {nextRun.location||'Court details in event'}</small><small><FaCalendarDays/> {formatWhen(nextRun.starts_at)} · {nextRun.game_format}</small></span>
    {doubleRep&&<span className="rch-gh-double">2× VERIFIED REP</span>}
    <FaArrowRight className="rch-gh-run-arrow"/>
   </Link>:<div className="rch-gh-next-empty">{finding?'Finding available Runs…':city?'No upcoming open Run is listed for this city yet. Explore another area or browse the statewide list.':'No upcoming open Runs found. Browse events or organize a game.'}</div>}
  </section>

  <section className="rch-gh-section" aria-labelledby="rch-quick-actions">
   <div className="rch-gh-section-title"><h2 id="rch-quick-actions">QUICK ACTIONS</h2></div>
   <div className="rch-gh-actions">
    <button type="button" onClick={onWorld}><FaCompass/><span>WORLD</span></button>
    <button type="button" onClick={onBattle}><FaBasketball/><span>BATTLES</span></button>
    <button type="button" onClick={onVault}><FaTrophy/><span>VAULT</span></button>
    <Link href="/crews?intent=mine"><FaPeopleGroup/><span>CREW</span></Link>
   </div>
  </section>

  <section className="rch-gh-section" aria-labelledby="rch-objectives">
   <div className="rch-gh-section-title"><h2 id="rch-objectives">YOUR MISSIONS</h2><button type="button" onClick={onMissions}>VIEW ALL <FaArrowRight/></button></div>
   <div className="rch-gh-mission-grid">{missions.map(m=>{
    const current=journey?.signed_in?Math.min(m.target,worldQuestProgress(journey,m.key)):0;
    return <button type="button" onClick={onMissions} key={m.key} className="rch-gh-mission">
     <span aria-hidden="true">{m.icon}</span><strong>{m.title}</strong>
     <small>{current}/{m.target}</small><progress max={m.target} value={current} aria-label={m.title+' progress'}/>
    </button>;
   })}</div>
   <p className="rch-gh-fair"><FaShieldHalved/> World XP comes from verified games and play at distinct courts. Scouting alone does not award REP or a competitive title.</p>
  </section>
  <div className="rch-gh-footer"><button type="button" onClick={onReplay}><FaPlay/> Replay entrance</button><span>REAL RUNS. REAL HOOPERS. RICH CITY.</span></div>
 </section>;
}
