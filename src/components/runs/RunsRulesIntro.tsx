'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {
 FaArrowLeft,FaArrowRight,FaBasketball,FaBookOpen,FaBolt,FaCrown,
 FaLocationDot,FaMedal,FaShieldHalved,FaXmark
} from 'react-icons/fa6';

/**
 * Game onboarding is deliberately explanatory, not a source of new rewards.
 * Actual results and eligibility are determined by the server-side Runs rules.
 */
const chapters=[
 {
  number:'01',short:'Explore',eyebrow:'SCOUT THE WORLD',title:'EVERY COURT IS AN ARENA.',
  icon:FaLocationDot,
  description:'Explore Virginia, find a real court or gym, and discover upcoming Runs in your area.',
  rules:[
   'Choose a city and open a court to see its schedule, local contenders and territory.',
   'Officially sourced courts are real locations—not promises of open gym time, a hosted game or guaranteed access.'
  ],
  punchline:'FIND THE COURT. FIND YOUR PEOPLE.'
 },
 {
  number:'02',short:'Play',eyebrow:'GET IN THE GAME',title:'SHOW UP. BALL OUT.',
  icon:FaBasketball,
  description:'Join a Run or organize your own. Play pickup, train, or compete in formats from 1v1 through 5v5.',
  rules:[
   'Register for a game and follow the organizer’s posted format, time and venue rules.',
   'Rankings, competitive results and court crowns count only after independent score or stat verification—not just an RSVP or check-in.'
  ],
  punchline:'REAL GAMES. REAL RESULTS.'
 },
 {
  number:'03',short:'Progress',eyebrow:'BUILD YOUR LEGACY',title:'EVERY VERIFIED GAME COUNTS.',
  icon:FaMedal,
  description:'Grow your World Level, earn Runs REP, and unlock badges tied to your achievements and the places you play.',
  rules:[
   'World XP tracks your lasting progress. REP is a separate spendable reward balance; competitive skill rating is separate too.',
   'A featured “2× VERIFIED REP” weekend Run doubles eligible verified game and reviewed-stat REP only—not ordinary check-ins or simply attending.'
  ],
  punchline:'COLLECT BADGES. MAKE A NAME.'
 },
 {
  number:'04',short:'Dominate',eyebrow:'OWN YOUR HOME COURT',title:'THE CROWN IS EARNED.',
  icon:FaCrown,
  description:'Each court has separate 1v1, 2v2 and 3v3 player Masters—and a crew fighting to control the territory.',
  rules:[
   'Qualified players rise on verified court-specific results. Eligible crews compete for control through local winning percentage.',
   'Challenge a controlling crew in a Takeover Run; only a verified outcome can transfer control. A successful defense can earn the designated bonus.'
  ],
  punchline:'YOUR PARK. YOUR LEGACY.'
 },
 {
  number:'05',short:'The code',eyebrow:'THE RULES OF RESPECT',title:'PROTECT THE GAME.',
  icon:FaShieldHalved,
  description:'Runs is a real community first. Bring competitive energy without losing respect for the players or the places.',
  rules:[
   'Play fair. Report honest results. No fake stats, harassment, intimidation or cheating for rankings or rewards.',
   'Respect park hours, local regulations, organizer instructions and everyone sharing the court. Public Runs are not guaranteed staffed events or reservations.'
  ],
  punchline:'COMPETE HARD. KEEP IT REAL.'
 }
] as const;

