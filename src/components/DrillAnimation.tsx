'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {FaPause,FaPlay,FaRotateRight,FaExpand} from 'react-icons/fa6';
import './DrillAnimation.css';

type Props={skill:string;title:string;focus:string[];drillId?:string};
type View='front'|'quarter'|'side'|'back';
type P={x:number;y:number};
type Joint='head'|'neck'|'ls'|'rs'|'le'|'re'|'lw'|'rw'|'hip'|'lk'|'rk'|'la'|'ra';
type Frame={name:string;j:Record<Joint,P>;ball:P;ballMode:'held'|'bounce'|'flight'};
type Profile={phases:string[];frames:Frame[];cue:string;focus:string[]};

const J:Joint[]=['head','neck','ls','rs','le','re','lw','rw','hip','lk','rk','la','ra'];
const frame=(name:string,v:number[],ball:[number,number],ballMode:Frame['ballMode']='held'):Frame=>({name,j:Object.fromEntries(J.map((k,i)=>[k,{x:v[i*2],y:v[i*2+1]}])) as Record<Joint,P>,ball:{x:ball[0],y:ball[1]},ballMode});
const F={
 ready:frame('STANCE',[110,39,110,62,88,82,132,82,76,120,144,120,73,155,147,155,110,157,91,204,129,204,82,272,138,272],[148,157]),
 attack:frame('ATTACK',[116,42,114,65,91,84,137,82,73,122,153,118,69,161,156,155,116,160,94,207,143,196,77,271,158,260],[69,183],'bounce'),
 dribble:frame('DRIBBLE',[120,44,118,68,94,87,141,84,74,130,158,125,70,174,161,161,120,164,101,211,145,204,87,272,160,267],[70,245],'bounce'),
 pickup:frame('PICKUP',[118,42,116,66,92,85,139,84,83,121,149,118,98,148,132,145,116,160,98,209,138,210,88,272,151,272],[115,143]),
 plant:frame('PLANT',[114,46,112,70,89,90,135,90,84,126,141,126,102,143,122,143,112,170,90,218,134,218,79,274,146,274],[112,137]),
 load:frame('LOAD',[112,53,110,78,87,99,133,99,85,128,135,128,103,128,117,128,110,183,88,226,132,226,78,274,143,274],[110,119]),
 rise:frame('RISE',[110,32,108,56,87,77,129,77,94,98,123,96,107,77,112,75,108,145,90,191,126,191,80,252,138,252],[110,72]),
 release:frame('RELEASE',[109,25,108,49,87,70,129,70,95,78,123,76,110,48,111,42,108,136,90,182,126,182,80,243,138,243],[116,30],'flight'),
 follow:frame('FOLLOW',[109,27,108,51,87,72,129,72,95,76,123,74,111,39,112,37,108,140,90,186,126,186,80,247,138,247],[172,-10],'flight'),
 slideL:frame('SLIDE',[102,47,102,71,79,91,125,91,65,126,139,126,54,146,151,146,102,171,76,215,127,215,62,272,145,272],[148,155]),
 jump:frame('JUMP',[110,21,110,45,88,66,132,66,78,94,142,94,72,67,148,67,110,130,91,174,129,174,82,231,138,231],[110,40],'flight'),
 rebound:frame('PURSUE',[116,25,114,49,91,70,137,68,82,91,146,88,76,54,151,48,114,137,93,183,133,180,82,244,145,242],[151,35],'held')
};
const profiles:Record<string,Profile>={
 'rcl-form-shooting':{phases:['SET','LOAD','RISE','RELEASE','FOLLOW'],frames:[F.ready,F.load,F.rise,F.release,F.follow],cue:'Quiet base · elbow under ball · hold the finish',focus:['Base','Elbow','Release']},
 'rcl-catch-shoot':{phases:['READY','CATCH','PLANT','LOAD','RISE','RELEASE','LAND'],frames:[{...F.ready,ball:{x:30,y:116},ballMode:'flight'},F.pickup,F.plant,F.load,F.rise,F.release,F.ready],cue:'Feet arrive into the catch · load straight down · land in the same space',focus:['Foot plant','Shot pocket','Landing']},
 'rcl-pullup':{phases:['STANCE','ATTACK','DRIBBLE','PICKUP','PLANT','LOAD','RISE','RELEASE','FOLLOW'],frames:[F.ready,F.attack,F.dribble,F.pickup,F.plant,F.load,F.rise,F.release,F.follow],cue:'One hard dribble · compact pickup · stop under control · rise vertical',focus:['Deceleration','Pickup','Vertical lift']},
 'rcl-stationary-ball-handling':{phases:['STANCE','POUND R','CROSS','POUND L','RESET'],frames:[F.ready,F.dribble,{...F.load,ball:{x:110,y:215},ballMode:'bounce'},{...F.dribble,ball:{x:151,y:245},ballMode:'bounce'},F.ready],cue:'Hips low · eyes up · ball below the knee · violent change of hand',focus:['Hip level','Ball height','Rhythm']},
 'rcl-cross-pound':{phases:['LOAD','POUND','CROSS','PUSH','RECOVER'],frames:[F.load,F.dribble,{...F.attack,ball:{x:112,y:222},ballMode:'bounce'},F.attack,F.ready],cue:'Sell with shoulders · cross below knees · explode out of the move',focus:['Crossover','Shoulder sell','First step']},
 'rcl-retreat-attack':{phases:['ATTACK','RETREAT','LOAD','RE-ATTACK','BURST'],frames:[F.attack,{...F.dribble,j:{...F.dribble.j,hip:{x:101,y:166}}},F.load,F.attack,F.attack],cue:'Protect the retreat · change rhythm · re-attack downhill',focus:['Separation','Rhythm','Burst']},
 'rcl-mikan':{phases:['GATHER','STEP','EXTEND','FINISH','SWITCH'],frames:[F.pickup,F.plant,F.rise,{...F.release,ball:{x:145,y:38}},F.ready],cue:'Quick feet · ball stays high · finish softly off the glass',focus:['Footwork','Extension','Touch']},
 'rcl-reverse-finish':{phases:['ATTACK','GATHER','UNDER','EXTEND','FINISH'],frames:[F.attack,F.pickup,F.plant,{...F.jump,ball:{x:151,y:65}},F.release],cue:'Use the rim as protection · long last step · extend to the far side',focus:['Gather','Rim protection','Extension']},
 'rcl-floater':{phases:['ATTACK','GATHER','LIFT','FLOAT','LAND'],frames:[F.attack,F.pickup,F.rise,{...F.release,ball:{x:128,y:25}},F.ready],cue:'Control speed · soft hand · release before the rim protector',focus:['Gather','Touch','Release']},
 'rcl-closeout-slides':{phases:['SPRINT','CHOP','CLOSEOUT','SLIDE','RECOVER'],frames:[F.attack,F.ready,{...F.ready,j:{...F.ready.j,lw:{x:73,y:70},rw:{x:147,y:70}}},F.slideL,F.ready],cue:'Sprint halfway · chop under control · high hands · push, do not cross',focus:['Closeout','Hip level','Slide']},
 'rcl-mirror-slides':{phases:['STANCE','PUSH','SLIDE','BRAKE','RECOVER'],frames:[F.ready,F.slideL,F.slideL,F.load,F.ready],cue:'Chest square · hips low · push from the opposite foot',focus:['Stance','Lateral push','Recovery']},
 'rcl-shell-recovery':{phases:['HELP','STUNT','TURN','SPRINT','CHOP'],frames:[F.ready,F.slideL,F.attack,F.attack,F.ready],cue:'See ball and man · stunt early · sprint out · arrive under control',focus:['Help position','Recovery','Closeout']},
 'rcl-lateral-bound':{phases:['LOAD','PUSH','FLIGHT','LAND','STICK'],frames:[F.load,F.slideL,F.jump,F.slideL,F.load],cue:'Load one hip · push the floor · knee tracks over toes · own the landing',focus:['Hip load','Flight','Landing']},
 'rcl-decel':{phases:['SPRINT','BRAKE 1','BRAKE 2','SINK','STICK'],frames:[F.attack,F.attack,F.plant,F.load,F.ready],cue:'Short braking steps · sink hips · chest over knees · stick the stop',focus:['Braking','Hip sink','Balance']},
 'rcl-first-step':{phases:['LOAD','PUSH','STEP 1','STEP 2','BURST'],frames:[F.load,F.attack,F.attack,F.attack,F.attack],cue:'Positive shin angle · violent arm drive · push the floor away',focus:['Shin angle','Arm drive','Acceleration']},
 'rcl-hit-find':{phases:['HIT','FIND','PURSUE','SECURE','CHIN'],frames:[F.load,F.ready,F.jump,F.rebound,F.ready],cue:'Make contact first · find flight · pursue with two hands · chin it',focus:['Contact','Pursuit','Secure']},
 'rcl-outlet':{phases:['PURSUE','SECURE','LAND','PIVOT','OUTLET'],frames:[F.jump,F.rebound,F.ready,F.plant,{...F.ready,ball:{x:170,y:110},ballMode:'flight'}],cue:'Two hands · strong chin · outside pivot · pass ahead',focus:['Secure','Pivot','Outlet']},
};
const fallback:Profile={phases:['READY','LOAD','EXECUTE','RECOVER'],frames:[F.ready,F.load,F.attack,F.ready],cue:'Move with control · own every position · finish balanced',focus:['Base','Control','Finish']};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function sample(p:Profile,t:number){const n=p.frames.length,scaled=t*(n-1),i=Math.min(n-2,Math.floor(scaled)),u=scaled-i,A=p.frames[i],B=p.frames[i+1];return{name:u<.5?p.phases[i]:p.phases[i+1],j:Object.fromEntries(J.map(k=>[k,{x:lerp(A.j[k].x,B.j[k].x,u),y:lerp(A.j[k].y,B.j[k].y,u)}])) as Record<Joint,P>,ball:{x:lerp(A.ball.x,B.ball.x,u),y:lerp(A.ball.y,B.ball.y,u)},ballMode:u<.5?A.ballMode:B.ballMode}};
function project(p:P,v:View){if(v==='side')return{x:110+(p.x-110)*.28,y:p.y};if(v==='quarter')return{x:110+(p.x-110)*.72,y:p.y};if(v==='back')return{x:220-p.x,y:p.y};return p}
const bones:[Joint,Joint][]=[['head','neck'],['neck','ls'],['neck','rs'],['ls','le'],['le','lw'],['rs','re'],['re','rw'],['neck','hip'],['hip','lk'],['lk','la'],['hip','rk'],['rk','ra']];
export function DrillAnimation({skill,title,focus,drillId}:Props){
 const profile=profiles[drillId||'']||fallback,[playing,setPlaying]=useState(true),[speed,setSpeed]=useState(1),[view,setView]=useState<View>('quarter'),[t,setT]=useState(0),last=useRef<number>();
 useEffect(()=>{let raf=0;const loop=(now:number)=>{if(last.current==null)last.current=now;if(playing)setT(x=>(x+(now-last.current!)/(6200/speed))%1);last.current=now;raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[playing,speed]);
 const s=sample(profile,t),j=Object.fromEntries(J.map(k=>[k,project(s.j[k],view)])) as Record<Joint,P>,ball=project(s.ball,view),phase=Math.min(profile.phases.length-1,Math.round(t*(profile.phases.length-1)));
 return <section className="motion-studio">
  <header className="motion-studio-head"><div><small>RCL AVATAR // MOTION STUDIO</small><h2>{title}</h2></div><div className="motion-live"><i/> FULL BODY</div></header>
  <div className="motion-stage">
   <div className="motion-view">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v}</button>)}</div>
   <div className="motion-court"/><div className="motion-readout"><small>ACTIVE PHASE</small><b>{s.name}</b><span>{profile.focus.join(' • ')}</span></div>
   <svg className="rcl-avatar" viewBox="0 0 220 300" aria-label={`${title} full body demonstration`}>
    <defs><linearGradient id="bodyGlow" x1="0" x2="1"><stop stopColor="#1bd8ff"/><stop offset=".55" stopColor="#eafcff"/><stop offset="1" stopColor="#ff641f"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g className="avatar-trail" transform="translate(-7 2)">{bones.map(([a,b])=><line key={a+b} x1={j[a].x} y1={j[a].y} x2={j[b].x} y2={j[b].y}/>)}</g>
    <g className="avatar-body" filter="url(#glow)">{bones.map(([a,b])=><line key={a+b} x1={j[a].x} y1={j[a].y} x2={j[b].x} y2={j[b].y}/>)}
      <path className="avatar-torso" d={`M${j.ls.x},${j.ls.y} L${j.rs.x},${j.rs.y} L${j.hip.x+17},${j.hip.y} L${j.hip.x-17},${j.hip.y} Z`}/>
      <circle className="avatar-head" cx={j.head.x} cy={j.head.y} r="17"/>{J.filter(k=>k!=='head').map(k=><circle className="avatar-joint" key={k} cx={j[k].x} cy={j[k].y} r="3.5"/>)}
    </g>
    <circle className={`avatar-ball ${s.ballMode}`} cx={ball.x} cy={ball.y} r="12"/>
    <line className="avatar-com" x1={j.hip.x} y1={j.hip.y} x2={j.hip.x} y2="284"/>
   </svg>
   <div className="motion-feet"><i/><i/></div>
   <div className="motion-angle angle-knee">KNEE TRACK</div><div className="motion-angle angle-core">CENTER OF MASS</div><div className="motion-angle angle-hand">BALL CONTROL</div>
  </div>
  <div className="motion-timeline">{profile.phases.map((p,i)=><button key={p} className={i===phase?'active':''} onClick={()=>setT(i/(profile.phases.length-1))}><i>{String(i+1).padStart(2,'0')}</i><b>{p}</b></button>)}</div>
  <div className="motion-controls"><button onClick={()=>setPlaying(v=>!v)}>{playing?<FaPause/>:<FaPlay/>}</button><span>{Math.floor(t*8)}:{String(Math.floor((t*80)%10)).padStart(2,'0')} / 0:08</span><div className="motion-progress" onClick={e=>setT(e.nativeEvent.offsetX/e.currentTarget.clientWidth)}><i style={{width:`${t*100}%`}}/></div><button onClick={()=>setSpeed(v=>v===1?.5:v===.5?1.5:1)}>{speed}x</button><button onClick={()=>setT(0)}><FaRotateRight/></button><FaExpand/></div>
  <footer className="motion-coach"><small>COACHING EMPHASIS</small><b>{profile.cue}</b><span>{focus.slice(0,3).join(' • ')}</span></footer>
 </section>
}