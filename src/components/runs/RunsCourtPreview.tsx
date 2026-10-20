'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {
 FaArrowRight,FaBasketball,FaCalendarDays,FaChevronDown,FaChevronUp,
 FaCrown,FaExpand,FaLocationDot,FaPeopleGroup,FaShieldHalved,
 FaTrophy,FaXmark
} from 'react-icons/fa6';
import type {WorldCourt,WorldRun} from '@/lib/runs-world-game';
import {WorldScoutButton} from '@/components/runs/RunsWorldJourney';
import './runs-court-preview.css';

export type CertifiedCourtBelt={division:string;player_name:string;defenses:number};
type Props={
 court:WorldCourt;cityId:string;events:readonly WorldRun[];
 belts:readonly CertifiedCourtBelt[];beltLoading:boolean;
 controllingCrew:string|null;crewLogoUrl:string|null;recordedDefenses:number;
 loggedIn:boolean;scouted:boolean;onScout:()=>void;
 onClose:()=>void;
};
const formats=['1v1','2v2','3v3'] as const;

function eventWhen(iso:string){
 const date=new Date(iso);
 return Number.isFinite(date.getTime())
  ?date.toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET'
  :'Time needs confirmation';
}
function accessLabel(court:WorldCourt){
 if(court.venue_type==='indoor')return 'Indoor gym · check access';
 if(court.venue_type==='mixed')return 'Recreation center · confirm access';
 return 'Outdoor court · confirm park hours';
}

