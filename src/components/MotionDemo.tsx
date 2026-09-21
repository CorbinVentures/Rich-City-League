'use client';
import { useEffect,useState } from 'react';
import { FaPause,FaPlay } from 'react-icons/fa6';
import './MotionDemo.css';

type Props={title:string;skill:string;prescription:string;coachingPoints:string[];commonMistakes:string[]};

export function MotionDemo({title,skill,prescription,coachingPoints,commonMistakes}:Props){
 const[playing,setPlaying]=useState(true);
 const[mode,setMode]=useState<'watch'|'breakdown'|'angles'|'mistakes'>('watch');
 const[view,setView]=useState<'front'|'side'|'rear'>('front');
 const[progress,setProgress]=useState(0);
 useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>setProgress(v=>(v+1)%101),120);return()=>window.clearInterval(id)},[playing]);
 return <div className="motion-demo">
  <header><div><small>{skill.toUpperCase()} · RCL MOTION LAB</small><h4>{title}</h4></div><b>{prescription}</b></header>
  <div className="motion-stage">
   <div className="motion-floor"/><div className="motion-hoop"><i/><b/></div><div className="motion-arc"/>
   <div className={'motion-model '+view+(playing?' is-playing':'')}>
    <span className="motion-head"/><span className="motion-body"/><i className="arm left"/><i className="arm right"/><i className="leg left"/><i className="leg right"/><em className="motion-ball"/>
   </div>
   <div className="callout elbow"><b>ELBOW ALIGNMENT</b><span>Under the ball</span></div>
   <div className="callout balance"><b>BALANCE</b><span>Stay centered</span></div>
   <div className="telemetry"><span>ARC <b>48°</b></span><span>RELEASE <b>0.42s</b></span><span>VIEW <b>{view.toUpperCase()}</b></span></div>
  </div>
  <div className="motion-player"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><i><span style={{width:progress+'%'}}/></i><b>{Math.round(progress*12/100)} / 12s</b></div>
  <nav className="motion-tabs">
   <button className={mode==='watch'?'active':''} onClick={()=>setMode('watch')}>WATCH<small>Full speed</small></button>
   <button className={mode==='breakdown'?'active':''} onClick={()=>setMode('breakdown')}>BREAKDOWN<small>Coaching cues</small></button>
   <button className={mode==='angles'?'active':''} onClick={()=>setMode('angles')}>MULTI ANGLE<small>Front · Side · Rear</small></button>
   <button className={mode==='mistakes'?'active':''} onClick={()=>setMode('mistakes')}>MISTAKES<small>What not to do</small></button>
  </nav>
  {mode==='breakdown'&&<div className="motion-chips">{coachingPoints.map(x=><span key={x}>✓ {x}</span>)}</div>}
  {mode==='mistakes'&&<div className="motion-chips bad">{commonMistakes.map(x=><span key={x}>× {x}</span>)}</div>}
  {mode==='angles'&&<div className="motion-chips">{(['front','side','rear'] as const).map(x=><button key={x} className={view===x?'selected':''} onClick={()=>setView(x)}>{x.toUpperCase()} VIEW</button>)}</div>}
  <footer><b>RCL MOTION LAB</b><span>Interactive technique visualization</span></footer>
 </div>
}