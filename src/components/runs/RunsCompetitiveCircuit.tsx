'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaArrowsRotate,FaBasketball,FaBolt,FaCalendarDays,FaCheck,FaCrown,FaFlag,FaShieldHalved,FaTrophy} from 'react-icons/fa6';
import {useAuth} from '@/hooks/useAuth';
import {getSupabaseClient} from '@/lib/supabase';
import {RunRankedLadder} from '@/components/runs/RunRankedLadder';
import {WorldBattleScene} from '@/components/runs/RunsWorldBattleScene';
import {weeklyQuestCatalog,worldQuestProgress,type WorldJourney} from '@/lib/runs-world-progression';
import {verifiedCompetitionHistory,type CompetitiveReceipt} from '@/lib/runs-competitive-season';
import './runs-competitive-circuit.css';

type Mode='ranked'|'battles'|'quests'|'cup';
type Expansion={receipts:CompetitiveReceipt[]};
const menus:{id:Mode;name:string;icon:typeof FaTrophy}[]=[
 {id:'ranked',name:'RANKED',icon:FaTrophy},
 {id:'battles',name:'RIVALRIES',icon:FaBolt},
 {id:'quests',name:'WEEKLY',icon:FaCalendarDays},
 {id:'cup',name:'CUP PATH',icon:FaCrown}
];
const readableDate=(date:string)=>new Date(date).toLocaleDateString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric'});

