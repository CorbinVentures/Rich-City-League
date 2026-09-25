'use client';
import {Suspense,useEffect,useRef,useState} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {ContactShadows,Environment,PerspectiveCamera} from '@react-three/drei';
import * as THREE from 'three';
import {FaPause,FaPlay,FaRotateRight} from 'react-icons/fa6';
import './DrillAnimation.css';

type Props={skill:string;title:string;focus:string[];drillId?:string};
type View='front'|'quarter'|'side'|'back';
type Move={phases:string[];cue:string;kind:'shoot'|'pullup'|'handle'|'finish'|'defense'|'jump'|'rebound'};
const moves:Record<string,Move>={
 'rcl-form-shooting':{kind:'shoot',phases:['SET','LOAD','RISE','RELEASE','FOLLOW'],cue:'Quiet base · elbow under ball · hold the finish'},
 'rcl-catch-shoot':{kind:'shoot',phases:['READY','CATCH','PLANT','LOAD','RISE','RELEASE','LAND'],cue:'Feet into the catch · load straight down · land balanced'},
 'rcl-pullup':{kind:'pullup',phases:['STANCE','ATTACK','DRIBBLE','PICKUP','PLANT','RISE','RELEASE','LAND'],cue:'Hard dribble · compact pickup · controlled stop · vertical rise'},
 'rcl-stationary-ball-handling':{kind:'handle',phases:['STANCE','POUND R','CROSS','POUND L','RESET'],cue:'Hips low · eyes up · pound below the knee'},
 'rcl-cross-pound':{kind:'handle',phases:['LOAD','POUND','CROSS','PUSH','RECOVER'],cue:'Sell with shoulders · cross low · explode out'},
 'rcl-retreat-attack':{kind:'handle',phases:['ATTACK','RETREAT','LOAD','RE-ATTACK','BURST'],cue:'Create space · change rhythm · re-attack downhill'},
 'rcl-mikan':{kind:'finish',phases:['GATHER','STEP','EXTEND','FINISH','SWITCH'],cue:'Quick feet · high ball · soft glass'},
 'rcl-reverse-finish':{kind:'finish',phases:['ATTACK','GATHER','UNDER','EXTEND','FINISH'],cue:'Use the rim · long last step · extend far side'},
 'rcl-floater':{kind:'finish',phases:['ATTACK','GATHER','LIFT','FLOAT','LAND'],cue:'Control speed · soft hand · early release'},
 'rcl-closeout-slides':{kind:'defense',phases:['SPRINT','CHOP','CLOSEOUT','SLIDE','RECOVER'],cue:'Sprint · chop · high hands · push laterally'},
 'rcl-mirror-slides':{kind:'defense',phases:['STANCE','PUSH','SLIDE','BRAKE','RECOVER'],cue:'Chest square · hips low · push from opposite foot'},
 'rcl-lateral-bound':{kind:'jump',phases:['LOAD','PUSH','FLIGHT','LAND','STICK'],cue:'Load one hip · push floor · own the landing'},
 'rcl-decel':{kind:'jump',phases:['SPRINT','BRAKE','SINK','STICK'],cue:'Short braking steps · sink hips · balanced stop'},
 'rcl-first-step':{kind:'jump',phases:['LOAD','PUSH','STEP 1','STEP 2','BURST'],cue:'Positive shin angle · violent arm drive'},
 'rcl-hit-find':{kind:'rebound',phases:['HIT','FIND','PURSUE','SECURE','CHIN'],cue:'Contact first · pursue with two hands · chin it'},
 'rcl-outlet':{kind:'rebound',phases:['PURSUE','SECURE','LAND','PIVOT','OUTLET'],cue:'Secure · chin · pivot · pass ahead'}
};
const fallback:Move={kind:'shoot',phases:['READY','LOAD','EXECUTE','RECOVER'],cue:'Own every position · finish balanced'};
const camera:Record<View,[number,number,number]>={front:[0,1.45,6],quarter:[3.6,1.65,4.5],side:[5.7,1.5,0],back:[0,1.45,-6]};

