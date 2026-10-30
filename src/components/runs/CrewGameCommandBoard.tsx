'use client';

import Link from 'next/link';
import {FaArrowRight,FaBasketball,FaCrown,FaPeopleGroup,FaShieldHalved,FaBolt,FaTrophy} from 'react-icons/fa6';

type Member={profile_id:string;role:string};
type Person={id:string;display_name:string|null;username:string|null;avatar_url:string|null};
type Run={id:string;title:string;starts_at:string;game_format:string;location:string};
export function CrewGameCommandBoard({crewName,city,logo,homeCourt,members,people,runs,entries,mine}:{
 crewName:string;city:string;logo:string|null;homeCourt:string|null;members:readonly Member[];people:readonly Person[];
 runs:readonly Run[];entries:readonly {crew_id:string;run_id:string}[];mine:boolean
}){
 const memberName=(id:string)=>people.find(p=>p.id===id)?.display_name||people.find(p=>p.id===id)?.username||'RCH Member';
 const captain=members.find(m=>m.role==='captain');
 const nextRun=runs[0]||null;
 return <section className="rch-crew-game" aria-label="Runs Crew game headquarters" data-rch-crew-game-hq="true">
  <div className="rch-crew-game-header"><div className="rch-crew-game-crest">{logo?<img src={logo} alt="" loading="lazy"/>:<FaPeopleGroup aria-hidden="true"/>}</div><div><small>RCH RUNS / CREW HEADQUARTERS</small><h2>{crewName}</h2><span><FaShieldHalved aria-hidden="true"/> {city||'VIRGINIA'} · {mine?'YOUR CREW':'PUBLIC CREW PROFILE'}</span></div></div>
  <div className="rch-crew-game-metrics">
   <div><strong>{members.length}</strong><small>REGISTERED MEMBERS</small></div>
   <div><strong>{entries.length}</strong><small>CREW RUN ENTRIES</small></div>
   <div><strong>{homeCourt?'SET':'—'}</strong><small>HOME COURT</small></div>
  </div>
  <div className="rch-crew-game-lineup">
   <div className="rch-crew-game-panel"><div className="rch-crew-game-panel-title"><FaCrown aria-hidden="true"/> CREW LINEUP</div>
    {captain?<p className="rch-crew-game-captain">CAPTAIN · {memberName(captain.profile_id)}</p>:<p className="rch-crew-game-quiet">No captain role listed in the current roster.</p>}
    <div className="rch-crew-game-avatars">{members.slice(0,8).map(m=>{
     const p=people.find(x=>x.id===m.profile_id);
     return <Link href={'/social/profile/'+encodeURIComponent(m.profile_id)} key={m.profile_id} aria-label={'Open '+memberName(m.profile_id)+' basketball profile'} title={memberName(m.profile_id)}>
      {p?.avatar_url?<img src={p.avatar_url} alt=""/>:<FaBasketball aria-hidden="true"/>}
     </Link>;
    })}{!members.length&&<p>No players have joined this roster yet.</p>}</div>
    <a href="#rch-crew-hq">VIEW FULL ROSTER <FaArrowRight aria-hidden="true"/></a>
   </div>
   <div className="rch-crew-game-panel"><div className="rch-crew-game-panel-title"><FaBolt aria-hidden="true"/> NEXT COMPETITIVE MOVE</div>
    {nextRun?<><h3>{nextRun.title}</h3><p>{new Date(nextRun.starts_at).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} · {nextRun.game_format} · {nextRun.location}</p><Link href={'/runs/'+encodeURIComponent(nextRun.id)}>VIEW REAL GAME <FaArrowRight aria-hidden="true"/></Link></>:
    <><h3>THE COURT IS WAITING</h3><p>No upcoming competitive Runs are listed. Organize a real game with your squad.</p><Link href="/runs?create=1">HOST A RUN <FaArrowRight aria-hidden="true"/></Link></>}
   </div>
  </div>
  <div className="rch-crew-game-paths"><Link href={homeCourt?'/runs/courts/'+encodeURIComponent(homeCourt):'/runs/world'}><FaBasketball aria-hidden="true"/>{homeCourt?'OUR COURT ARENA':'CHOOSE A COURT'}</Link><Link href="/runs?view=list&competition=courts#rch-competition"><FaBolt aria-hidden="true"/> COURT BATTLES</Link><Link href="/commonwealth"><FaTrophy aria-hidden="true"/> COMMONWEALTH CUP</Link></div>
  <p className="rch-crew-game-disclosure"><FaShieldHalved aria-hidden="true"/> This HQ displays recorded crew membership and published competition entries. A crew registration is not an individual RSVP, a verified match, or territorial control.</p>
 </section>;
}
