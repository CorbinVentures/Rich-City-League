'use client';

import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import type {IconType} from 'react-icons';
import {FaArrowLeft,FaArrowRight,FaBasketball,FaBolt,FaCheck,FaCrown,FaLocationDot,FaRepeat,FaShieldHalved,FaTrophy,FaXmark} from 'react-icons/fa6';
import Link from 'next/link';
import {SYB_CIRCUIT_BADGES,type SybBadgeConcept} from '@/lib/syb-badges';
import styles from './SybBadgeLab.module.css';

const icons:Record<SybBadgeConcept['icon'],IconType>={basketball:FaBasketball,trophy:FaTrophy,repeat:FaRepeat,bolt:FaBolt,location:FaLocationDot,crown:FaCrown};
const concepts=SYB_CIRCUIT_BADGES;

function SybMedal({badge,large=false}:{badge:SybBadgeConcept;large?:boolean}){
 const Icon=icons[badge.icon];
 return <div className={styles.medalScene} data-tier={badge.tier} data-code={badge.code} data-large={large||undefined} role="img" aria-label={badge.name+' SYB badge design'}>
  <span className={styles.medalAura}/>
  <span className={styles.medalCoin}>
   <span className={styles.medalEdge}/>
   <span className={styles.medalFace}>
    <span className={styles.medalRim}/>
    <span className={styles.medalBrand}>SYB</span>
    <Icon className={styles.medalIcon}/>
    <span className={styles.medalMark}>{badge.mark}</span>
    <span className={styles.medalGloss}/>
   </span>
  </span>
 </div>;
}

