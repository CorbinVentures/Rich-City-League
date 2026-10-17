'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {FaArrowRight,FaArrowRotateRight,FaBolt,FaCrown,FaShieldHalved,FaBolt,FaTrophy} from 'react-icons/fa6';
import {getSupabaseClient} from '@/lib/supabase';

type Challenge={
 id:string;court_slug:string;run_id:string;challenger_crew_id:string;defender_crew_id:string;
 winning_crew_id:string|null;status:string;created_at:string;resolved_at:string|null;
};
export type BattleDisplay={
 id:string;court:string;courtSlug:string;challenger:string;defender:string;winner:string|null;
 status:'requested'|'accepted'|'resolved';createdAt:string;resolvedAt:string|null;
 runId:string;runAt:string|null;
};
const phase={
 requested:{eyebrow:'CHALLENGE ISSUED',description:'The defending crew has not accepted. No basketball result has been recorded.',color:'pending'},
 accepted:{eyebrow:'BATTLE LOCKED',description:'Both crews have agreed. Only the independently confirmed game will decide this court.',color:'accepted'},
 resolved:{eyebrow:'BATTLE DECIDED',description:'A recorded result has resolved this challenge. The court standings remain authoritative.',color:'resolved'}
} as const;

export function buildBattleDisplays(
 challenges:readonly Challenge[],courtNames:Readonly<Record<string,string>>,
 crewNames:Readonly<Record<string,string>>,startTimes:Readonly<Record<string,string>>
):BattleDisplay[]{
 return challenges.filter(c=>c.status==='requested'||c.status==='accepted'||c.status==='resolved')
  .map(c=>({id:c.id,court:courtNames[c.court_slug]||'Virginia Court',courtSlug:c.court_slug,
   challenger:crewNames[c.challenger_crew_id]||'Registered challenger',
   defender:crewNames[c.defender_crew_id]||'Defending crew',
   winner:c.status==='resolved'&&c.winning_crew_id?crewNames[c.winning_crew_id]||'Verified winning crew':null,
   status:c.status as BattleDisplay['status'],createdAt:c.created_at,resolvedAt:c.resolved_at,
   runId:c.run_id,runAt:startTimes[c.run_id]||null
  })).sort((a,b)=>(a.status==='resolved'?1:0)-(b.status==='resolved'?1:0)||Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
export function shortBattleDate(date:string|null){
 if(!date)return 'Schedule pending';
 const t=Date.parse(date);
 return Number.isFinite(t)?new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET':'Schedule unavailable';
}

export function WorldBattleScene({cityName,courtSlugs,onSelectCourt}:{cityName:string|null;courtSlugs:readonly string[];onSelectCourt:(slug:string)=>void}){
 const db=useMemo(()=>getSupabaseClient(true) as any,[]);
 const [battles,setBattles]=useState<BattleDisplay[]>([]);
 const [filter,setFilter]=useState<'active'|'completed'>('active');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);
 const load=useCallback(async()=>{
  if(!db||!cityName||!courtSlugs.length){setBattles([]);setNotice('');return;}
  let active=true;
  setBusy(true);setNotice('');
  try{
   const [takes,courts]=await Promise.all([
    db.from('rch_court_takeovers').select('id,court_slug,run_id,challenger_crew_id,defender_crew_id,winning_crew_id,status,created_at,resolved_at')
     .in('court_slug',courtSlugs.slice(0,300)).in('status',['requested','accepted','resolved'])
     .order('created_at',{ascending:false}).limit(70),
    db.from('basketball_locations').select('slug,name').in('slug',courtSlugs.slice(0,300)).limit(300)
   ]);
   if(takes.error)throw takes.error;
   const records=(takes.data||[]) as Challenge[];
   const names=Object.fromEntries(((courts.data||[]) as {slug:string;name:string}[]).map(c=>[c.slug,c.name]));
   const crewIds=[...new Set(records.flatMap(c=>[c.challenger_crew_id,c.defender_crew_id,c.winning_crew_id].filter((id):id is string=>!!id)))];
   const runIds=[...new Set(records.map(c=>c.run_id).filter(Boolean))];
   const [crews,runs]=await Promise.all([
    crewIds.length?db.from('commonwealth_crews').select('id,name').in('id',crewIds.slice(0,150)).limit(150):Promise.resolve({data:[]}),
    runIds.length?db.from('runs').select('id,starts_at').in('id',runIds.slice(0,70)).limit(70):Promise.resolve({data:[]})
   ]);
   const crewNames=Object.fromEntries(((crews.data||[]) as {id:string;name:string}[]).map(c=>[c.id,c.name]));
   const starts=Object.fromEntries(((runs.data||[]) as {id:string;starts_at:string}[]).map(c=>[c.id,c.starts_at]));
   if(active)setBattles(buildBattleDisplays(records,names,crewNames,starts));
  }catch{
   if(active){setBattles([]);setNotice('Battle records are temporarily unavailable. Court Dominion remains accessible below.');}
  }finally{if(active)setBusy(false);}
 },[db,cityName,courtSlugs.join('|'),revision]);
 useEffect(()=>{void load();},[load]);
 const visible=battles.filter(b=>filter==='active'?b.status!=='resolved':b.status==='resolved');
 const activeCount=battles.filter(b=>b.status!=='resolved').length;
 const completedCount=battles.filter(b=>b.status==='resolved').length;
 return <section className="rwg-battle-stadium" aria-label="Verified Runs World crew battleboard">
   <div className="rwg-battle-intro">
    <div><span className="rwg-kicker"><FaBolt/> REAL-WORLD CREW BATTLES</span>
     <h3>THE PARK <span>IS THE ARENA.</span></h3>
     <p>Challenges are issued by actual RCH crew captains. No simulated opponents, invented scores, or automatic territory transfers.</p></div>
    <div className="rwg-battle-emblem" aria-hidden="true"><FaBolt/><span>BATTLE</span></div>
   </div>
   <div className="rwg-battle-tabs" role="group" aria-label="Battle records">
    <button type="button" aria-pressed={filter==='active'} onClick={()=>setFilter('active')}>Active challenges <span>{activeCount}</span></button>
    <button type="button" aria-pressed={filter==='completed'} onClick={()=>setFilter('completed')}>Decided battles <span>{completedCount}</span></button>
    <button type="button" className="refresh" onClick={()=>setRevision(n=>n+1)} aria-label="Refresh crew battles" disabled={busy}><FaArrowRotateRight/></button>
   </div>
   {!cityName?<div className="rwg-battle-empty"><FaShieldHalved/><strong>Enter a city first.</strong><p>Choose your Virginia territory in World Mode, then visit Battle for that city’s verified crew matchups.</p></div>:
     busy?<div className="rwg-battle-empty" role="status">Reading recorded crew challenges for {cityName}…</div>:
     notice?<div className="rwg-battle-empty" role="alert">{notice}</div>:
     !visible.length?<div className="rwg-battle-empty"><FaCrown/><strong>{filter==='active'?'No active crew challenges':'No decided crew takeovers recorded'} in {cityName}.</strong>
      <p>Open a court below to build a real crew rivalry. The first recorded match will appear here after registration and verification.</p></div>:
     <div className="rwg-battle-cards">{visible.slice(0,10).map(b=>{
      const state=phase[b.status];
      return <article key={b.id} className={'rwg-battle-card state-'+b.status}>
        <div className="rwg-battle-card-top"><span><FaBolt/> {state.eyebrow}</span><small>{b.court}</small></div>
        <div className="rwg-versus">
         <div><div className="rwg-faction"><FaShieldHalved/></div><span>CHALLENGER</span><strong>{b.challenger}</strong></div>
         <div className="rwg-vs-core"><FaBolt/><strong>VS</strong></div>
         <div><div className="rwg-faction defend"><FaCrown/></div><span>DEFENDER</span><strong>{b.defender}</strong></div>
        </div>
        <div className="rwg-battle-card-footer"><div>
          <p>{b.status==='resolved'&&b.winner?'Winner: '+b.winner:state.description}</p>
          <small>{b.runAt?'Scheduled match: '+shortBattleDate(b.runAt):'See linked Run for current schedule'}</small>
         </div><div className="rwg-battle-cta">
          <Link href={'/runs/'+encodeURIComponent(b.runId)}>Match room <FaArrowRight/></Link>
          <button type="button" onClick={()=>onSelectCourt(b.courtSlug)}>View court <FaArrowRight/></button>
         </div></div>
       </article>;
     })}</div>}
   <p className="rwg-disclosure"><FaShieldHalved/> A registered challenge is not a game in progress. Only a confirmed game result can mark a battle decided. No paid option affects court ownership.</p>
  </section>;
}

export function WorldPlayerIdentity({avatar,name,level,onOpen}:{avatar:string|null;name:string;level:number|null;onOpen:()=>void}){
 return <button type="button" onClick={onOpen} className="rwg-player-identity" aria-label={'Open My Player; Worlds level '+(level??'unavailable')}>
  <span className="rwg-player-portrait">{avatar?<img src={avatar} alt="Your RCH profile avatar"/>:<FaCrown aria-hidden="true"/>}</span>
  <span className="rwg-player-identity-copy"><small>MY PLAYER · WORLD LVL {level??'—'}</small><strong>{name}</strong></span>
  <FaArrowRight aria-hidden="true"/>
 </button>;
}
