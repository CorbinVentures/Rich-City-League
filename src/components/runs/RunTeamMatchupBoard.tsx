'use client';
import {FaBasketball,FaCircleCheck,FaPeopleGroup,FaShieldHalved} from 'react-icons/fa6';
import {playerTarget} from '@/lib/runs-gameplay-readiness';

type Team={id:string;name:string;sort_order:number};
type Member={run_team_id:string;profile_id:string};
type Person={id:string;display_name:string|null;username:string|null};
type Props={format:string;teams:readonly Team[];members:readonly Member[];profiles:readonly Person[];registeredIds:readonly string[];checkedInIds:readonly string[];canManage:boolean;suggested:boolean;status:string};

export function RunTeamMatchupBoard({format,teams,members,profiles,registeredIds,checkedInIds,canManage,suggested,status}:Props){
 const roster=new Set(registeredIds),checked=new Set(checkedInIds);
 const target=playerTarget(format),perSide=target===null?null:target/2;
 const assigned=new Set(members.filter(m=>roster.has(m.profile_id)).map(m=>m.profile_id));
 const unassigned=registeredIds.filter(id=>!assigned.has(id));
 const sorted=[...teams].sort((a,b)=>a.sort_order-b.sort_order);
 const name=(id:string)=>{const p=profiles.find(p=>p.id===id);return p?.display_name||p?.username||'Registered player';};
 const group=(team:Team)=>{
  const players=members.filter(m=>m.run_team_id===team.id&&roster.has(m.profile_id));
  const count=perSide===null?players.length:Math.max(perSide,players.length);
  return <article key={team.id} className="rch-matchup-team">
   <header><FaPeopleGroup aria-hidden="true"/><h3>{team.name}</h3><span>{players.length}{perSide!==null?' / '+perSide:''}</span></header>
   <div className="rch-matchup-players">{Array.from({length:Math.max(1,Math.min(count,12))},(_,i)=>{
    const id=players[i]?.profile_id;
    return <div className={'rch-matchup-player'+(id?'':' empty')} key={id||'slot-'+i}><span>{id?name(id):'Open position'}</span><small>{id?(checked.has(id)?<><FaCircleCheck aria-hidden="true"/> CHECKED IN</>:'RSVP ONLY'):'UNASSIGNED'}</small></div>;
   })}</div>
  </article>;
 };
 const realEvent=!suggested&&['open','full'].includes(status);
 return <section className="rch-matchup-board" aria-label="Game-day team matchup" data-rch-game-day-matchup="true">
  <div className="rch-matchup-title"><div><small>RUNS GAME DAY · ACTUAL TEAM ASSIGNMENTS</small><h2>THE MATCHUP</h2></div><span><FaBasketball aria-hidden="true"/> {format.toUpperCase()}</span></div>
  {!realEvent?<p className="rch-matchup-info">Team assignments do not confirm that this event is active or hosted. Check the event status before traveling.</p>:
   sorted.length===0?<div className="rch-matchup-empty"><FaPeopleGroup aria-hidden="true"/><strong>TEAMS NOT SET</strong><p>{canManage?'Use Organize the Floor below to create teams and assign registered players.':'The host has not assigned teams yet. Your RSVP remains a registration, not a game confirmation.'}</p><a href="#rch-run-lobby">OPEN TEAM SETUP</a></div>:
   <div className="rch-matchup-grid">{sorted.slice(0,2).map(group)}{sorted.length===1&&<div className="rch-matchup-empty"><strong>OPPONENT NOT ASSIGNED</strong><p>Both sides need actual players before a competitive score can be reviewed.</p></div>}</div>}
  {sorted.length>2&&<p className="rch-matchup-info">There are {sorted.length} organized teams. The matchup previews the first two; all teams remain visible in Organize the Floor.</p>}
  {unassigned.length>0&&<div className="rch-matchup-bench"><strong>UNASSIGNED · {unassigned.length}</strong><div>{unassigned.slice(0,12).map(id=><span key={id}>{name(id)}{checked.has(id)?' · checked in':''}</span>)}</div>{unassigned.length>12&&<small>+{unassigned.length-12} more registered players</small>}</div>}
  <p className="rch-matchup-info"><FaShieldHalved aria-hidden="true"/> Team placement and RSVP are not proof of on-court attendance, eligibility or independently confirmed score. Only official verified results affect rankings and rewards.</p>
 </section>;
}