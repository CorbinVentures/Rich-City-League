'use client';

import {FaArrowRight,FaBasketball,FaBolt,FaDumbbell,FaLocationDot,FaPeopleGroup,FaPlus} from 'react-icons/fa6';

type Mode='competitive'|'social'|'training';
const modes:Array<{id:Mode;label:string;icon:typeof FaBolt}>=[
 {id:'competitive',label:'Competitive',icon:FaBolt},
 {id:'social',label:'Social',icon:FaPeopleGroup},
 {id:'training',label:'Training',icon:FaDumbbell}
];

export function RunArenaHero({activeMode,onFind,onHost,onMode}:{
 activeMode:Mode|'all';onFind:()=>void;onHost:()=>void;onMode:(mode:Mode|'all')=>void;
}){
 return <header className="rch-ux-hero relative isolate overflow-hidden">
  <div className="rch-ux-hero-grid pointer-events-none absolute inset-0" aria-hidden="true"/>
  <div className="rch-ux-hoop-stage pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] items-center justify-center md:flex" aria-hidden="true">
   <svg className="max-h-72 w-full max-w-[410px]" viewBox="0 0 440 310" fill="none">
    <defs><linearGradient id="rcharenahoop" x1="0" y1="0" x2="440" y2="310"><stop stopColor="#4CB2FF"/><stop offset="1" stopColor="#D5F2FF"/></linearGradient></defs>
    <circle cx="247" cy="152" r="125" stroke="#3373BA" strokeOpacity=".16" strokeWidth="2"/>
    <circle cx="247" cy="152" r="99" stroke="#71BFFB" strokeOpacity=".14" strokeWidth="1"/>
    <rect x="160" y="52" width="172" height="116" rx="3" stroke="url(#rcharenahoop)" strokeWidth="6"/>
    <rect x="207" y="85" width="80" height="64" stroke="#D8ECFF" strokeWidth="3"/>
    <path d="M201 171 C208 217 215 234 245 252 C273 234 283 218 290 171" stroke="#D8ECFF" strokeWidth="2.5" strokeDasharray="6 7"/>
    <ellipse cx="245" cy="168" rx="53" ry="14" stroke="#FFAF6B" strokeWidth="7"/>
    <path d="M195 169 209 224M217 177 226 240M245 181V251M273 177 265 240M295 169 282 224M207 210 282 225M206 222 272 237" stroke="#C4E3FF" strokeWidth="2"/>
    <path d="M332 52V296" stroke="#285582" strokeWidth="10"/>
    <path d="M245 52V17" stroke="#76B4E6" strokeOpacity=".5" strokeWidth="2"/>
   </svg>
  </div>
  <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-9">
   <p className="rch-ux-eyebrow"><FaLocationDot aria-hidden="true"/> RCH RUNS · VIRGINIA BASKETBALL</p>
   <h1 className="rch-ux-hero-title">YOUR COURT.<br/><span>YOUR LEGACY.</span></h1>
   <p className="rch-ux-hero-description">Find real games, make your name, and bring your crew. From your neighborhood court to the Commonwealth.</p>
   <div className="rch-ux-hero-actions">
    <button type="button" onClick={onFind} className="rch-ux-btn-primary"><FaBasketball aria-hidden="true"/> Find a Run <FaArrowRight aria-hidden="true"/></button>
    <button type="button" onClick={onHost} className="rch-ux-btn-secondary"><FaPlus aria-hidden="true"/> Host a Run</button>
   </div>
  </div>
  <div className="rch-ux-hero-modes" role="group" aria-label="Find games by play style">
   <button type="button" aria-pressed={activeMode==='all'} onClick={()=>onMode('all')} className="rch-ux-mode"><FaBasketball aria-hidden="true"/> All Runs</button>
   {modes.map(({id,label,icon:Icon})=><button key={id} type="button" aria-pressed={activeMode===id} onClick={()=>onMode(id)} className="rch-ux-mode"><Icon aria-hidden="true"/>{label}</button>)}
  </div>
 </header>;
}
