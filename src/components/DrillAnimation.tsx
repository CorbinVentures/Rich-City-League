'use client';
import { useState } from 'react';
import { FaPause,FaPlay,FaRotateRight } from 'react-icons/fa6';
import './DrillAnimation.css';

type Props={skill:string;title:string;focus:string[]};

export function DrillAnimation({skill,title,focus}:Props){
 const [playing,setPlaying]=useState(true);
 const [speed,setSpeed]=useState(1);
 const key=skill.toLowerCase().replace(/[^a-z]/g,'-');
 return <div className={'drill-animation '+(playing?'is-playing':'is-paused')} style={{'--speed':`${1/speed}s`} as React.CSSProperties}>
  <div className="da-stage">
   <div className="da-score"><b>RCL MOTION</b><span>{title}</span></div>
   <div className="da-court"><i className="da-key"/><i className="da-three"/><i className="da-rim"/></div>
   <div className={'da-athlete '+key}><i className="head"/><i className="body"/><i className="arm a1"/><i className="arm a2"/><i className="leg l1"/><i className="leg l2"/></div>
   <i className={'da-ball '+key}/>
   <div className={'da-path '+key}/>
   <div className="da-cue">{focus.slice(0,3).map((x,i)=><span key={x}><b>0{i+1}</b>{x}</span>)}</div>
   <div className="da-live">LIVE MOTION <i/></div>
  </div>
  <div className="da-controls"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><div><i/></div><button onClick={()=>setSpeed(v=>v===1?0.5:v===0.5?1.5:1)}>{speed}x</button><button onClick={()=>{setPlaying(false);requestAnimationFrame(()=>setPlaying(true))}}><FaRotateRight/></button></div>
 </div>
}