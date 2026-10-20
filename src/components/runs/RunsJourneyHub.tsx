'use client';

import Link from 'next/link';
import {useState} from 'react';
import {
 FaArrowRight,FaBasketball,FaBookOpen,FaCalendarDays,FaChartLine,
 FaChevronDown,FaClipboardCheck,FaCompass,FaCrown,FaFlag,
 FaGift,FaLocationDot,FaMedal,FaPeopleGroup,FaScaleBalanced,
 FaShieldHalved,FaTrophy,FaUsers,FaVideo
} from 'react-icons/fa6';
import './runs-journey-hub.css';

type Destination={id:string;label:string;description:string;href:string;status:'core'|'linked'};
type Stage={id:string;eyebrow:string;title:string;summary:string;icon:typeof FaCompass;destinations:Destination[]};
const root='/runs';
function stages(runId:string|null,courtSlug:string|null):Stage[]{
 const event=runId?root+'/'+encodeURIComponent(runId):root+'?view=list#rch-upcoming-runs';
 const court=courtSlug?root+'/courts/'+encodeURIComponent(courtSlug):root+'/world';
 const eventTarget=(anchor:string)=>runId?event+'#'+anchor:event;
 return [
 {id:'discover',eyebrow:'01 / ENTER & EXPLORE',title:'Find your court',summary:'Choose your city, inspect real venues, and find a game.',icon:FaCompass,destinations:[
  {id:'01',label:'Cinematic Entry',description:'Replay the intro from Game Home',href:root,status:'core'},
  {id:'02',label:'Game Home',description:'Your basketball mission control',href:root,status:'core'},
  {id:'03',label:'Virginia World',description:'Accurate courts and city portals',href:root+'/world',status:'core'},
  {id:'04',label:'Court Arena',description:'Masters, owners, venue and events',href:court,status:'core'}]},
 {id:'play',eyebrow:'02 / FIND & PLAY',title:'Get in the game',summary:'Move from a real open spot to a real court.',icon:FaBasketball,destinations:[
  {id:'05',label:'Run Finder',description:'Upcoming basketball by city and format',href:root+'?view=list#rch-upcoming-runs',status:'core'},
  {id:'06',label:'Run Lobby',description:'Roster, capacity, event rules and join',href:event,status:'core'},
  {id:'07',label:'Next Up',description:'Queue into actual games at the event',href:eventTarget('rch-next-up'),status:'core'},
  {id:'08',label:'Game Day',description:'Venue, check-in and game operations',href:eventTarget('rch-game-day'),status:'core'}]},
 {id:'prove',eyebrow:'03 / VERIFY & PROGRESS',title:'Make it count',summary:'Evidence-based results, your actual career and useful missions.',icon:FaChartLine,destinations:[
  {id:'09',label:'Score Review',description:'Opponent confirmation and official review',href:eventTarget('rch-result-review'),status:'core'},
  {id:'10',label:'Verified Results',description:'Real verified match recap and credits',href:root+'?mode=player#rch-verified-recap',status:'core'},
  {id:'11',label:'My Player',description:'World XP, REP, personal records',href:root+'?mode=player',status:'core'},
  {id:'12',label:'Missions',description:'Scouting, registrations and real play',href:root+'?mode=missions',status:'core'}]},
 {id:'represent',eyebrow:'04 / BUILD YOUR LEGACY',title:'Represent your name',summary:'Earn distinctive collectibles and defend real crew territory.',icon:FaCrown,destinations:[
  {id:'13',label:'Badge Collection',description:'Earned and locked achievement catalogue',href:'/badges',status:'linked'},
  {id:'14',label:'Vault & REP',description:'World milestones and independent REP Exchange',href:root+'?mode=vault',status:'core'},
  {id:'15',label:'Crew HQ',description:'Roster, invitations and squad profile',href:'/crews?intent=mine',status:'linked'},
  {id:'16',label:'Takeovers',description:'Certified challenges and territorial history',href:root+'?mode=battle',status:'core'}]},
 {id:'compete',eyebrow:'05 / COMPETE STATEWIDE',title:'Chase the crown',summary:'Separate player titles, crew victories and Cup competitions.',icon:FaTrophy,destinations:[
  {id:'17',label:'Court Masters',description:'1v1, 2v2 and 3v3 verified crowns',href:court,status:'core'},
  {id:'18',label:'Leaderboards',description:'Independent records, format and court standings',href:root+'?view=list#rch-competition',status:'core'},
  {id:'19',label:'Commonwealth Cup',description:'Distinct statewide qualification and event competition',href:'/commonwealth',status:'linked'},
  {id:'20',label:'Host Operations',description:'Venue readiness, roster, staff and score tools',href:eventTarget('rch-host-operations'),status:'core'}]},
 {id:'community',eyebrow:'06 / THE LIVING COMMUNITY',title:'Keep basketball connected',summary:'Partners, media, invitations and fair-play controls.',icon:FaPeopleGroup,destinations:[
  {id:'21',label:'Partner Runs',description:'Approved organizations and their actual events',href:root+'/partners',status:'core'},
  {id:'22',label:'Game Social',description:'Run Tape, clips and moments',href:eventTarget('rch-run-tape'),status:'core'},
  {id:'23',label:'Notifications',description:'Your real invites, updates and alerts',href:'/notifications',status:'linked'},
  {id:'24',label:'Integrity & Appeals',description:'Flag an actual game result for review',href:eventTarget('rch-appeals'),status:'core'}]}
 ];
}

export function RunsJourneyHub({runId=null,courtSlug=null,defaultOpen=false}:{runId?:string|null;courtSlug?:string|null;defaultOpen?:boolean}){
 const [open,setOpen]=useState(defaultOpen);
 const [selected,setSelected]=useState('discover');
 const parts=stages(runId,courtSlug);
 const active=parts.find(item=>item.id===selected)||parts[0];
 return <section className="rjh-root" aria-label="RCH Runs connected game destinations">
  <div className="rjh-head">
   <div><span className="rjh-eyebrow">THE FULL RCH RUNS EXPERIENCE</span>
    <h2>One World. Every Way to Hoop.</h2>
    <p>Explore the complete game journey. Each destination connects to a real feature, record or Run—never simulated attendance.</p></div>
   <button type="button" aria-expanded={open} aria-controls="rch-full-game-world" onClick={()=>setOpen(o=>!o)}>
    {open?'Close game guide':'Explore all game modes'} <FaChevronDown className={open?'up':''}/>
   </button>
  </div>
  {open&&<div id="rch-full-game-world">
   <div className="rjh-stage-tabs" role="group" aria-label="Choose game stage">
    {parts.map(item=><button key={item.id} type="button" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}>
     <item.icon aria-hidden="true"/><span>{item.title}</span>
    </button>)}
   </div>
   <div className="rjh-selected"><span>{active.eyebrow}</span><h3>{active.title}</h3><p>{active.summary}</p></div>
   <div className="rjh-screen-grid">{active.destinations.map(item=><Link key={item.id} href={item.href} className="rjh-destination">
    <span>{item.id}</span><div><strong>{item.label}</strong><small>{item.description}</small></div><FaArrowRight aria-hidden="true"/>
   </Link>)}</div>
   <p className="rjh-truth"><FaShieldHalved/> Some actions require a real scheduled Run, signed-in membership, a verified result, or organizer privileges. If no event is selected, game-day links lead to the Run Finder.</p>
  </div>}
 </section>;
}
