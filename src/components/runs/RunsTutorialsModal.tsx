'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {
 FaArrowLeft,FaArrowRight,FaBasketball,FaBolt,FaBookOpen,FaCompass,
 FaLocationDot,FaPlus,FaShieldHalved,FaUsers,FaXmark
} from 'react-icons/fa6';
import './runs-tutorials-modal.css';

type TutorialId='find'|'host'|'complete';
type TutorialStep={
 title:string;
 detail:string;
 tip:string;
 preview:string;
 icon:typeof FaCompass;
};
type Tutorial={
 id:TutorialId;
 label:string;
 subtitle:string;
 intro:string;
 icon:typeof FaCompass;
 steps:TutorialStep[];
 launch:{href:string;label:string};
};

const tutorials:Tutorial[]=[
 {
  id:'find',
  label:'Find a Run',
  subtitle:'Get from the game board to a real roster spot.',
  intro:'Find a scheduled game, check the details, and join its roster.',
  icon:FaCompass,
  steps:[
   {title:'Open the Run board',detail:'Tap Find a Run to see scheduled games near your selected area.',tip:'You can switch cities or use the statewide list.',preview:'FIND A REAL GAME',icon:FaCompass},
   {title:'Choose a game card',detail:'Open a Run card to see its event page, players, format and host.',tip:'A court pin is a location. It does not mean a game is scheduled there.',preview:'OPEN THE EVENT',icon:FaLocationDot},
   {title:'Check before you join',detail:'Review the time, venue, format, and whether the roster is still open.',tip:'If a Run is full, past, or unavailable, choose another listing.',preview:'CHECK THE DETAILS',icon:FaShieldHalved},
   {title:'Claim your roster spot',detail:'Join the actual event from its lobby. You can return there for game-day details.',tip:'An RSVP saves a roster spot. You still need to arrive and check in at the court.',preview:'JOIN THE ROSTER',icon:FaUsers}
  ],
  launch:{href:'/runs?view=list#rch-upcoming-runs',label:'OPEN RUN FINDER'}
 },
 {
  id:'host',
  label:'Host Pickup',
  subtitle:'Set up the game so players know where to be.',
  intro:'Create a real pickup event with the details your players need.',
  icon:FaPlus,
  steps:[
   {title:'Start a hosted Run',detail:'Tap Host Pickup from the Runs home screen to open the setup form.',tip:'Hosting creates a scheduled event. A court suggestion by itself is not a hosted Run.',preview:'OPEN HOST SETUP',icon:FaPlus},
   {title:'Set the game details',detail:'Add a title, court, date, start time, format, and the player capacity.',tip:'Check venue hours and access before you publish the location.',preview:'COURT · TIME · FORMAT',icon:FaLocationDot},
   {title:'Review and publish',detail:'Confirm the event details so players can decide if the game works for them.',tip:'Use a clear format and start time. Players rely on the event page for the plan.',preview:'POST THE GAME',icon:FaShieldHalved},
   {title:'Bring your players in',detail:'Share the Run with your crew, then manage the real roster from the event lobby.',tip:'On game day, give the check-in code to players at the court in person.',preview:'OPEN YOUR RUN LOBBY',icon:FaUsers}
  ],
  launch:{href:'/runs?create=1',label:'START HOSTING'}
 },
 {
  id:'complete',
  label:'Complete a Game',
  subtitle:'Go from RSVP to play, score review, and verified progress.',
  intro:'The game is complete when the real play and its result are recorded correctly.',
  icon:FaBasketball,
  steps:[
   {title:'Open your Run lobby',detail:'Join an upcoming Run, then use its event page for your roster and game-day plan.',tip:'Your RSVP is not a court check-in.',preview:'ENTER THE RUN LOBBY',icon:FaUsers},
   {title:'Check in at the court',detail:'When you arrive, enter the current code shared by the host at the venue.',tip:'Only check in when you are physically at the court with the event host.',preview:'ARRIVE · CHECK IN',icon:FaLocationDot},
   {title:'Follow the game flow',detail:'Use Next Up when you are ready to play, and follow the host’s calls for the live game.',tip:'A score entered in the lobby is a record. It is not automatically a verified result.',preview:'GET ON THE COURT',icon:FaBasketball},
   {title:'Review the final score',detail:'For ranked games, check the official score review and confirm or dispute the result with your team.',tip:'Rank, verified rewards, and titles update only after the required independent confirmation.',preview:'CONFIRM THE RESULT',icon:FaShieldHalved}
  ],
  launch:{href:'/runs?view=list#rch-upcoming-runs',label:'FIND A RUN TO PLAY'}
 }
];

