'use client';
import { useMemo, useState } from 'react';
import { FaPause,FaPlay,FaRotateRight } from 'react-icons/fa6';
import './DrillAnimation.css';

type Props={skill:string;title:string;focus:string[]};
type View='front'|'side'|'pov';

const profile:Record<string,{stance:string;level:string;tempo:string;cue:string;motion:string}>={
 'ball-handling':{stance:'42°',level:'BELOW KNEE',tempo:'72 BPM',cue:'Hips loaded · chest quiet · pound through the floor',motion:'handle'},
 shooting:{stance:'BALANCED',level:'SHOT POCKET',tempo:'1 MOTION',cue:'Stack wrist and elbow · finish through the rim',motion:'shoot'},
 finishing:{stance:'ATTACK',level:'HIP → RIM',tempo:'GAME',cue:'Win the angle · protect the ball · finish long',motion:'finish'},
 playmaking:{stance:'LOW',level:'HIP',tempo:'READ',cue:'Eyes up · shift the defender before the pass',motion:'handle'},
 defense:{stance:'WIDE',level:'LOW HIPS',tempo:'REACT',cue:'Chest square · active feet · never click heels',motion:'defense'},
 athleticism:{stance:'LOADED',level:'POWER',tempo:'EXPLODE',cue:'Load hips · drive the floor · land under control',motion:'defense'},
 rebounding:{stance:'BASE',level:'2 HANDS',tempo:'PURSUE',cue:'Hit first · find the ball · chin the rebound',motion:'finish'},
 'mental---iq':{stance:'READY',level:'EYES UP',tempo:'READ',cue:'See the floor early · keep both options alive',motion:'handle'}
};

export function DrillAnimation({skill,title,focus}:Props){
 const [playing,setPlaying]=useState(true);
 const [speed,setSpeed]=useState(1);
 const [view,setView]=useState<View>('front');
 const key=skill.toLowerCase().replace(/[^a-z]/g,'-');
 const data=profile[key]??profile['ball-handling'];
 const restart=()=>{setPlaying(false);requestAnimationFrame(()=>setPlaying(true))};
 const metrics=useMemo(()=>[['STANCE',data.stance],['BALL',data.level],['TEMPO',data.tempo]], [data]);
 return <div className={'drill-animation motion-coach '+(playing?'is-playing':'is-paused')+' motion-'+data.motion+' view-'+view} style={{'--speed':`${1/speed}s`} as React.CSSProperties}>
  <div className="da-stage">
   <div className="da-score"><b>RCL MOTION // {skill.toUpperCase()}</b><span>{title}</span></div>
   <div className="da-view">{(['front','side','pov'] as View[]).map(v=><button key={v} onClick={()=>setView(v)} className={view===v?'active':''}>{v}</button>)}</div>
   <div className="da-court"><i className="da-key"/><i className="da-three"/><i className="da-rim"/><i className="foot-target left"/><i className="foot-target right"/></div>
   <div className="motion-rig" aria-label={`Animated coaching demonstration for ${title}`}>
    <svg viewBox="0 0 220 310" role="img">
     <defs><linearGradient id="torso" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#173b52"/><stop offset="1" stopColor="#071923"/></linearGradient></defs>
     <g className="athlete">
      <ellipse className="shadow" cx="110" cy="289" rx="61" ry="10"/>
      <g className="leg leg-left"><path d="M91 170 Q80 207 76 248" /><path d="M76 248 L67 286"/><circle cx="76" cy="248" r="5"/></g>
      <g className="leg leg-right"><path d="M129 170 Q140 207 144 248" /><path d="M144 248 L153 286"/><circle cx="144" cy="248" r="5"/></g>
      <path className="shorts" d="M78 154 Q110 166 142 154 L136 190 Q110 198 84 190Z"/>
      <path className="torso" d="M82 75 Q110 63 138 75 L148 153 Q110 166 72 153Z"/>
      <path className="jersey-line" d="M110 70 L110 157"/><text x="110" y="126">RCL</text>
      <g className="arm arm-left"><path d="M82 86 Q61 112 55 153"/><path d="M55 153 Q53 176 69 196"/><circle cx="55" cy="153" r="5"/></g>
      <g className="arm arm-right"><path d="M138 86 Q159 112 165 153"/><path d="M165 153 Q167 176 151 196"/><circle cx="165" cy="153" r="5"/></g>
      <path className="neck" d="M101 73 L102 59 L118 59 L119 73"/>
      <ellipse className="head" cx="110" cy="39" rx="23" ry="28"/>
      <path className="head-detail" d="M93 31 Q110 18 128 30"/><path className="head-detail" d="M103 48 Q110 52 117 48"/>
      <circle className="joint shoulder l" cx="82" cy="86" r="6"/><circle className="joint shoulder r" cx="138" cy="86" r="6"/>
      <circle className="joint hip l" cx="91" cy="170" r="6"/><circle className="joint hip r" cx="129" cy="170" r="6"/>
     </g>
    </svg>
    <i className="coach-ball"/><i className="ball-trail"/>
    <div className="angle angle-knee"><span>42°</span></div>
    <div className="analysis-line hip"><span>HIP LOAD</span></div>
    <div className="analysis-line ball"><span>DRIBBLE HEIGHT</span></div>
   </div>
   <div className="metric-strip">{metrics.map(([a,b])=><span key={a}><small>{a}</small><b>{b}</b></span>)}</div>
   <div className="coach-cue"><small>COACH CUE</small><b>{data.cue}</b></div>
   <div className="da-cue">{focus.slice(0,3).map((x,i)=><span key={x}><b>0{i+1}</b>{x}</span>)}</div>
   <div className="da-live">LIVE ANALYSIS <i/></div>
  </div>
  <div className="da-controls"><button onClick={()=>setPlaying(v=>!v)} aria-label={playing?'Pause':'Play'}>{playing?<FaPause/>:<FaPlay/>}</button><div><i/></div><button onClick={()=>setSpeed(v=>v===1?0.5:v===0.5?1.5:1)}>{speed}x</button><button onClick={restart} aria-label="Restart"><FaRotateRight/></button></div>
 </div>
}