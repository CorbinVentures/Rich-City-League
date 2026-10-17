'use client';

import {useState} from 'react';
import Link from 'next/link';
import {FaArrowRight,FaCheck,FaCompass,FaCrown,FaLock,FaMedal,FaShieldHalved} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';
import {worldMilestoneCatalog,weeklyQuestCatalog,worldQuestProgress,worldXpProgress,type WorldJourney} from '@/lib/runs-world-progression';

export function WorldScoutButton({courtSlug,scouted,loggedIn,onScout}:{courtSlug:string;scouted:boolean;loggedIn:boolean;onScout:()=>void}){
 const [busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState('');
 const scout=async()=>{
  setBusy(true);setFeedback('');
  try{
   const db=getSupabaseClient(true);
   if(!db)throw new Error('RCH is offline. Try again.');
   const {error}=await db.rpc('rch_world_scout_court',{p_court:courtSlug});
   if(error)throw error;
   onScout();setFeedback('Saved to your World Passport.');
  }catch(e){
   setFeedback(e instanceof Error?e.message:'Unable to save this court right now.');
  }finally{setBusy(false);}
 };
 return <div className="rwg-scout-control">
  {loggedIn?<button type="button" disabled={busy||scouted} className="rwg-primary" onClick={()=>void scout()}>
    {scouted?<FaCheck/>:<FaCompass/>}{scouted?'Court scouted':busy?'Saving…':'Scout & collect court'}
   </button>:<Link className="rwg-primary" href="/auth/sign-in?next=%2Fruns">Sign in to collect courts <FaArrowRight/></Link>}
  <p role="status">{feedback||'Saves a court to your private exploration collection. Not a physical check-in, verified game, or REP reward.'}</p>
 </div>;
}

export function WorldJourneyPanel({journey,mode,loading}:{journey:WorldJourney|null;mode:'missions'|'vault'|'player';loading:boolean}){
 if(loading)return <div className="rwg-journey-empty" role="status">Syncing your Worlds XP, weekly objectives and earned court stamps…</div>;
 if(!journey?.signed_in)return <div className="rwg-journey-empty">
  <FaLock aria-hidden="true"/>
  <h3>Your basketball journey starts here.</h3>
  <p>Join RCH to save discovered arenas and track verified-game progression across devices. Watching the game world remains free without an account.</p>
  <Link href="/auth/sign-up" className="rwg-primary">Create a free player <FaArrowRight/></Link>
 </div>;
 const progress=worldXpProgress(journey.world_xp);
 if(mode==='missions'){
  return <section className="rwg-journey-panel" aria-label="Persistent weekly Runs World missions">
   <div className="rwg-journey-heading"><div><span className="rwg-kicker">ACTIVE WEEKLY QUESTS · WEEK OF {journey.week_start}</span>
    <h3>Four Ways to Make Your Mark</h3>
    <p>Completed objectives follow your account. The week and daily scout objective reset on Virginia local time.</p>
   </div><strong>{weeklyQuestCatalog.filter(q=>worldQuestProgress(journey,q.key)>=q.target).length}/{weeklyQuestCatalog.length}</strong></div>
   <div className="rwg-quest-grid">{weeklyQuestCatalog.map(q=>{
    const done=worldQuestProgress(journey,q.key)>=q.target;
    return <article key={q.key} className={'rwg-quest-card'+(done?' done':'')}>
      <div className="rwg-quest-symbol" aria-hidden="true">{q.icon}</div>
      <span className="rwg-quest-state">{done?<><FaCheck/> COMPLETE</>:'QUEST ACTIVE'}</span>
      <h4>{q.title}</h4><p>{q.detail}</p>
      {done?<strong>✓ Recorded in your journey</strong>:<Link href={q.href}>Take on quest <FaArrowRight/></Link>}
    </article>;
   })}</div>
   <p className="rwg-disclosure"><FaShieldHalved/> World quests do not pay REP for taps, browsing, or court scouting. Verified wins and matches remain independently audited before counting.</p>
  </section>;
 }
 if(mode==='vault'){
  return <section className="rwg-journey-panel" aria-label="Permanent collectible world achievements">
    <div className="rwg-journey-heading"><div><span className="rwg-kicker">PERMANENT WORLD COLLECTIBLES</span><h3>Your Earned Milestones</h3>
     <p>Unlocked through independently confirmed basketball, never purchases.</p></div>
     <strong>{worldMilestoneCatalog.filter(item=>journey.milestones[item.key]).length}/{worldMilestoneCatalog.length}</strong>
    </div>
    <div className="rwg-collectible-grid">{worldMilestoneCatalog.map(item=>{
     const unlocked=journey.milestones[item.key];
     return <article key={item.key} className={'rwg-collectible'+(unlocked?' unlocked':'')}>
      <div aria-hidden="true" className="rwg-collectible-medal">{unlocked?item.icon:'🔒'}</div>
      <strong>{item.name}</strong><small>{unlocked?'UNLOCKED':'LOCKED'}</small><p>{item.description}</p>
     </article>;
    })}</div>
    <h3 className="rwg-stamps-title"><FaCompass/> Scouted Virginia Arenas · {journey.scouted_courts}</h3>
    <p className="rwg-stamp-disclosure">Collected courts represent places you saved, not a verified physical visit. Only match records prove basketball results.</p>
    {journey.stamps.length?<div className="rwg-stamps">{journey.stamps.map(stamp=>
      <Link key={stamp.court_slug} href={'/runs/courts/'+encodeURIComponent(stamp.court_slug)} className="rwg-stamp">
       <span>🏀</span><div><strong>{stamp.name}</strong><small>{stamp.city} · Scouted {new Date(stamp.scouted_at).toLocaleDateString('en-US')}</small></div><FaArrowRight/>
      </Link>
    )}</div>:<p className="rwg-journey-empty">Explore a Virginia city, select a verified public court and tap “Scout & collect court” to start your personal collection.</p>}
  </section>;
 }
 return <section className="rwg-journey-panel" aria-label="Permanent verified world level">
  <div className="rwg-player-stage">
   <div className="rwg-level-emblem"><span>WORLD</span><strong>{progress.level}</strong><small>HOOPER LEVEL</small></div>
   <div className="rwg-level-stats">
    <span className="rwg-kicker">PERMANENT RUNS WORLD PROGRESSION</span>
    <h3>Every real game builds your story.</h3>
    <p>Level {progress.level} · {progress.xp.toLocaleString()} Worlds XP</p>
    <div className="rwg-xp-track" role="progressbar" aria-valuenow={progress.within} aria-valuemax={progress.toNext} aria-valuemin={0} aria-label="Progress toward the next Worlds level">
     <span style={{width:progress.percent+'%'}}/>
    </div>
    <small>{(progress.toNext-progress.within).toLocaleString()} Worlds XP to Level {progress.level+1}</small>
   </div>
  </div>
  <div className="rwg-journey-numbers">
   <div><strong>{journey.verified_games}</strong><span>Verified battles</span></div>
   <div><strong>{journey.verified_wins}</strong><span>Verified victories</span></div>
   <div><strong>{journey.verified_courts}</strong><span>Played at courts</span></div>
   <div><strong>{journey.scouted_courts}</strong><span>Scouted arenas</span></div>
  </div>
  <p className="rwg-disclosure"><FaShieldHalved/> Worlds XP is a permanent display score calculated from independently verified games (120 XP), verified wins (+60), and distinct verified match courts (+25). It is not spendable REP, a competitive skill boost, or a paid perk.</p>
  {journey.recent_verified[0]&&<div className="rwg-victory-replay">
    <span className="rwg-kicker"><FaMedal/> LAST CONFIRMED GAME</span>
    <h3>{journey.recent_verified[0].won?'VICTORY RECORDED':'BATTLE COMPLETED'}</h3>
    <p>{journey.recent_verified[0].game_format} · {new Date(journey.recent_verified[0].verified_at).toLocaleDateString('en-US')}</p>
    <Link href={journey.recent_verified[0].court_slug?'/runs/courts/'+encodeURIComponent(journey.recent_verified[0].court_slug):'/runs?view=list#rch-competition'}>
      Return to the arena <FaArrowRight/>
    </Link>
   </div>}
 </section>;
}

export type WorldPulseEvent={id:string;court_slug:string;title:string;detail:string;status:'verified'|'pending';at:string};
export function WorldPulse({events,onCourt}:{events:WorldPulseEvent[];onCourt:(slug:string)=>void}){
 return <section className="rwg-pulse" aria-label="Confirmed world activity">
  <div className="rwg-section-head"><div><span className="rwg-kicker">WORLD PULSE / ACTUAL RECORDS</span><h2>What's Happening Here</h2></div><FaCrown/></div>
  {events.length===0?<p className="rwg-empty">No recorded court battles or crown changes in this area yet. Your crew could write the first chapter.</p>:
    <div className="rwg-pulse-list">{events.slice(0,8).map(event=><button type="button" key={event.id} onClick={()=>onCourt(event.court_slug)} className="rwg-pulse-row">
      <span className={event.status==='verified'?'confirmed':'pending'}>{event.status==='verified'?<FaCrown/>:<FaShieldHalved/>}</span>
      <div><strong>{event.title}</strong><small>{event.detail}</small><em>{event.status==='verified'?'VERIFIED RESULT':'CHALLENGE PENDING'} · {new Date(event.at).toLocaleDateString('en-US')}</em></div>
      <FaArrowRight/>
    </button>)}</div>}
 </section>;
}
