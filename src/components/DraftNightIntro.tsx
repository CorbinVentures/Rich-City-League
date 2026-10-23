'use client';
import { useCallback,useEffect,useState } from 'react';
import './DraftNightIntro.css';
const KEY='rch_official_draft_intro_seen_v2';
const DURATION_SECONDS=4;
export function DraftNightIntro(){
 const[show,setShow]=useState(false),[elapsed,setElapsed]=useState(0);
 const close=useCallback(()=>{try{localStorage.setItem(KEY,'1')}catch{}setShow(false)},[]);
 useEffect(()=>{try{if(localStorage.getItem(KEY)==='1')return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){localStorage.setItem(KEY,'1');return}}catch{}setShow(true)},[]);
 useEffect(()=>{if(!show)return;const start=performance.now(),tick=setInterval(()=>setElapsed(Math.min(DURATION_SECONDS,(performance.now()-start)/1000)),50),done=setTimeout(close,DURATION_SECONDS*1000);return()=>{clearInterval(tick);clearTimeout(done)}},[show,close]);
 if(!show)return null;
 return <div className="draft-intro" role="dialog" aria-label="RCL Draft Night intro">
  <div className="dni-arena"/><div className="dni-lights"><i/><i/><i/><i/></div><div className="dni-board">
   <small>RICH CITY LEAGUE</small><b>OFFICIAL SEASON DRAFT</b><strong>THE FUTURE<br/>IS ON THE CLOCK.</strong>
   <div className="dni-clock">{'REAL SEASON · REAL ROSTERS'}</div>
  </div>
  <div className="dni-card one"><span>ROUND 01</span><b>THE BOARD IS OPEN</b><i>RICHMOND, VA</i></div>
  <div className="dni-card two"><span>SCOUTING</span><b>REAL PLAYERS</b><i>REAL OPPORTUNITY</i></div>
  <div className="dni-pick"><small>WITH THE NEXT PICK</small><h1>RCL<br/><span>DRAFT NIGHT.</span></h1><p>EVERY NAME CHANGES THE BOARD.</p></div>
  <div className="dni-ticker"><span>OFFICIAL SEASON BOARD</span><b>•</b><span>PLAYER RATINGS</span><b>•</b><span>TEAM WAR ROOMS</span><b>•</b><span>REAL-TIME PICKS</span></div>
  <div className="dni-stage"><i className="dni-ball"/><b>RCL</b><span>DRAFT<br/>NIGHT</span></div>
  <button onClick={close}>SKIP INTRO ›</button>
  <div className="dni-progress"><i><span style={{width:(elapsed/DURATION_SECONDS*100)+'%'}}/></i><b>{String(Math.min(DURATION_SECONDS,Math.ceil(elapsed))).padStart(2,'0')} / 04</b></div>
 </div>
}