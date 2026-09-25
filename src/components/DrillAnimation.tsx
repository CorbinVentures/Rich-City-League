'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {FaPause,FaPlay,FaRotateRight} from 'react-icons/fa6';
import './DrillAnimation.css';

type Props={skill:string;title:string;focus:string[];drillId?:string};
type View='front'|'side'|'pov';
type P={x:number;y:number;z?:number};
type Pose={name:string;t:number;j:Record<string,P>;ball:P;ballState:'hand'|'air'|'floor'};
const L=[['head','neck'],['neck','ls'],['neck','rs'],['ls','le'],['le','lw'],['rs','re'],['re','rw'],['neck','hip'],['hip','lk'],['lk','la'],['hip','rk'],['rk','ra']] as const;
const pose=(name:string,t:number,a:number[],ball:number[],state:Pose['ballState']='hand'):Pose=>{
 const k=['head','neck','ls','le','lw','rs','re','rw','hip','lk','la','rk','ra'];
 return{name,t,j:Object.fromEntries(k.map((n,i)=>[n,{x:a[i*2],y:a[i*2+1]}])),ball:{x:ball[0],y:ball[1]},ballState:state};
};
const pullup:Pose[]=[
 pose('READY',0,[110,43,110,68,87,88,70,126,76,162,133,88,150,126,144,160,110,163,88,205,78,272,132,205,143,272],[78,166]),
 pose('ATTACK',.16,[116,45,114,70,90,90,69,128,72,167,138,89,154,130,145,165,117,164,91,207,68,270,139,200,154,267],[69,208],'floor'),
 pose('DRIBBLE',.31,[121,48,118,72,94,92,73,133,72,176,142,91,160,132,151,169,121,166,99,211,84,271,143,205,159,269],[72,246],'floor'),
 pose('PICKUP',.46,[119,46,117,70,93,89,82,124,94,151,141,89,151,119,132,149,118,165,98,213,88,272,139,211,151,272],[113,148]),
 pose('PLANT',.58,[116,49,114,73,91,94,84,128,103,145,137,94,143,128,126,145,114,172,91,220,80,274,137,219,148,274],[114,137]),
 pose('LOAD',.68,[114,55,112,80,90,102,87,130,103,128,134,102,137,129,121,127,112,184,88,226,77,274,136,226,148,274],[112,122]),
 pose('RISE',.79,[112,37,110,61,89,82,92,104,105,90,131,82,128,104,115,91,110,150,91,195,80,253,129,195,142,253],[110,80]),
 pose('RELEASE',.88,[110,28,109,52,89,73,96,82,108,57,129,73,124,80,111,48,109,140,91,185,80,244,127,185,140,244],[116,34],'air'),
 pose('FOLLOW',1,[109,30,108,54,88,75,96,78,110,42,128,75,123,76,111,39,108,143,91,188,80,247,126,188,139,247],[176,-8],'air')
];
const catchShoot:Pose[]=pullup.map((p,i)=>i<3?{...p,name:['READY','CATCH','SET'][i],ball:{x:[45,84,106][i],y:[126,125,126][i]},ballState:'air'}:p);
const interp=(a:number,b:number,t:number)=>a+(b-a)*t;
const sample=(seq:Pose[],t:number)=>{
 let b=seq.findIndex(p=>p.t>=t); if(b<0)b=seq.length-1; const ai=Math.max(0,b-1),A=seq[ai],B=seq[b],d=B.t-A.t||1,u=(t-A.t)/d;
 const j=Object.fromEntries(Object.keys(A.j).map(k=>[k,{x:interp(A.j[k].x,B.j[k].x,u),y:interp(A.j[k].y,B.j[k].y,u)}]));
 return{name:u<.5?A.name:B.name,t,j,ball:{x:interp(A.ball.x,B.ball.x,u),y:interp(A.ball.y,B.ball.y,u)},ballState:u<.5?A.ballState:B.ballState};
};
const project=(p:P,v:View):P=>v==='side'?{x:110+(p.x-110)*.38,y:p.y}:v==='pov'?{x:110+(p.x-110)*1.18,y:p.y+8}:p;
export function DrillAnimation({skill,title,focus,drillId}:Props){
 const [playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[view,setView]=useState<View>('front'),[clock,setClock]=useState(0); const last=useRef<number>();
 const seq=useMemo(()=>drillId==='rcl-catch-shoot'?catchShoot:pullup,[drillId]);
 useEffect(()=>{let id=0;const tick=(n:number)=>{if(last.current==null)last.current=n;if(playing)setClock(c=>(c+(n-last.current!)/5200*speed)%1);last.current=n;id=requestAnimationFrame(tick)};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id)},[playing,speed]);
 const s=sample(seq,clock),j=Object.fromEntries(Object.entries(s.j).map(([k,p])=>[k,project(p,view)])) as Record<string,P>,ball=project(s.ball,view);
 const phase=Math.min(seq.length-1,seq.reduce((best,p,i)=>Math.abs(p.t-clock)<Math.abs(seq[best].t-clock)?i:best,0));
 return <div className="drill-animation pose-engine">
  <div className="da-stage">
   <div className="da-score"><b>RCL MOTION // POSE ENGINE</b><span>{title}</span></div><div className="da-live">{s.name} <i/></div>
   <div className="da-view">{(['front','side','pov'] as View[]).map(v=><button key={v} onClick={()=>setView(v)} className={view===v?'active':''}>{v}</button>)}</div>
   <div className="wire-court"/><div className="scan-hud"><small>LIVE MODEL</small><b>13 JOINTS</b><span>POSE • BALL • FEET</span></div>
   <div className="pose-rig"><svg viewBox="0 0 220 300">
    <g className="motion-ghost">{L.map(([a,b])=><line key={a+b} x1={j[a].x-8} y1={j[a].y} x2={j[b].x-8} y2={j[b].y}/>)}</g>
    <g className="pose-bones">{L.map(([a,b])=><line key={a+b} x1={j[a].x} y1={j[a].y} x2={j[b].x} y2={j[b].y}/>)}</g>
    <circle className="pose-head" cx={j.head.x} cy={j.head.y} r="18"/>
    <g className="pose-cloud">{Object.values(j).flatMap((p,i)=>Array.from({length:8},(_,q)=><circle key={i+'-'+q} cx={p.x+Math.cos(q*.8)*((q%3)+4)} cy={p.y+Math.sin(q*.8)*((q%3)+4)} r="1.1"/>))}</g>
    {Object.entries(j).filter(([k])=>k!=='head').map(([k,p])=><circle className="pose-joint" key={k} cx={p.x} cy={p.y} r="4"/>)}
    <circle className={'pose-ball '+s.ballState} cx={ball.x} cy={ball.y} r="12"/><line className="com-line" x1={j.hip.x} y1={j.hip.y} x2={j.hip.x} y2="280"/>
   </svg></div>
   <div className="phase-rail">{seq.map((p,i)=><span className={i===phase?'active':''} key={i}><i>{String(i+1).padStart(2,'0')}</i>{p.name}</span>)}</div>
   <div className="metric-strip"><span><small>PHASE</small><b>{s.name}</b></span><span><small>BALL</small><b>{s.ballState.toUpperCase()}</b></span><span><small>VIEW</small><b>{view.toUpperCase()}</b></span></div>
   <div className="coach-cue"><small>COACH CUE</small><b>{drillId==='rcl-pullup'?'Attack → one hard dribble → pickup → two-foot stop → vertical rise':focus.slice(0,3).join(' · ')}</b></div>
  </div>
  <div className="da-controls"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><div><i style={{width:`${clock*100}%`}}/></div><button onClick={()=>setSpeed(v=>v===1?.5:v===.5?1.5:1)}>{speed}x</button><button onClick={()=>setClock(0)}><FaRotateRight/></button></div>
 </div>
}