export default function SybBadgeLab(){
 const [active,setActive]=useState<SybBadgeConcept|null>(null);
 const stageRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!active)return;
  const previous=document.body.style.overflow;
  const previousFocus=document.activeElement as HTMLElement|null;
  document.body.style.overflow='hidden';
  const focusFrame=window.requestAnimationFrame(()=>stageRef.current?.querySelector<HTMLButtonElement>('.'+styles.close)?.focus());
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){setActive(null);return;}
   if(event.key!=='Tab')return;
   const buttons=stageRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
   if(!buttons?.length)return;
   const first=buttons[0],last=buttons[buttons.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  window.addEventListener('keydown',onKey);
  return()=>{window.cancelAnimationFrame(focusFrame);document.body.style.overflow=previous;window.removeEventListener('keydown',onKey);previousFocus?.focus();};
 },[active]);

 return <main className={styles.page}>
  <div className={styles.gridGlow} aria-hidden="true"/>
  <div className={styles.wrap}>
   <nav className={styles.nav} aria-label="Badge design navigation">
    <Link href="/runs/partners/syb-hoop-richmond" className={styles.back}><FaArrowLeft/> Back to SYB</Link>
    <span className={styles.navBrand}><i/> SYB HOOPS <b>×</b> RCH RUNS</span>
   </nav>
   <header className={styles.hero}>
    <div className={styles.heroCopy}>
     <p className={styles.kicker}><span/> BADGE DESIGN LAB · CONCEPT PREVIEW</p>
     <h1>Earned in the run.<br/><em>Carried in the record.</em></h1>
     <p className={styles.intro}>A six-piece 1v1 collection built around real SYB moments: showing up, winning, settling a rivalry, and defending the crown.</p>
     <div className={styles.heroMeta}><span><b>06</b> CIRCUIT CRESTS</span><span><b>03×</b> OFFICIAL EVENT XP</span><span><b>ONLY</b> VERIFIED RESULTS</span></div>
    </div>
    <div className={styles.heroMedal}>
     <div className={styles.heroOrbit} aria-hidden="true"/>
     <SybMedal badge={concepts[5]} large/>
     <div className={styles.heroCaption}><FaCrown/><span><b>THE CROWN STAYS</b><small>Championship lineage</small></span></div>
    </div>
   </header>

   <section className={styles.designNote} aria-label="Design preview notice">
    <FaShieldHalved/>
    <p><b>PREVIEW ONLY · NO PLAYER RECORDS SHOWN</b><span>Five badge rules can be proven from verified SYB 1v1 results. The championship crest stays a future design until official circuit-title tracking exists.</span></p>
   </section>

   <section className={styles.collection}>
    <div className={styles.sectionHead}>
     <div><p className={styles.kicker}>THE SYB CIRCUIT SET</p><h2>Six moments.<br/><em>One record.</em></h2></div>
     <p>Every badge needs a verified receipt. Preview the reveal to feel how the unlock could land after the final score is confirmed.</p>
    </div>
    <div className={styles.cardGrid}>
     {concepts.map((badge,index)=>{
      const Icon=icons[badge.icon];
      return <article className={styles.card} key={badge.code} style={{'--card-index':index} as CSSProperties}>
       <div className={styles.cardTop}><span>{badge.category}</span><span className={badge.awardable?styles.ruleReady:styles.locked}><span/> {badge.awardable?'VERIFIED RULE':'FUTURE TITLE'}</span></div>
       <button type="button" className={styles.medalButton} onClick={()=>setActive(badge)} aria-label={'Preview '+badge.name+' unlock animation'}>
        <SybMedal badge={badge}/><span className={styles.inspect}>PREVIEW REVEAL <FaArrowRight/></span>
       </button>
       <div className={styles.cardText}><p>{badge.tier} CREST</p><h3>{badge.name}</h3><span className={styles.story}>{badge.story}</span></div>
       <div className={styles.rule}><Icon/><span><b>HOW IT COULD BE EARNED</b>{badge.requirement}</span></div>
       <button className={styles.cardAction} type="button" onClick={()=>setActive(badge)}>Preview unlock <FaArrowRight/></button>
      </article>;
     })}
    </div>
   </section>

   <section className={styles.revealSpec}>
    <div className={styles.revealDemo} aria-hidden="true"><div className={styles.demoCourt}/><div className={styles.demoFlash}/><SybMedal badge={concepts[2]} large/></div>
    <div><p className={styles.kicker}>THE UNLOCK MOMENT</p><h2>Make the moment<br/><em>feel official.</em></h2><p className={styles.revealCopy}>The score locks. The court drops to black. A red floor line cuts through the screen, the crest hits with a metallic snap, and the verified proof appears under it.</p><ol className={styles.beats}><li><b>01</b><span>FINAL SCORE VERIFIED<small>The reveal waits for a confirmed result.</small></span></li><li><b>02</b><span>CREST BREAKS THROUGH<small>One short impact, light sweep, then stillness.</small></span></li><li><b>03</b><span>PROOF GETS ADDED<small>Opponent, event, score and earned date travel with the badge.</small></span></li></ol></div>
   </section>

   <footer className={styles.footer}><span>SYB × RCH RUNS · BADGE DESIGN STUDY</span><span>Motion respects reduced-motion settings.</span></footer>
  </div>

  {active&&<div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="syb-unlock-title" onMouseDown={event=>{if(event.target===event.currentTarget)setActive(null);}}>
   <div ref={stageRef} className={styles.stage} data-badge={active.code}>
    <div className={styles.spotlight}/><div className={styles.floorLines}/><div className={styles.redSlash}/><div className={styles.impactRing}/><div className={styles.particles}/>
    <button className={styles.close} type="button" onClick={()=>setActive(null)} aria-label="Close reveal preview"><FaXmark/></button>
    <p className={styles.revealKicker}><span/> UNLOCK ANIMATION · PREVIEW <span/></p>
    <div className={styles.revealMedal}><SybMedal badge={active} large/></div>
    <p className={styles.revealLabel}>THE CIRCUIT CREST</p>
    <h2 id="syb-unlock-title">{active.name}</h2>
    <p className={styles.proof}><FaCheck/> TRIGGER · VERIFIED MATCH RESULT</p>
    <p className={styles.revealStory}>{active.story}</p>
    <div className={styles.proofStrip} aria-label="Proof details attached to an earned badge"><span><small>EVENT</small>SYB 1V1</span><span><small>RESULT</small>VERIFIED SCORE</span><span><small>RECORD</small>PERMANENT</span></div>
    <div className={styles.revealFooter}><span><FaTrophy/> ADDED TO YOUR SYB RECORD</span><button type="button" onClick={()=>setActive(null)}>Continue <FaArrowRight/></button></div>
   </div>
  </div>}
 </main>;
}