export function RunsCompetitiveCircuit({journey,journeyLoading,cityName,courtSlugs,onSelectCourt}:{
 journey:WorldJourney|null;journeyLoading:boolean;cityName:string|null;
 courtSlugs:readonly string[];onSelectCourt:(slug:string)=>void
}){
 const {user}=useAuth();
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [mode,setMode]=useState<Mode>('ranked');
 const [records,setRecords]=useState<CompetitiveReceipt[]|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [chosen,setChosen]=useState('all');
 useEffect(()=>{
  if(!db||!user?.id){setRecords(null);setLoading(false);setError('');return;}
  let alive=true;
  setLoading(true);setError('');setRecords(null);
  void db.rpc('get_rch_world_expansion').then(({data,error:failure}:{data:Expansion|null;error:unknown})=>{
   if(!alive)return;
   setRecords(failure||!Array.isArray(data?.receipts)?null:data!.receipts);
   setError(failure||!Array.isArray(data?.receipts)?'Verified history temporarily unavailable; no results are assumed.':'');
   setLoading(false);
  }).catch(()=>{if(alive){setRecords(null);setError('Verified history temporarily unavailable; no results are assumed.');setLoading(false);}});
  return()=>{alive=false;};
 },[db,user?.id,revision]);
 const history=useMemo(()=>verifiedCompetitionHistory(records),[records]);
 const shown=chosen==='all'?history.receipts:history.receipts.filter(x=>x.game_format===chosen);
 const completed=journey?.signed_in?weeklyQuestCatalog.filter(x=>worldQuestProgress(journey,x.key)>=x.target).length:null;
 return <section className="rcc-shell" aria-label="RCH Runs Competitive Circuit" data-runs-competitive-circuit="true">
  <header className="rcc-hero">
   <div className="rcc-overline"><FaShieldHalved aria-hidden="true"/> RCH RUNS · COMPETITIVE CIRCUIT</div>
   <div className="rcc-hero-content"><div><h2>CHALLENGE.<br/><span>PROVE. REPEAT.</span></h2><p>Real opponents. Verified basketball. One connected route from the park to your competitive legacy.</p></div><div className="rcc-season-emblem"><FaTrophy aria-hidden="true"/><strong>SEASON<br/>ZERO</strong><small>VERIFIED LADDER PREVIEW</small></div></div>
   <p className="rcc-season-disclosure">Season Zero is the existing verified ranking environment, not a newly certified season, guaranteed tournament invitation, or the November 2027 professional league.</p>
  </header>

  <div className="rcc-status-strip">
   <div><small>VERIFIED HISTORY AVAILABLE</small><strong>{!user?'SIGN IN':loading?'SYNCING':records===null?'—':history.games+' GAMES'}</strong></div>
   <div><small>RECORDED VICTORIES</small><strong>{records===null?'—':history.wins}</strong></div>
   <div><small>WEEKLY OBJECTIVES</small><strong>{journeyLoading?'SYNCING':completed===null?'—':completed+' / '+weeklyQuestCatalog.length}</strong></div>
  </div>
  {!user?<p className="rcc-account">Public ranked boards and recorded crew battles are open to explore. <Link href="/auth/sign-in?next=%2Fruns%3Fview%3Dworld%26mode%3Dseason">Sign in</Link> to see your actual record and weekly progress.</p>:
   error?<p className="rcc-account" role="alert">{error} <button type="button" onClick={()=>setRevision(v=>v+1)}>Retry record sync</button></p>:
   <div className="rcc-replay-preview">
    <div><small>YOUR LAST VERIFIED GAME</small><strong>{history.latest?(history.latest.won?'VICTORY RECORDED':'GAME VERIFIED'):'YOUR STORY STARTS ON COURT'}</strong><p>{history.latest?(history.latest.court_name||'Verified Virginia court')+' · '+history.latest.game_format+' · '+readableDate(history.latest.verified_at):'Only independently confirmed game receipts appear here.'}</p></div>
    {history.latest?<Link href={'/runs/'+encodeURIComponent(history.latest.run_id)}>REPLAY RECEIPT <FaArrowRight aria-hidden="true"/></Link>:
     <Link href="/runs?view=list#rch-upcoming-runs">FIND A REAL GAME <FaArrowRight aria-hidden="true"/></Link>}
   </div>}

  <nav className="rcc-tabs" aria-label="Competitive Circuit game modes">{menus.map(menu=><button type="button" key={menu.id} aria-pressed={mode===menu.id} onClick={()=>setMode(menu.id)}><menu.icon aria-hidden="true"/><span>{menu.name}</span></button>)}</nav>
  {mode==='ranked'&&<section className="rcc-section" aria-label="Verified ranked arena"><div className="rcc-section-intro"><span>THE LADDER</span><h3>EARN YOUR POSITION</h3><p>Choose your format. Ratings, provisional status, wins, and rankings come from the server—not a simulated season.</p></div>
   <RunRankedLadder/>
   {user&&<div className="rcc-records"><header><div><span>MY VERIFIED REPLAY ARCHIVE</span><h3>THE GAME TAPE</h3></div><button type="button" onClick={()=>setRevision(v=>v+1)} disabled={loading}><FaArrowsRotate aria-hidden="true"/> REFRESH</button></header>
    {records===null?<p>{loading?'Syncing your official game receipts…':'Verified game history unavailable.'}</p>:
    history.receipts.length===0?<div className="rcc-empty"><FaBasketball aria-hidden="true"/><strong>NO VERIFIED MATCH RECEIPTS YET</strong><p>Finish a real hosted game and complete independent confirmation to start your record.</p><Link href="/runs?view=list#rch-upcoming-runs">FIND A GAME <FaArrowRight/></Link></div>:
    <><div className="rcc-formats" role="group" aria-label="Filter your verified game history"><button type="button" aria-pressed={chosen==='all'} onClick={()=>setChosen('all')}>ALL</button>{history.formats.map(f=><button key={f.format} type="button" aria-pressed={chosen===f.format} onClick={()=>setChosen(f.format)}>{f.format} · {f.wins}W / {f.losses}L</button>)}</div>
     <ol className="rcc-receipts">{shown.slice(0,12).map(receipt=><li key={receipt.id}><span className={'rcc-result-mark '+(receipt.won?'win':'played')}>{receipt.won?<FaTrophy aria-hidden="true"/>:<FaBasketball aria-hidden="true"/>}</span><div><strong>{receipt.won?'VERIFIED WIN':'VERIFIED GAME'} · {receipt.game_format}</strong><small>{receipt.court_name||'Virginia court'} · {readableDate(receipt.verified_at)}</small></div><Link href={'/runs/'+encodeURIComponent(receipt.run_id)} aria-label={'View verified Run '+receipt.run_id}>GAME RECEIPT <FaArrowRight/></Link></li>)}</ol>
     <p className="rcc-truth">This displays returned verified receipts, not a complete historical ledger or a separate season tally. Ratings remain separate by game format.</p></>}
   </div>}
  </section>}
  {mode==='battles'&&<section className="rcc-section" aria-label="Real court rivalry records"><div className="rcc-section-intro"><span>COURT RIVALRIES</span><h3>THE NEXT TAKEOVER</h3><p>Only actual captain-issued challenges and recorded outcomes appear. Choose a city in Virginia World for its battle history.</p></div>
   {cityName&&courtSlugs.length?<WorldBattleScene cityName={cityName} courtSlugs={courtSlugs} onSelectCourt={onSelectCourt}/>:
    <div className="rcc-empty"><FaFlag aria-hidden="true"/><strong>CHOOSE A VIRGINIA CITY</strong><p>Open World to choose a real court, then return to Circuit for its recorded rivals.</p><Link href="/runs/world">EXPLORE WORLD <FaArrowRight/></Link></div>}
   <div className="rcc-paths"><Link href="/crews?intent=mine">OPEN CREW HQ <FaArrowRight/></Link><Link href="/runs?view=list&competition=courts#rch-competition">COURT CHALLENGES <FaArrowRight/></Link></div>
  </section>}
  {mode==='quests'&&<section className="rcc-section" aria-label="Real weekly basketball goals"><div className="rcc-section-intro"><span>WEEKLY PLAYBOOK</span><h3>FOUR REAL OBJECTIVES</h3><p>Recorded scouting, registrations and independently confirmed games. No REP or ranked rating for tapping a mission.</p></div>
   {journeyLoading?<div className="rcc-empty" role="status">Syncing your recorded weekly objectives…</div>:
    !journey?.signed_in?<div className="rcc-empty"><FaCalendarDays aria-hidden="true"/><strong>START YOUR WEEKLY JOURNEY</strong><p>Sign in to see your real progress across devices.</p><Link href="/auth/sign-in?next=%2Fruns%3Fview%3Dworld%26mode%3Dseason">SIGN IN <FaArrowRight/></Link></div>:
    <><p className="rcc-week-label">CURRENT VERIFIED WEEK · STARTING {journey.week_start}</p><div className="rcc-quests">{weeklyQuestCatalog.map(quest=>{
      const done=worldQuestProgress(journey,quest.key)>=quest.target;
      return <article key={quest.key} className={done?'done':''}><span aria-hidden="true">{quest.icon}</span><div><strong>{quest.title}</strong><small>{quest.detail}</small><span>{done?'COMPLETED':'NOT YET RECORDED'}</span></div>{done?<FaCheck aria-label="Completed"/>:<Link href={quest.href} aria-label={'Begin '+quest.title}><FaArrowRight aria-hidden="true"/></Link>}</article>;
    })}</div><p className="rcc-truth">Scouting a court is discovery, not proof of visiting or playing. Verified match results remain independent of weekly participation.</p></>}
  </section>}
  {mode==='cup'&&<section className="rcc-section" aria-label="Commonwealth Cup pathway"><div className="rcc-section-intro"><span>STATEWIDE CHAMPIONSHIP</span><h3>ROAD TO THE COMMONWEALTH CUP</h3><p>Understand the intended competition path. A verified Runs record does not automatically create Cup eligibility or a tournament entry.</p></div>
   <div className="rcc-cup-timeline">
    <div><span>01</span><FaBasketball aria-hidden="true"/><strong>PLAY VERIFIED RUNS</strong><p>Build a real competitive record in supported formats.</p></div>
    <div><span>02</span><FaShieldHalved aria-hidden="true"/><strong>COMPLETE OFFICIAL REVIEWS</strong><p>Independent confirmation must precede ranking or recognition.</p></div>
    <div><span>03</span><FaCrown aria-hidden="true"/><strong>CHECK CUP REQUIREMENTS</strong><p>Qualification rules and dates must be verified with the tournament organizers.</p></div>
   </div>
   <div className="rcc-cup-notice"><FaShieldHalved aria-hidden="true"/><div><strong>QUALIFICATION IS NOT AUTOMATIC</strong><p>The proposed Nov 1–Dec 20 qualification window and January Cup are planning milestones, not evidence that registration, eligibility, or brackets are active. The Rich City League professional season is a separate November 2027 launch.</p></div></div>
   <div className="rcc-paths"><Link href="/commonwealth">OPEN COMMONWEALTH CUP <FaArrowRight/></Link><Link href="/runs?view=list#rch-upcoming-runs">FIND VERIFIED PLAY <FaArrowRight/></Link></div>
  </section>}
 </section>;
}
