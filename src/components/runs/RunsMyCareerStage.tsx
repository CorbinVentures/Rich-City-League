'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaCrown,FaMedal,FaPeopleGroup,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {worldMilestoneCatalog,worldXpProgress,weeklyQuestCatalog,worldQuestProgress,type WorldJourney} from '@/lib/runs-world-progression';

type Summary={verified_games:number;badges:string[];last_results:{verified_at:string;court_name?:string;game_format?:string;won?:boolean;rating_before?:number;rating_after?:number}[]};
export function RunsMyCareerStage({name,avatar,journey,rep,passport}:{
 name:string;avatar:string|null;journey:WorldJourney|null;rep:number|null;passport:Summary|null
}){
 const progress=journey?.signed_in?worldXpProgress(journey.world_xp):null;
 const earned=journey?worldMilestoneCatalog.filter(x=>journey.milestones[x.key]):[];
 const nextQuest=journey?weeklyQuestCatalog.find(q=>worldQuestProgress(journey,q.key)<q.target):null;
 const latest=passport?.last_results?.[0]||null;
 return <section className="rch-career-stage" aria-label="MyPLAYER verified basketball career" data-rch-game-mycarrer="true">
  <div className="rch-career-kicker"><FaCrown aria-hidden="true"/> RCH RUNS · MYCAREER</div>
  <div className="rch-career-profile">
   <div className="rch-career-portrait">{avatar?<img src={avatar} alt="" loading="lazy"/>:<FaBasketball aria-hidden="true"/>}</div>
   <div className="rch-career-persona"><small>YOUR REAL-WORLD HOOPER</small><h2>{name}</h2><strong>{progress?'HOOPER LEVEL '+progress.level:'CAREER NOT SYNCED'}</strong>
    {progress?<div className="rch-career-progress"><progress value={progress.within} max={progress.toNext} aria-label="Verified World XP toward next Hooper Level"/><span>{progress.within.toLocaleString()} / {progress.toNext.toLocaleString()} WORLD XP</span></div>:
    <p>Progress appears after your verified player career syncs.</p>}
   </div>
  </div>
  <div className="rch-career-metrics" aria-label="Verified player progression">
   <div><FaTrophy aria-hidden="true"/><strong>{journey?.verified_wins??'—'}</strong><span>VERIFIED WINS</span></div>
   <div><FaBasketball aria-hidden="true"/><strong>{passport?.verified_games??journey?.verified_games??'—'}</strong><span>VERIFIED GAMES</span></div>
   <div><FaCrown aria-hidden="true"/><strong>{rep===null?'—':rep.toLocaleString()}</strong><span>SPENDABLE REP</span></div>
   <div><FaMedal aria-hidden="true"/><strong>{passport?.badges?.length??'—'}</strong><span>EARNED BADGES</span></div>
  </div>
  <div className="rch-career-panels">
   <div className="rch-career-panel"><div className="rch-career-panel-head"><FaMedal aria-hidden="true"/><strong>ACHIEVEMENT CABINET</strong></div>
    {journey?<><div className="rch-career-medals">{worldMilestoneCatalog.map(item=><div key={item.key} className={'rch-career-medal '+(journey.milestones[item.key]?'unlocked':'locked')} title={item.description}><span aria-hidden="true">{journey.milestones[item.key]?item.icon:'🔒'}</span><small>{item.name}</small></div>)}</div><p>{earned.length} of {worldMilestoneCatalog.length} verified career milestones unlocked</p></>:
    <p>Earned milestones sync from real game results.</p>}
    <Link href="/runs?view=world&mode=vault">OPEN THE VAULT <FaArrowRight aria-hidden="true"/></Link>
   </div>
   <div className="rch-career-panel"><div className="rch-career-panel-head"><FaShieldHalved aria-hidden="true"/><strong>NEXT CHAPTER</strong></div>
    {nextQuest?<><h3>{nextQuest.title}</h3><p>{nextQuest.detail}</p><Link href={nextQuest.href}>START OBJECTIVE <FaArrowRight aria-hidden="true"/></Link></>:
     journey?<><h3>THIS WEEK'S QUESTS COMPLETE</h3><p>Find another hosted Run or revisit your verified career history.</p><Link href="/runs?view=list#rch-upcoming-runs">FIND A RUN <FaArrowRight aria-hidden="true"/></Link></>:
     <><h3>BUILD YOUR LEGACY</h3><p>Find real games and start building your verified basketball résumé.</p><Link href="/runs?view=list#rch-upcoming-runs">FIND A RUN <FaArrowRight aria-hidden="true"/></Link></>}
   </div>
  </div>
  {latest&&<div className="rch-career-record"><FaTrophy aria-hidden="true"/><div><small>MOST RECENT VERIFIED PERFORMANCE</small><strong>{latest.won?'VERIFIED VICTORY':'VERIFIED GAME'} · {latest.court_name||'Virginia court'}</strong><span>{latest.game_format||'Basketball'} · {new Date(latest.verified_at).toLocaleDateString('en-US',{timeZone:'America/New_York'})}{typeof latest.rating_before==='number'&&typeof latest.rating_after==='number'?' · RATING '+latest.rating_before+' → '+latest.rating_after:''}</span></div></div>}
  <div className="rch-career-paths"><Link href="/runs?view=list#rch-competition">VIEW FORMAT RANKINGS <FaArrowRight aria-hidden="true"/></Link><Link href="/crews?intent=mine"><FaPeopleGroup aria-hidden="true"/> CREW HQ</Link><Link href="/runs/world">EXPLORE COURTS <FaArrowRight aria-hidden="true"/></Link></div>
  <p className="rch-career-integrity"><FaShieldHalved aria-hidden="true"/> Hooper Level and World XP track verified basketball activity. Skill rating is per format, REP is spendable, and community social XP is separate. These are never interchangeable.</p>
 </section>;
}
