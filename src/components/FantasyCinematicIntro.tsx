'use client';
import { useCallback,useEffect,useState } from 'react';
import { FaArrowRight,FaChartSimple,FaCrown,FaTrophy,FaUsers } from 'react-icons/fa6';
import './FantasyCinematicIntro.css';
const KEY='rcl_fantasy_intro_seen_session_v1';
export function FantasyCinematicIntro(){
 const[show,setShow]=useState(false),[elapsed,setElapsed]=useState(0);
 const close=useCallback(()=>{try{sessionStorage.setItem(KEY,'1')}catch{}setShow(false)},[]);
 useEffect(()=>{try{if(sessionStorage.getItem(KEY)==='1')return}catch{}setShow(true)},[]);
 useEffect(()=>{if(!show)return;const start=performance.now(),tick=setInterval(()=>setElapsed(Math.min(11,(performance.now()-start)/1000)),50),done=setTimeout(close,11000);return()=>{clearInterval(tick);clearTimeout(done)}},[show,close]);
 if(!show)return null;
 return <div className="fantasy-intro" role="dialog" aria-label="RCL Fantasy intro">
  <div className="fi-arena"/><div className="fi-lights"><i/><i/><i/><i/></div><div className="fi-city"/>
  <div className="fi-player"><i className="fi-head"/><i className="fi-body"/><b>RCL</b></div>
  <div className="fi-side">
   <article><FaUsers/><p><b>DRAFT YOUR SQUAD</b><span>Build a team. Your way.</span></p></article>
   <article><FaChartSimple/><p><b>MANAGE ALL SEASON</b><span>Make moves. Set lineups.</span></p></article>
   <article><FaTrophy/><p><b>COMPETE WITH THE LEAGUE</b><span>Climb the leaderboard.</span></p></article>
   <article><FaCrown/><p><b>WIN REAL GLORY</b><span>Bragging rights are forever.</span></p></article>
  </div>
  <div className="fi-center"><small>REAL PLAYERS. REAL GAMES. REAL STAKES.</small><div className="fi-crown"><FaCrown/></div><h1>RCL <em>FANTASY</em></h1><h2>BUILD YOUR <span>LEGACY</span></h2><p>DRAFT · MANAGE · COMPETE · WIN</p><button onClick={close}>LET'S PLAY <FaArrowRight/></button></div>
  <div className="fi-ball"><i/><b>RCL</b><small>FANTASY</small></div>
  <div className="fi-panels"><article><b>DRAFT</b><span>THE TALENT.</span></article><article><b>MANAGE</b><span>THE JOURNEY.</span></article><article><b>COMPETE</b><span>EVERY WEEK.</span></article><article><b>BE A</b><span>LEGEND.</span></article></div>
  <div className="fi-tag">FANTASY<br/><b>BUILT DIFFERENT.</b></div>
  <div className="fi-ticker"><b>RCL FANTASY</b><span>REAL MANAGERS. REAL FANS. REAL BASKETBALL.</span><i>PLAYERS TODAY. LEGENDS TOMORROW.</i></div>
  <button className="fi-skip" onClick={close}>SKIP INTRO ›</button>
  <div className="fi-progress"><i><span style={{width:(elapsed/11*100)+'%'}}/></i><b>{String(Math.min(11,Math.ceil(elapsed))).padStart(2,'0')} / 11</b></div>
 </div>
}