function Limb({a,b,r=.095}:{a:THREE.Vector3;b:THREE.Vector3;r?:number}){const mid=a.clone().add(b).multiplyScalar(.5),len=a.distanceTo(b),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return <mesh position={mid} quaternion={q}><capsuleGeometry args={[r,Math.max(.01,len-r*2),8,14]}/><meshStandardMaterial color="#171b20" roughness={.58} metalness={.05}/></mesh>}
function Avatar({move,t}:{move:Move;t:number}){
 const root=useRef<THREE.Group>(null),ball=useRef<THREE.Mesh>(null);
 useFrame(()=>{if(!root.current)return;const p=t*Math.PI*2;root.current.position.y=(move.kind==='shoot'||move.kind==='finish'||move.kind==='rebound')?Math.max(0,Math.sin((t-.55)*Math.PI*2))*.22:0;root.current.position.x=move.kind==='defense'?Math.sin(p)*.55:move.kind==='pullup'?t*.55-.25:0;root.current.rotation.y=move.kind==='handle'?Math.sin(p)*.08:0;if(ball.current){let x=.48,y=1.12,z=.12;if(move.kind==='handle'||move.kind==='pullup'){x=Math.sin(p)*.48;y=.38+Math.abs(Math.cos(p))*1.0}else if(move.kind==='shoot'){y=1.25+t*1.25;x=.18+t*.08}else if(move.kind==='finish'){x=.45;y=1.05+t*.9}else if(move.kind==='rebound'){x=.25;y=1.6-Math.abs(t-.5)*.8}ball.current.position.set(x,y,z)}});
 const hip=new THREE.Vector3(0,1.0,0),neck=new THREE.Vector3(0,1.78,0),ls=new THREE.Vector3(-.28,1.67,0),rs=new THREE.Vector3(.28,1.67,0),le=new THREE.Vector3(-.48,1.28,.03),re=new THREE.Vector3(.48,1.28,.03),lw=new THREE.Vector3(-.42,.94,.08),rw=new THREE.Vector3(.42,.94,.08),lk=new THREE.Vector3(-.23,.53,.03),rk=new THREE.Vector3(.23,.53,.03),la=new THREE.Vector3(-.25,.06,.08),ra=new THREE.Vector3(.25,.06,.08);
 return <group ref={root}>
  <mesh position={[0,1.94,0]}><sphereGeometry args={[.19,24,24]}/><meshStandardMaterial color="#7d513d"/></mesh>
  <mesh position={[0,1.38,0]} scale={[.48,.72,.26]}><capsuleGeometry args={[.48,.45,8,18]}/><meshStandardMaterial color="#101820"/></mesh>
  <mesh position={[0,1.47,.255]}><planeGeometry args={[.55,.42]}/><meshStandardMaterial color="#ff5a1f"/></mesh>
  <Limb a={ls} b={le}/><Limb a={le} b={lw} r={.08}/><Limb a={rs} b={re}/><Limb a={re} b={rw} r={.08}/>
  <Limb a={hip.clone().add(new THREE.Vector3(-.15,0,0))} b={lk} r={.12}/><Limb a={lk} b={la} r={.105}/><Limb a={hip.clone().add(new THREE.Vector3(.15,0,0))} b={rk} r={.12}/><Limb a={rk} b={ra} r={.105}/>
  <mesh position={[-.25,.035,.17]} scale={[.14,.06,.3]}><boxGeometry/><meshStandardMaterial color="#f2f4f6"/></mesh><mesh position={[.25,.035,.17]} scale={[.14,.06,.3]}><boxGeometry/><meshStandardMaterial color="#f2f4f6"/></mesh>
  <mesh ref={ball}><sphereGeometry args={[.135,24,24]}/><meshStandardMaterial color="#f36a21" roughness={.72}/></mesh>
 </group>
}
function Scene({move,t,view}:{move:Move;t:number;view:View}){return <><PerspectiveCamera makeDefault position={camera[view]} fov={35}/><ambientLight intensity={1.4}/><directionalLight position={[4,6,4]} intensity={3}/><spotLight position={[-4,5,2]} intensity={20} angle={.35}/><Suspense fallback={null}><Avatar move={move} t={t}/><ContactShadows position={[0,0,0]} opacity={.55} scale={7} blur={2}/><Environment preset="city"/></Suspense><gridHelper args={[8,16,'#29404c','#101b22']} position={[0,0,0]}/></>}

export function DrillAnimation({title,focus,drillId}:Props){
 const move=moves[drillId||'']||fallback,[view,setView]=useState<View>('quarter'),[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[t,setT]=useState(0),last=useRef(0);
 useFrameSafe(playing,speed,setT,last);const phase=Math.min(move.phases.length-1,Math.floor(t*move.phases.length));
 return <section className="avatar3d">
  <header><div><small>RCL LAB // ATHLETE MODEL 01</small><h2>{title}</h2></div><span>FULL BODY TRAINING</span></header>
  <div className="avatar3d-stage"><Canvas dpr={[1,1.5]} gl={{antialias:true,powerPreference:'high-performance'}}><Scene move={move} t={t} view={view}/></Canvas>
   <div className="avatar3d-views">{(['front','quarter','side','back'] as View[]).map(v=><button className={view===v?'active':''} onClick={()=>setView(v)} key={v}>{v==='quarter'?'3/4':v}</button>)}</div>
   <div className="avatar3d-phase"><small>CURRENT MOVEMENT</small><b>{move.phases[phase]}</b></div>
  </div>
  <div className="avatar3d-timeline">{move.phases.map((p,i)=><button className={i===phase?'active':''} key={p} onClick={()=>setT(i/move.phases.length)}><i>{String(i+1).padStart(2,'0')}</i>{p}</button>)}</div>
  <div className="avatar3d-controls"><button onClick={()=>setPlaying(x=>!x)}>{playing?<FaPause/>:<FaPlay/>}</button><div onClick={e=>setT(e.nativeEvent.offsetX/e.currentTarget.clientWidth)}><i style={{width:(t*100)+'%'}}/></div><button onClick={()=>setSpeed(x=>x===1?.5:x===.5?1.5:1)}>{speed}x</button><button onClick={()=>setT(0)}><FaRotateRight/></button></div>
  <footer><small>COACHING</small><b>{move.cue}</b><span>{focus.slice(0,3).join(' • ')}</span></footer>
 </section>
}
function useFrameSafe(playing:boolean,speed:number,setT:React.Dispatch<React.SetStateAction<number>>,last:React.MutableRefObject<number>){useEffect(()=>{let raf=0;const loop=(n:number)=>{if(!last.current)last.current=n;if(playing)setT(x=>(x+(n-last.current)/(6500/speed))%1);last.current=n;raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[playing,speed,setT,last]);}