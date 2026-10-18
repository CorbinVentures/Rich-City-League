'use client';

import {FaArrowRight,FaBolt,FaCompass,FaCrosshairs,FaCrown,FaFlagCheckered,FaPeopleGroup} from 'react-icons/fa6';
import {worldXpProgress,type WorldJourney} from '@/lib/runs-world-progression';
import './runs-game-lobby.css';

type Props={city:string|null;journey:WorldJourney|null;signedIn:boolean;loading:boolean;onExplore:()=>void;onMissions:()=>void;onBattle:()=>void};
export function RunsGameLobby({city,journey,signedIn,loading,onExplore,onMissions,onBattle}:Props){
 const progress=journey?.signed_in?worldXpProgress(journey.world_xp):null;
 const objective=!journey?.verified_games?'Play your first verified game':!journey?.verified_wins?'Get your first verified win':journey.verified_courts<3?'Compete at three different courts':'Build your next court rivalry';
 return <section className="rgl-lobby" aria-label="Runs World game lobby">
  <div className="rgl-atmosphere" aria-hidden="true">
   <div className="rgl-orbit"/><div className="rgl-orbit orbit-two"/>
   <svg className="rgl-court" viewBox="0 0 620 760" fill="none">
    <defs><linearGradient id="rgl-floor" x1="0" y1="0" x2="620" y2="760" gradientUnits="userSpaceOnUse"><stop stopColor="#174870"/><stop offset="1" stopColor="#081c34"/></linearGradient></defs>
    <rect x="45" y="35" width="530" height="690" rx="8" fill="url(#rgl-floor)" stroke="#65c9f5" strokeWidth="3"/>
    <path d="M45 380H575M212 35V196H408V35M212 725V564H408V725" stroke="#82d9ff" strokeWidth="3"/>
    <circle cx="310" cy="380" r="76" stroke="#82d9ff" strokeWidth="3"/><circle cx="310" cy="380" r="51" stroke="#3986af" strokeWidth="2"/>
    <path d="M212 196A98 98 0 0 0 408 196M212 564A98 98 0 0 1 408 564M85 35V87A225 225 0 0 0 535 87V35M85 725V673A225 225 0 0 1 535 673V725" stroke="#82d9ff" strokeWidth="3"/>
    <path d="M273 85H347M273 675H347" stroke="#ffd18a" strokeWidth="7"/>
    <circle cx="310" cy="100" r="13" stroke="#ffd18a" strokeWidth="4"/><circle cx="310" cy="660" r="13" stroke="#ffd18a" strokeWidth="4"/>
   </svg>
   <span className="rgl-court-badge"><FaCrown/></span>
  </div>
  <div className="rgl-content">
   <span className="rgl-eyebrow"><span/> REAL COURTS. REAL COMPETITION.</span>
   <h2>YOUR NEXT<br/><em>COURT AWAITS.</em></h2>
   <p>Find your game. Make your name.<br/>Turn real basketball into your next achievement.</p>
   <button type="button" className="rgl-play" onClick={onExplore}><FaCompass/><span>{city?'ENTER '+city.toUpperCase():'EXPLORE VIRGINIA'}</span><FaArrowRight/></button>
   <div className="rgl-location"><FaCrosshairs/> {city||'Virginia'} <span>·</span> {city?'Your selected area':'Choose your city on the map'}</div>
  </div>
  <div className="rgl-objective">
   <span className="rgl-eyebrow"><FaFlagCheckered/> {signedIn?'YOUR NEXT MOVE':'START YOUR JOURNEY'}</span>
   <strong>{loading?'Syncing your journey…':signedIn&&journey?objective:signedIn?'Explore your next court':'Discover a court. Join a Run.'}</strong>
   <button type="button" onClick={onMissions}>{signedIn?'Open missions':'Explore player missions'} <FaArrowRight/></button>
  </div>
  <div className="rgl-bottom">
   <div className="rgl-level"><span className="rgl-level-shield">{progress?progress.level:<FaBolt/>}</span><div><small>{progress?'WORLD LEVEL '+progress.level:signedIn?'YOUR PLAYER JOURNEY':'YOUR BASKETBALL WORLD'}</small><strong>{progress?progress.xp.toLocaleString()+' XP':'Play. Progress. Represent.'}</strong></div></div>
   <div className="rgl-progress">{progress?<><div><span>Next level</span><b>{(progress.toNext-progress.within).toLocaleString()} XP to go</b></div><progress max={progress.toNext} value={progress.within} aria-label="World level progress"/></>:<p>Earn your place through verified play.</p>}</div>
   <button type="button" className="rgl-battle" aria-label="Court battles" onClick={onBattle}><FaPeopleGroup/><span>COURT BATTLES</span><FaArrowRight/></button>
  </div>
 </section>;
}
