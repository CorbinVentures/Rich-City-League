'use client';
import { useEffect,useState } from 'react';
import { FaPause,FaPlay,FaVolumeHigh,FaExpand,FaChartLine,FaVideo,FaTriangleExclamation,FaLightbulb } from 'react-icons/fa6';
import './MotionDemo.css';

type Props={title:string;skill:string;prescription:string;description?:string;focus?:string[];coachingPoints:string[];commonMistakes:string[]};
const photos:Record<string,string>={
 shooting:'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&w=1600&q=90',
 'ball handling':'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90',
 finishing:'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90',
 playmaking:'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90',
 defense:'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90',
 athleticism:'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90',
 rebounding:'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90',
 'mental / iq':'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=90'
};
const analysis:Record<string,{metric1:string;value1:string;metric2:string;value2:string;markers:[string,string][]}>={
 shooting:{metric1:'ARC',value1:'48°',metric2:'RELEASE',value2:'0.42s',markers:[['ELBOW ALIGNMENT','Keep elbow under the ball'],['KNEE BEND','Load from your legs']]},
 'ball handling':{metric1:'PACE',value1:'3 SPEEDS',metric2:'CONTROL',value2:'LOW',markers:[['BALL POSITION','Keep dribble outside your frame'],['HIP LEVEL','Stay low through the move']]},
 finishing:{metric1:'ANGLE',value1:'HIGH',metric2:'TOUCH',value2:'SOFT',markers:[['BALL PROTECTION','Shield the ball from help'],['FOOTWORK','Control the final two steps']]},
 playmaking:{metric1:'READ',value1:'EARLY',metric2:'PACE',value2:'CHANGE',markers:[['EYES UP','See help before the second dribble'],['ADVANTAGE','Keep score and pass available']]},
 defense:{metric1:'STANCE',value1:'LOW',metric2:'ANGLE',value2:'SQUARE',markers:[['CHEST POSITION','Stay square to the drive'],['FOOTWORK','Push, do not cross your feet']]},
 athleticism:{metric1:'LOAD',value1:'CONTROL',metric2:'LAND',value2:'QUIET',markers:[['HIP LOAD','Create force from the hips'],['KNEE TRACK','Keep knee over the toes']]},
 rebounding:{metric1:'CONTACT',value1:'FIRST',metric2:'PURSUE',value2:'2 HANDS',markers:[['HIT & FIND','Make contact before tracking ball'],['SECURE','Chin the rebound with two hands']]},
 'mental / iq':{metric1:'READ',value1:'DEFENDER',metric2:'DECISION',value2:'EARLY',markers:[['PRIMARY READ','Read defender hips and positioning'],['SECOND READ','Keep both options alive']]}
};

export function MotionDemo({title,skill,prescription,description,focus=[],coachingPoints,commonMistakes}:Props){
 const key=skill.toLowerCase(),data=analysis[key]??analysis.shooting,athletePhoto=photos[key]??photos.shooting;
 const[playing,setPlaying]=useState(true),[mode,setMode]=useState<'watch'|'breakdown'|'angles'|'mistakes'>('watch'),[view,setView]=useState<'front'|'side'|'rear'|'analysis'>('front'),[progress,setProgress]=useState(0);
 useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>setProgress(v=>(v+1)%101),120);return()=>window.clearInterval(id)},[playing]);
 const cues=coachingPoints.length?coachingPoints:['Stay balanced','Play under control','Repeat clean mechanics'];
 const tags=focus.length?focus.slice(0,4):cues.slice(0,4);
 return <section className="mlab">
  <div className="mlab-crumb">THE LAB <i>›</i> SKILL LIBRARY <i>›</i> {skill.toUpperCase()} <i>›</i> <b>{title.toUpperCase()}</b></div>
  <div className="mlab-title"><div><small>{skill.toUpperCase()}</small><h3>{title}</h3><p>{description||`Train ${skill.toLowerCase()} with game-relevant technique and controlled repetitions.`}</p><div className="mlab-tags">{tags.map(x=><span key={x}>{x}</span>)}</div></div><b>{prescription}</b></div>
  <div className="mlab-screen">
   <img src={athletePhoto} alt="" className={'mlab-athlete '+view}/><div className="mlab-shade"/>
   <div className="mlab-brand"><b>RCL</b><span>{skill.toUpperCase()} LAB</span></div>
   <div className="mlab-marker elbow"><i/><b>{data.markers[0][0]}</b><span>{data.markers[0][1]}</span></div>
   <div className="mlab-marker knee"><i/><b>{data.markers[1][0]}</b><span>{data.markers[1][1]}</span></div>
   <aside className="mlab-focus"><b>KEY FOCUS</b>{cues.slice(0,5).map(x=><span key={x}>✓ {x}</span>)}</aside>
   <aside className="mlab-arcbox"><b>{skill==='Shooting'?'SHOT PROFILE':'SKILL READOUT'}</b><div className="arc-chart"><i/></div><div><span>{data.metric1}<strong>{data.value1}</strong></span><span>{data.metric2}<strong>{data.value2}</strong></span></div></aside>
   <div className="mlab-readout"><span>{data.metric1} <b>{data.value1}</b></span><span>{data.metric2} <b>{data.value2}</b></span><span>VIEW <b>{view.toUpperCase()}</b></span></div>
   <div className="mlab-player"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><span>{Math.round(progress*12/100).toString().padStart(2,'0')} / 12</span><i><b style={{width:progress+'%'}}/></i><FaVolumeHigh/><strong>1x</strong><FaExpand/></div>
  </div>
  <nav className="mlab-tabs"><button className={mode==='watch'?'active':''} onClick={()=>setMode('watch')}><FaPlay/><b>WATCH</b><small>Full Speed</small></button><button className={mode==='breakdown'?'active':''} onClick={()=>setMode('breakdown')}><FaChartLine/><b>BREAKDOWN</b><small>Step by Step</small></button><button className={mode==='angles'?'active':''} onClick={()=>setMode('angles')}><FaVideo/><b>MULTI ANGLE</b><small>Front · Side · Rear</small></button><button className={mode==='mistakes'?'active':''} onClick={()=>setMode('mistakes')}><FaTriangleExclamation/><b>COMMON MISTAKES</b><small>What Not To Do</small></button></nav>
  {mode==='angles'&&<div className="mlab-angles">{(['front','side','rear','analysis'] as const).map(v=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}><span style={{backgroundImage:`url("${athletePhoto}")`}}/><b>{v==='analysis'?'ANALYSIS':v.toUpperCase()+' VIEW'}</b></button>)}</div>}
  {mode==='breakdown'&&<div className="mlab-mode-panel">{cues.map((x,i)=><p key={x}><b>{String(i+1).padStart(2,'0')}</b>{x}</p>)}</div>}
  {mode==='mistakes'&&<div className="mlab-mode-panel mistakes">{commonMistakes.map((x,i)=><p key={x}><b>{String(i+1).padStart(2,'0')}</b>{x}</p>)}</div>}
  <div className="mlab-details"><div><h5><FaLightbulb/> TRAINING TIPS</h5>{cues.slice(0,4).map(x=><p key={x}>• {x}</p>)}</div><div><h5 className="orange"><FaTriangleExclamation/> COMMON MISTAKES</h5>{commonMistakes.slice(0,5).map(x=><p key={x}>• {x}</p>)}</div><div><h5 className="orange">RCL DEVELOPMENT</h5><strong>{skill} progression</strong><p>Complete clean repetitions before increasing speed, pressure, or complexity.</p><button onClick={()=>{setProgress(0);setPlaying(true)}}>RESTART REP →</button></div></div>
 </section>
}