export function RunsRulesIntro({open,onClose}:{open:boolean;onClose:()=>void}){
 const [ready,setReady]=useState(false);
 const [step,setStep]=useState(0);
 const dialogRef=useRef<HTMLElement>(null);
 const headingRef=useRef<HTMLHeadingElement>(null);

 useEffect(()=>{setReady(true);},[]);
 useEffect(()=>{if(!open)setStep(0);},[open]);

 useEffect(()=>{
  if(!open||!ready)return;
  const previousOverflow=document.body.style.overflow;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  const handleKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab'||!dialogRef.current)return;
   const focusable=Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
    'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])'
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

 useEffect(()=>{if(open&&ready)headingRef.current?.focus({preventScroll:true});},[open,ready,step]);
 if(!open||!ready)return null;
 const chapter=chapters[step];
 const ChapterIcon=chapter.icon;

 return createPortal(
  <div className="fixed inset-0 z-[2000] flex min-h-[100dvh] items-center justify-center bg-[#02070e]/95 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-lg sm:p-6">
   <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="rch-rules-title" aria-describedby="rch-rules-description" tabIndex={-1}
    className="relative flex max-h-[calc(100dvh-24px)] w-full max-w-[810px] flex-col overflow-hidden rounded-[24px] border border-[#34658a] bg-[#081725] text-white shadow-[0_35px_110px_#000c] sm:rounded-[32px]">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
     <div className="absolute -right-24 -top-48 h-[440px] w-[440px] rounded-full border border-[#5086aa]/25"/>
     <div className="absolute -right-10 -top-36 h-[350px] w-[350px] rounded-full border border-dashed border-[#5086aa]/25"/>
     <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_15%,#18456675,transparent_55%)]"/>
    </div>
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[#2c516c] px-5 py-4 sm:px-8">
     <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#7ac4f0]/50 bg-[#153b58] text-lg text-[#a4e1ff]"><FaBookOpen aria-hidden="true"/></span>
      <div><p className="text-[10px] font-black uppercase tracking-[.19em] text-[#9bd5f5]">RCH · Runs World</p>
       <p className="text-sm font-black tracking-wide text-white">THE PLAYER RULEBOOK</p></div>
     </div>
     <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#3b6583] px-3 text-xs font-bold text-[#d3e8f6] hover:bg-[#19394e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c8f06d]">
      Skip <FaXmark aria-hidden="true"/>
     </button>
    </header>
    <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-7">
     <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[.17em] text-[#acd5ed]">
      <span>How to play · {chapter.eyebrow}</span><span className="tabular-nums">{chapter.number} / 05</span>
     </div>
     <div className="mt-3 grid grid-cols-5 gap-2" role="progressbar" aria-label="Rules introduction progress" aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={chapters.length}>
      {chapters.map((item,index)=><span key={item.number} aria-hidden="true" className={'h-1.5 rounded-full '+(index<=step?'bg-[#c8f06d]':'bg-[#2b4e66]')}/>)}
     </div>
     <div className="mt-6 flex flex-wrap items-start gap-5 sm:gap-7">
      <div className="grid h-[86px] w-[86px] shrink-0 place-items-center rounded-2xl border border-[#89c7ed]/60 bg-gradient-to-br from-[#265f85] to-[#0c263d] text-[40px] text-[#d4f1ff] shadow-[0_0_35px_#3b91d329]">
       <ChapterIcon aria-hidden="true"/>
      </div>
      <div className="min-w-0 flex-1">
       <p className="text-xs font-black uppercase tracking-[.16em] text-[#c8f06d]">Rule {chapter.number} · {chapter.short}</p>
       <h2 ref={headingRef} tabIndex={-1} id="rch-rules-title" className="mt-2 max-w-[540px] text-3xl font-black uppercase leading-[1.02] tracking-[-.04em] text-white outline-none sm:text-[46px]">{chapter.title}</h2>
      </div>
     </div>
     <p id="rch-rules-description" className="mt-5 text-sm leading-6 text-[#c7e0ef] sm:text-base sm:leading-7">{chapter.description}</p>
     <div className="mt-5 space-y-3" aria-live="polite">
      {chapter.rules.map((rule,index)=><div key={index} className="flex gap-3 rounded-xl border border-[#315873] bg-[#0c263a] px-4 py-3.5">
       <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#c8f06d] text-xs font-black text-[#102014]">{index+1}</span>
       <p className="text-[13px] leading-[1.55] text-[#e0eef7] sm:text-sm">{rule}</p>
      </div>)}
     </div>
     <div className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-[#c8f06d]"><FaBolt aria-hidden="true"/>{chapter.punchline}</div>
     <p className="mt-3 text-[11px] leading-5 text-[#8db1ca]">Game progress reflects real-world play and verified records. Park access, schedules and eligibility can change.</p>
    </div>
    <footer className="relative z-10 flex shrink-0 items-center gap-2 border-t border-[#2c516c] bg-[#071522] px-5 py-4 sm:px-8">
     <button type="button" onClick={()=>setStep(current=>Math.max(0,current-1))} disabled={step===0}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#416e8b] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35 sm:text-sm">
      <FaArrowLeft aria-hidden="true"/> Back
     </button>
     <span className="ml-auto hidden text-xs font-semibold text-[#9fbed1] sm:inline">{chapter.short.toUpperCase()} · {chapters.length-step-1} TO GO</span>
     {step===chapters.length-1?
      <button type="button" onClick={onClose} className="ml-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e1ffa4] bg-[#c8f06d] px-5 text-xs font-black text-[#132418] sm:ml-0 sm:text-sm">ENTER RUNS WORLD <FaArrowRight aria-hidden="true"/></button>:
      <button type="button" onClick={()=>setStep(current=>Math.min(chapters.length-1,current+1))} className="ml-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e1ffa4] bg-[#c8f06d] px-5 text-xs font-black text-[#132418] sm:ml-0 sm:text-sm">NEXT RULE <FaArrowRight aria-hidden="true"/></button>}
    </footer>
   </section>
  </div>,
  document.body
 );
}
