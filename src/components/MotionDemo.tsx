'use client';
import { useEffect,useState } from 'react';
import { FaPause,FaPlay,FaVolumeHigh,FaExpand,FaChartLine,FaVideo,FaTriangleExclamation,FaLightbulb } from 'react-icons/fa6';
import './MotionDemo.css';

type Props={title:string;skill:string;prescription:string;coachingPoints:string[];commonMistakes:string[]};
const athletePhoto='https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=90';

export function MotionDemo({title,skill,prescription,coachingPoints,commonMistakes}:Props){
 const[playing,setPlaying]=useState(true),[mode,setMode]=useState<'watch'|'breakdown'|'angles'|'mistakes'>('watch'),[view,setView]=useState<'front'|'side'|'rear'|'arc'>('front'),[progress,setProgress]=useState(0);
 useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>setProgress(v=>(v+1)%101),120);return()=>window.clearInterval(id)},[playing]);
 const cues=coachingPoints.length?coachingPoints:['Feet shoulder width','Knees slightly bent','Elbow under the ball','Eyes on target','Smooth upward motion','Wrist snap and hold','Balanced landing'];
 return <section className="mlab">
  <div className="mlab-title"><div><small>{skill.toUpperCase()}</small><h3>{title}</h3><p>Build repeatable technique with a controlled, balanced motion.</p></div><b>{prescription}</b></div>
  <div className="mlab-screen">
   <img src={athletePhoto} alt="" className={'mlab-athlete '+view}/>
   <div className="mlab-shade"/><div className="mlab-brand"><b>RCL</b><span>MOTION LAB</span></div>
   <div className="mlab-marker elbow"><i/><b>ELBOW ALIGNMENT</b><span>Keep your elbow under the ball</span></div>
   <div className="mlab-marker wrist"><i/><b>WRIST SNAP</b><span>Finish with a soft wrist</span></div>
   <div className="mlab-marker knee"><i/><b>KNEE BEND</b><span>Load from your legs</span></div>
   <aside className="mlab-focus"><b>KEY FOCUS</b>{cues.slice(0,7).map(x=><span key={x}>✓ {x}</span>)}</aside>
   <aside className="mlab-arcbox"><b>SHOT ARC</b><div className="arc-chart"><i/></div><div><span>IDEAL ARC<strong>45°–52°</strong></span><span>RELEASE<strong>0.4–0.6s</strong></span></div></aside>
   <div className="mlab-player"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><span>{Math.round(progress*12/100).toString().padStart(2,'0')} / 12</span><i><b style={{width:progress+'%'}}/></i><FaVolumeHigh/><strong>1x</strong><FaExpand/></div>
  </div>
  <nav className="mlab-tabs">
   <button className={mode==='watch'?'active':''} onClick={()=>setMode('watch')}><FaPlay/><b>WATCH</b><small>Full Speed</small></button>
   <button className={mode==='breakdown'?'active':''} onClick={()=>setMode('breakdown')}><FaChartLine/><b>BREAKDOWN</b><small>Step by Step</small></button>
   <button className={mode==='angles'?'active':''} onClick={()=>setMode('angles')}><FaVideo/><b>MULTI ANGLE</b><small>Front · Side · Rear</small></button>
   <button className={mode==='mistakes'?'active':''} onClick={()=>setMode('mistakes')}><FaTriangleExclamation/><b>COMMON MISTAKES</b><small>What Not To Do</small></button>
  </nav>
  {mode==='angles'&&<div className="mlab-angles">{(['front','side','rear','arc'] as const).map(v=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}><span style={{backgroundImage:`url("${athletePhoto}")`}}/><b>{v==='arc'?'SHOT ARC':v.toUpperCase()+' VIEW'}</b></button>)}</div>}
  <div className="mlab-details">
   <div><h5><FaLightbulb/> TRAINING TIPS</h5>{cues.slice(0,4).map(x=><p key={x}>• {x}</p>)}</div>
   <div><h5 className="orange"><FaTriangleExclamation/> COMMON MISTAKES</h5>{commonMistakes.slice(0,5).map(x=><p key={x}>• {x}</p>)}</div>
   <div><h5>NEXT REP</h5><strong>Master the movement.</strong><p>Repeat clean mechanics before adding speed or distance.</p><button onClick={()=>{setProgress(0);setPlaying(true)}}>START REP →</button></div>
  </div>
 </section>
}