export function RunsTutorialsModal({open,onClose,onOpenRules}:{open:boolean;onClose:()=>void;onOpenRules:()=>void}){
 const [ready,setReady]=useState(false);
 const [selected,setSelected]=useState<TutorialId>('find');
 const [step,setStep]=useState(0);
 const dialogRef=useRef<HTMLElement>(null);
 const headingRef=useRef<HTMLHeadingElement>(null);

 useEffect(()=>{setReady(true);},[]);
 useEffect(()=>{if(!open){setSelected('find');setStep(0);}},[open]);
 useEffect(()=>{
  if(!open||!ready)return;
  const previousOverflow=document.body.style.overflow;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  const handleKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab'||!dialogRef.current)return;
   const focusable=Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
    'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
   )).filter(element=>element.getClientRects().length>0);
   if(!focusable.length){event.preventDefault();dialogRef.current.focus();return;}
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!dialogRef.current.contains(document.activeElement))){
    event.preventDefault();first.focus();
   }
  };
  document.addEventListener('keydown',handleKeyDown);
  return ()=>{
   document.removeEventListener('keydown',handleKeyDown);
   document.body.style.overflow=previousOverflow;
   previousFocus?.focus({preventScroll:true});
  };
 },[open,ready,onClose]);
 useEffect(()=>{if(open&&ready)headingRef.current?.focus({preventScroll:true});},[open,ready,selected,step]);

 if(!open||!ready)return null;
 const tutorial=tutorials.find(item=>item.id===selected)||tutorials[0];
 const current=tutorial.steps[step];
 const Icon=current.icon;
 const lastStep=step===tutorial.steps.length-1;

 return createPortal(
  <div className="rrt-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
   <section ref={dialogRef} className="rrt-panel" role="dialog" aria-modal="true" aria-labelledby="rrt-title" aria-describedby="rrt-description" tabIndex={-1}>
    <header className="rrt-header">
     <div className="rrt-brand"><span className="rrt-brand-icon"><FaBasketball aria-hidden="true"/></span><span><strong>RCH RUNS</strong><small>QUICK TUTORIALS</small></span></div>
     <button type="button" className="rrt-close" onClick={onClose} aria-label="Close Runs tutorials"><FaXmark aria-hidden="true"/></button>
    </header>
    <div className="rrt-content">
     <div className="rrt-intro">
      <div><span className="rrt-eyebrow"><FaBolt aria-hidden="true"/> YOUR NEXT MOVE</span>
       <h2 id="rrt-title">Know your next move.</h2>
       <p id="rrt-description">Pick a quick guide. Follow the steps, then jump straight into Runs.</p></div>
      <button type="button" className="rrt-rules-link" onClick={onOpenRules}><FaBookOpen aria-hidden="true"/> Full player rulebook <FaArrowRight aria-hidden="true"/></button>
     </div>
     <div className="rrt-tabs" role="tablist" aria-label="Choose a Runs tutorial">
      {tutorials.map(item=><button key={item.id} id={'rrt-tab-'+item.id} type="button" role="tab" aria-selected={item.id===selected}
       aria-controls="rrt-tutorial-panel" onClick={()=>{setSelected(item.id);setStep(0);}}>
       <item.icon aria-hidden="true"/><span>{item.label}</span>
      </button>)}
     </div>
     <section id="rrt-tutorial-panel" className="rrt-step-panel" role="tabpanel" aria-labelledby={'rrt-tab-'+tutorial.id}>
      <div className="rrt-visual" aria-hidden="true">
       <div className="rrt-visual-screen">
        <div className="rrt-visual-top"><span>RCH RUNS <FaBasketball/></span><small>FIELD GUIDE / {tutorial.id.toUpperCase()}</small></div>
        <div className="rrt-visual-copy"><span>STEP {String(step+1).padStart(2,'0')} / {String(tutorial.steps.length).padStart(2,'0')}</span><strong>{current.preview}</strong></div>
        <div className="rrt-route" aria-hidden="true">{tutorial.steps.map((item,index)=><span key={item.title} className={index<=step?'complete':''}><i>{index<step?'✓':String(index+1).padStart(2,'0')}</i><b>{item.preview}</b></span>)}</div>
        <div className="rrt-visual-callout"><Icon/><span>{current.title}</span><FaArrowRight/></div>
       </div>
      </div>
      <div className="rrt-step-copy">
       <div className="rrt-step-meta"><span>{tutorial.label.toUpperCase()}</span><span>{String(step+1).padStart(2,'0')} / {String(tutorial.steps.length).padStart(2,'0')}</span></div>
       <div className="rrt-progress" role="progressbar" aria-label={tutorial.label+' tutorial progress'} aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={tutorial.steps.length}>
        {tutorial.steps.map((item,index)=><span key={item.title} className={index<=step?'complete':''}/>)}
       </div>
       <h3 ref={headingRef} tabIndex={-1}>{current.title}</h3>
       <p className="rrt-detail">{current.detail}</p>
       <div className="rrt-tip"><FaShieldHalved aria-hidden="true"/><span>{current.tip}</span></div>
       <p className="rrt-tutorial-intro">{tutorial.intro}</p>
      </div>
     </section>
    </div>
    <footer className="rrt-footer">
     <button type="button" className="rrt-back" onClick={()=>setStep(value=>Math.max(0,value-1))} disabled={step===0}><FaArrowLeft aria-hidden="true"/> Back</button>
     <span className="rrt-footer-count">{tutorial.label} · {step+1} of {tutorial.steps.length}</span>
     {lastStep?
      <Link href={tutorial.launch.href} onClick={onClose} className="rrt-next rrt-launch">{tutorial.launch.label} <FaArrowRight aria-hidden="true"/></Link>:
      <button type="button" className="rrt-next" onClick={()=>setStep(value=>Math.min(tutorial.steps.length-1,value+1))}>Next step <FaArrowRight aria-hidden="true"/></button>}
    </footer>
   </section>
  </div>,
  document.body
 );
}