/** On-map disclosure, not a new match authority or a modal that remounts the map. */
export function RunsCourtPreview({court,cityId,events,belts,beltLoading,controllingCrew,crewLogoUrl,recordedDefenses,loggedIn,scouted,onScout,onClose}:Props){
 const [expanded,setExpanded]=useState(false);
 const dismiss=useRef<HTMLButtonElement|null>(null);
 const scroller=useRef<HTMLDivElement|null>(null);
 const touchStartY=useRef<number|null>(null);
 useEffect(()=>{dismiss.current?.focus({preventScroll:true});},[court.slug]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){
    event.preventDefault();
    if(expanded)setExpanded(false);
    else onClose();
   }
  };
  document.addEventListener('keydown',key);
  return()=>document.removeEventListener('keydown',key);
 },[expanded,onClose]);
 useEffect(()=>{
  if(!scroller.current)return;
  scroller.current.scrollTo({top:expanded?Math.max(0,scroller.current.scrollHeight/4):0,
   behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 },[expanded]);
 const arenaHref='/runs/courts/'+encodeURIComponent(court.slug)+'?fromCity='+encodeURIComponent(cityId);
 const scheduled=[...events].filter(e=>(e.status==='open'||e.status==='full')&&Date.parse(e.starts_at)>Date.now())
   .sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 const next=scheduled[0];
 const isPublic= court.access_type==='public'&&court.venue_type==='outdoor';
 return <aside className={'rwg-court-preview'+(expanded?' is-expanded':'')} aria-label={court.name+' court preview'} role="region">
  <div className="rwg-court-preview-scroll" ref={scroller}>
   <div className="rwg-court-preview-hero">
    <div className="rwg-court-preview-topline">
     <span><FaBasketball/> RCH RUNS · COURT DISCOVERY</span>
     <div className="rwg-court-preview-controls">
      <button ref={dismiss} type="button" onClick={onClose} aria-label="Close court preview"><FaXmark/></button>
     </div>
    </div>
    <div className="rwg-court-preview-handle"
      onTouchStart={event=>{touchStartY.current=event.touches[0]?.clientY??null;}}
      onTouchEnd={event=>{
       const from=touchStartY.current;touchStartY.current=null;
       if(from===null)return;
       const diff=event.changedTouches[0]?.clientY-from;
       if(diff< -45)setExpanded(true);
       else if(diff>45)setExpanded(false);
      }}>
     <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}
       aria-label={expanded?'Collapse court preview':'Expand court preview'}>
      <span className="rwg-court-preview-grip" aria-hidden="true"/>
      {expanded?<FaChevronDown/>:<FaChevronUp/>}
     </button>
    </div>
    <p className="rwg-court-preview-kicker">COURT DISCOVERED · {court.locality||'VIRGINIA'}</p>
    <h2>{court.name}</h2>
    <p className="rwg-court-preview-place"><FaLocationDot aria-hidden="true"/> {court.locality||'Virginia'}{court.address?' · '+court.address:''}</p>
    <span className="rwg-court-preview-image-note">RCH visual artwork · not a photograph of this facility</span>
   </div>

   <div className="rwg-court-preview-body">
    <div className="rwg-court-preview-chips">
     <span><FaShieldHalved/> {court.verification_status==='official'?'Official source':'Provider source'}</span>
     <span>{accessLabel(court)}</span>
     <span>{scheduled.length} scheduled {scheduled.length===1?'Run':'Runs'}</span>
    </div>
    <div className="rwg-court-preview-territory">
     <span className="rwg-court-preview-crest">{controllingCrew&&crewLogoUrl?<img src={crewLogoUrl} alt={controllingCrew+' crew logo'}/>:<FaCrown/>}</span>
     <div><small>COURT TERRITORY · CONTROLLING CREW</small><strong>{controllingCrew||'Unclaimed'}</strong>
      <small>{controllingCrew?recordedDefenses+' recorded successful defenses':'No verified crew controller on record'}</small>
     </div>
    </div>
    <div className="rwg-court-preview-next">
     <h3><FaCalendarDays/> NEXT REAL RUN</h3>
     {next?<Link href={'/runs/'+encodeURIComponent(next.id)+'?fromCourt='+encodeURIComponent(court.slug)+'&fromCity='+encodeURIComponent(cityId)}>
      <span><strong>{next.title}</strong><small>{eventWhen(next.starts_at)} · {next.game_format} · {next.status==='full'?'Full':'Registration status: open'}</small></span>
      <span className="rwg-court-preview-run-cta">{next.status==='full'?'View Run':'View / Join'} <FaArrowRight/></span>
     </Link>:<p>No upcoming organized Run is currently listed at this court. The court record does not guarantee open play.</p>}
    </div>

    {expanded&&<div className="rwg-court-preview-expanded" id="rwg-court-preview-expanded">
     <h3><FaTrophy/> CERTIFIED COURT MASTERS</h3>
     <div className="rwg-court-preview-masters">
      {formats.map(format=>{
       const belt=belts.find(x=>x.division===format);
       return <div key={format}>
        <span><FaCrown/> {format}</span>
        <strong>{beltLoading?'Checking…':belt?.player_name||'No certified title holder'}</strong>
        <small>{belt?belt.defenses+' verified defenses':'See requirements in Arena'}</small>
       </div>;
      })}
     </div>
     <h3><FaPeopleGroup/> ALL UPCOMING RUNS</h3>
     {scheduled.length?scheduled.slice(0,5).map(run=><Link key={run.id} className="rwg-court-preview-runline" href={'/runs/'+encodeURIComponent(run.id)+'?fromCourt='+encodeURIComponent(court.slug)+'&fromCity='+encodeURIComponent(cityId)}>
       <span><strong>{run.title}</strong><small>{eventWhen(run.starts_at)} · {run.game_format} · {run.status}</small></span><FaArrowRight/>
      </Link>):<p className="rwg-court-preview-muted">No scheduled Run. You can organize a real event subject to facility rules.</p>}
     <div className="rwg-court-preview-access">
      <FaShieldHalved/><p>{isPublic?'Public outdoor facility record; verify opening hours before visiting.':'Venue access, staffing and basketball availability must be confirmed with the facility.'} This site is not reserved by RCH; a location record is not evidence of active players.</p>
     </div>
     {isPublic&&<WorldScoutButton courtSlug={court.slug} loggedIn={loggedIn} scouted={scouted} onScout={onScout}/>}
     {court.source_url&&<a className="rwg-court-preview-source" href={court.source_url} rel="noopener noreferrer" target="_blank">Inspect court source <FaArrowRight/></a>}
    </div>}

    <div className="rwg-court-preview-actions">
     <Link href={arenaHref} className="rwg-court-preview-enter"><FaExpand/> ENTER COURT ARENA <FaArrowRight/></Link>
     <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>
      {expanded?'Show Less':'See Court Details'} {expanded?<FaChevronDown/>:<FaChevronUp/>}
     </button>
    </div>
   </div>
  </div>
 </aside>;
}
