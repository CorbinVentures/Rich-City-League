'use client';
import { useMemo,useState } from 'react';
import { FaPause,FaPlay,FaRotateRight } from 'react-icons/fa6';
import './DrillAnimation.css';
type Props={skill:string;title:string;focus:string[];drillId?:string};
type View='front'|'side'|'pov';
type Spec={motion:string;phases:string[];metrics:[string,string][];cue:string;callouts:string[]};
const generic:Record<string,Spec>={
 shooting:{motion:'shoot',phases:['READY','LOAD','RISE','RELEASE','LAND'],metrics:[['BASE','BALANCED'],['BALL','SHOT POCKET'],['TEMPO','1 MOTION']],cue:'Stack wrist and elbow · finish through the rim',callouts:['KNEE LOAD','SHOT POCKET','RELEASE LINE']},
 'ball-handling':{motion:'handle',phases:['LOAD','POUND','TRANSFER','RECEIVE'],metrics:[['STANCE','LOW'],['BALL','BELOW KNEE'],['TEMPO','CONTROL']],cue:'Hips loaded · chest quiet · pound through the floor',callouts:['HIP LOAD','BALL PATH','BASE WIDTH']},
 defense:{motion:'defense',phases:['STANCE','PUSH','SLIDE','BRAKE'],metrics:[['BASE','WIDE'],['HIPS','LOW'],['CHEST','SQUARE']],cue:'Push the floor · stay square · never click heels',callouts:['PUSH FOOT','HIP LEVEL','RECOVERY FOOT']}
};
const catchShoot:Spec={motion:'catch-shoot',phases:['READY','CATCH','1–2 PLANT','LOAD','RISE','RELEASE','LAND'],metrics:[['FOOTWORK','1–2 PLANT'],['POCKET','CHEST → SET'],['LANDING','SAME SPACE']],cue:'Feet arrive into the catch · load through both legs · rise vertical · hold the finish',callouts:['LEAD FOOT PLANT','CENTER OF MASS','ELBOW STACK']};
const fallback:Spec={motion:'training',phases:['READY','LOAD','EXECUTE','RECOVER'],metrics:[['BASE','ATHLETIC'],['TEMPO','CONTROL'],['FINISH','BALANCED']],cue:'Own each position before adding speed',callouts:['BASE','CENTER OF MASS','FINISH']};
const dots=Array.from({length:150},(_,i)=>({x:70+((i*37)%80),y:40+((i*53)%205),r:i%7===0?1.8:1}));
export function DrillAnimation({skill,title,focus,drillId}:Props){
 const [playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[view,setView]=useState<View>('front');
 const key=skill.toLowerCase().replace(/[^a-z]/g,'-');
 const spec=drillId==='rcl-catch-shoot'?catchShoot:(generic[key]??fallback);
 const restart=()=>{setPlaying(false);requestAnimationFrame(()=>setPlaying(true))};
 return <div className={`drill-animation spectrum-motion ${playing?'is-playing':'is-paused'} motion-${spec.motion} view-${view}`} style={{'--speed':`${1/speed}s`} as React.CSSProperties}>
  <div className="da-stage">
   <div className="da-score"><b>RCL MOTION // BIOMECHANICS</b><span>{title}</span></div>
   <div className="da-live">MOTION MODEL <i/></div>
   <div className="da-view">{(['front','side','pov'] as View[]).map(v=><button key={v} onClick={()=>setView(v)} className={view===v?'active':''}>{v}</button>)}</div>
   <div className="wire-court"><i/><i/><i/></div>
   <div className="scan-hud left-hud"><small>TRACKING</small><b>14 JOINTS</b><span>COM • FEET • BALL</span></div>
   <div className="spectrum-rig" aria-label={`Technical motion demonstration for ${title}`}>
    <svg viewBox="0 0 220 300" role="img">
     <g className="ghost"><path d="M110 54L84 88L70 145L91 169L79 244L67 286M110 54L136 88L151 143L129 169L143 244L154 286M84 88L136 88M91 169L129 169"/></g>
     <g className="skeleton"><circle cx="110" cy="43" r="20"/><path d="M110 63L110 160M84 88L136 88M84 88L65 137L77 181M136 88L156 132L145 176M110 160L91 171L77 238L67 284M110 160L129 171L143 238L154 284"/></g>
     <g className="cloud">{dots.map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={d.r}/>)}</g>
     {[[84,88],[136,88],[65,137],[156,132],[91,171],[129,171],[77,238],[143,238],[67,284],[154,284]].map(([x,y],i)=><circle className="track-joint" key={i} cx={x} cy={y} r="4"/>)}
     <circle className="com" cx="110" cy="157" r="7"/><line className="com-line" x1="110" y1="157" x2="110" y2="286"/>
    </svg>
    <i className="tech-ball"/><i className="ball-arc"/>
    <div className="foot-zone foot-a"/><div className="foot-zone foot-b"/>
    <div className="tech-label label-a">{spec.callouts[0]}</div><div className="tech-label label-b">{spec.callouts[1]}</div><div className="tech-label label-c">{spec.callouts[2]}</div>
   </div>
   <div className="phase-rail">{spec.phases.map((p,i)=><span key={p}><i>{String(i+1).padStart(2,'0')}</i>{p}</span>)}</div>
   <div className="metric-strip">{spec.metrics.map(([a,b])=><span key={a}><small>{a}</small><b>{b}</b></span>)}</div>
   <div className="coach-cue"><small>COACH CUE</small><b>{spec.cue}</b></div>
   <div className="da-cue">{focus.slice(0,3).join(' • ')}</div>
  </div>
  <div className="da-controls"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><div><i/></div><button onClick={()=>setSpeed(v=>v===1?.5:v===.5?1.5:1)}>{speed}x</button><button onClick={restart}><FaRotateRight/></button></div>
 </div>
}