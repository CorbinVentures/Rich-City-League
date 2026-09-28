'use client';

import { useEffect, useRef, useState } from 'react';
import './RiggedAthleteProof.css';
import { LAB_MOTIONS, matchLabMotionForDrill, type LabMotionId, type LabMotionMatch } from '@/lib/labMotionLibrary';

type Props={title:string;skill:string};
type View='front'|'quarter'|'side'|'back';
type Status='loading-athlete'|'loading-motion'|'ready'|'error';

const reviewChecks=['Base / foot plant','Knee tracking','Hip / torso posture','Arm / hand mechanics','Ball timing / contact','Return to ready'];

const techniqueBoards:Record<string,{eyebrow:string;phases:[string,string,string];cue:string;className:string}>={
  finishing:{eyebrow:'FINISHING SEQUENCE',phases:['Create the angle','Gather + protect','Finish through the window'],cue:'Control the final two steps and keep the ball protected until the finish.',className:'finish'},
  athleticism:{eyebrow:'MOVEMENT SEQUENCE',phases:['Load under control','Create force','Stick the landing'],cue:'Quality positions come before speed. Own the start and the finish of every rep.',className:'athletic'},
  rebounding:{eyebrow:'REBOUNDING SEQUENCE',phases:['Hit first','Find the flight','Pursue with two hands'],cue:'Contact creates space. Secure the ball high, then chin it before the outlet.',className:'rebound'},
  'mental / iq':{eyebrow:'DECISION SEQUENCE',phases:['See the picture','Read the defender','Decide early'],cue:'State the read before the action so the rep trains recognition, not guessing.',className:'iq'},
};

export function RiggedAthleteProof({title,skill}:Props){
  const match=matchLabMotionForDrill({title,skill});
  return match.motion
    ? <RiggedMotionPlayer title={title} skill={skill} match={match}/>
    : <TechniqueBoard title={title} skill={skill} note={match.note}/>;
}

function TechniqueBoard({title,skill,note}:{title:string;skill:string;note:string}){
  const data=techniqueBoards[skill.toLowerCase()]??{
    eyebrow:'COACHING SEQUENCE',
    phases:['Set the base','Execute cleanly','Reset with control'] as [string,string,string],
    cue:'Use the coaching steps below as the source of truth for this movement.',
    className:'generic',
  };
  return <section className="rigged-proof rigged-technique">
    <div className="rigged-proof__top"><div><small>THE LAB · {skill.toUpperCase()}</small><h2>{title}</h2><p>{note}</p></div><span>COACH VIEW</span></div>
    <div className={`rigged-technique__stage ${data.className}`} role="img" aria-label={`${skill} coaching sequence for ${title}`}>
      <div className="rigged-technique__court"><i/><i/><i/></div>
      <div className="rigged-technique__athlete"><span/><b/></div>
      <div className="rigged-technique__ball"/>
      <div className="rigged-technique__target"/>
      <div className="rigged-technique__label"><small>{data.eyebrow}</small><b>{data.cue}</b></div>
    </div>
    <ol className="rigged-technique__phases">{data.phases.map((phase,index)=><li key={phase}><b>{String(index+1).padStart(2,'0')}</b><span>{phase}</span></li>)}</ol>
    <p className="rigged-technique__note">Use this board for sequence and intent. The written coaching cues and drill instructions below remain the exact rep standard.</p>
  </section>;
}

function RiggedMotionPlayer({title,skill,match}:{title:string;skill:string;match:LabMotionMatch}){
  const defaultMotion=match.motion!;
  const mountRef=useRef<HTMLDivElement>(null);
  const viewRef=useRef<View>('front');
  const visibleRef=useRef(true);
  const lastUiUpdateRef=useRef(0);
  const [status,setStatus]=useState<Status>('loading-athlete');
  const [view,setView]=useState<View>('front');
  const [motionId,setMotionId]=useState<LabMotionId>(defaultMotion.id);
  const [paused,setPaused]=useState(false);
  const [speed,setSpeed]=useState<0.5|1|1.5>(1);
  const [frame,setFrame]=useState(0);
  const [copied,setCopied]=useState(false);
  const [reviewMode,setReviewMode]=useState(false);
  const [reviewDone,setReviewDone]=useState<boolean[]>(()=>reviewChecks.map(()=>false));
  const [reviewNotes,setReviewNotes]=useState('');
  const [reviewResult,setReviewResult]=useState<'pending'|'pass'|'needs-fix'>('pending');
  const pausedRef=useRef(false),speedRef=useRef(1),resetRef=useRef<(()=>void)|null>(null),stepRef=useRef<(()=>void)|null>(null),seekRef=useRef<((frame:number)=>void)|null>(null);
  const qaEnabled=process.env.NEXT_PUBLIC_LAB_QA==='1';

  useEffect(()=>{setMotionId(defaultMotion.id);setFrame(0);setStatus('loading-motion');},[defaultMotion.id]);
  useEffect(()=>{viewRef.current=view;},[view]);
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  useEffect(()=>{speedRef.current=speed;},[speed]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync=()=>{if(media.matches)setPaused(true);};
    sync();
    media.addEventListener?.('change',sync);
    return()=>media.removeEventListener?.('change',sync);
  },[]);

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    const observer=new IntersectionObserver(([entry])=>{visibleRef.current=entry?.isIntersecting??true;},{rootMargin:'120px'});
    observer.observe(mount);
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    const mount=mountRef.current;if(!mount)return;
    let disposed=false;let cleanup=()=>{};
    (async()=>{
      const importModule=(url:string)=>import(/* webpackIgnore: true */ url);
      const THREE:any=await importModule('/lab3d/vendor/three.module.min.js');
      const {GLTFLoader}:any=await importModule('/lab3d/vendor/GLTFLoader.js');
      if(disposed)return;

      const scene=new THREE.Scene();scene.background=new THREE.Color(0x071019);scene.fog=new THREE.Fog(0x071019,7,15);
      const camera=new THREE.PerspectiveCamera(36,1,.05,50);
      const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;mount.replaceChildren(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xb9dcff,0x15202a,2.2));
      const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(3,6,4);key.castShadow=true;scene.add(key);
      const rim=new THREE.DirectionalLight(0xff5b16,2.4);rim.position.set(-4,3,-4);scene.add(rim);
      const floor=new THREE.Mesh(new THREE.CircleGeometry(5.5,64),new THREE.MeshStandardMaterial({color:0x0c1822,roughness:.9,metalness:.05}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
      const grid=new THREE.GridHelper(10,20,0x315064,0x142a38);grid.position.y=.004;scene.add(grid);

      const loader=new GLTFLoader();
      const load=(url:string)=>new Promise<any>((resolve,reject)=>loader.load(url,resolve,undefined,reject));
      const model=await load('/lab3d/athlete.glb');if(disposed)return;
      const athlete=model.scene;athlete.traverse((o:any)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      const box=new THREE.Box3().setFromObject(athlete),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);
      athlete.position.set(-center.x,-box.min.y,-center.z);athlete.scale.setScalar(2.15/Math.max(size.y,.001));scene.add(athlete);

      setStatus('loading-motion');
      const selected=LAB_MOTIONS.find(m=>m.id===motionId);if(!selected)throw new Error('Unknown Lab motion: '+motionId);
      const motionModel=await load(selected.file);if(disposed)return;
      const clips=motionModel.animations||[],bakedClip=clips.find((a:any)=>a.name===selected.clip);
      if(!bakedClip)throw new Error(`Basketball clip missing: ${selected.clip}. Found: ${clips.map((a:any)=>a.name).join(', ')||'none'}`);
      const mixer=new THREE.AnimationMixer(athlete),action=mixer.clipAction(bakedClip);action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
      const bones:Record<string,any>={};athlete.traverse((o:any)=>{if(o.isBone)bones[o.name.toLowerCase()]=o;});
      const findBone=(...names:string[])=>{for(const n of names){const exact=bones[n.toLowerCase()];if(exact)return exact;}return Object.values(bones).find((b:any)=>names.some(n=>b.name.toLowerCase().includes(n.toLowerCase())));};
      const leftHand=findBone('hand_l','lefthand'),rightHand=findBone('hand_r','righthand');if(!leftHand||!rightHand)throw new Error('Full-rig proof: hand bones missing');

      const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,32,20),new THREE.MeshStandardMaterial({color:0xd85b16,roughness:.72,metalness:.02}));ball.castShadow=true;ball.visible=false;scene.add(ball);
      const seamMat=new THREE.LineBasicMaterial({color:0x24130b});for(const rot of [[0,0,0],[0,Math.PI/2,0]]){const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.121,Math.sin(a)*.121,0);})),seamMat);seam.rotation.set(rot[0],rot[1],rot[2]);ball.add(seam);}

      resetRef.current=()=>{action.reset().play();setFrame(0);};
      stepRef.current=()=>{if(!pausedRef.current)return;action.paused=false;mixer.update(1/selected.fps);action.paused=true;setFrame(Math.round(action.time*selected.fps));};
      seekRef.current=(nextFrame:number)=>{const t=Math.max(0,Math.min(bakedClip.duration,nextFrame/selected.fps));mixer.setTime(t);action.time=t;setFrame(Math.round(t*selected.fps));};
      const leftWorld=new THREE.Vector3(),rightWorld=new THREE.Vector3(),contactBall=new THREE.Vector3(),shotAnchor=new THREE.Vector3(),ballTarget=new THREE.Vector3();
      const clock=new THREE.Clock();
      const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
      const bounceHeight=(phase:number)=>{const d=phase<.5?smooth(phase*2):smooth((1-phase)*2);return 1-d;};
      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const ro=new ResizeObserver(resize);ro.observe(mount);resize();
      const positions:Record<View,any>={front:new THREE.Vector3(0,1.25,5.2),quarter:new THREE.Vector3(3.7,1.5,4.1),side:new THREE.Vector3(5.2,1.3,0),back:new THREE.Vector3(0,1.3,-5.2)};
      camera.position.copy(positions[viewRef.current]);setStatus('ready');

      renderer.setAnimationLoop(()=>{
        const delta=Math.min(clock.getDelta(),.05);if(!visibleRef.current)return;
        action.paused=pausedRef.current;if(!pausedRef.current){mixer.update(delta*speedRef.current);const now=performance.now();if(now-lastUiUpdateRef.current>90){setFrame(Math.round(action.time*selected.fps));lastUiUpdateRef.current=now;}}
        leftHand.getWorldPosition(leftWorld);rightHand.getWorldPosition(rightWorld);
        const phase=selected.duration>0?(action.time%selected.duration)/selected.duration:0;
        let showBall=false;
        contactBall.copy(leftWorld).add(rightWorld).multiplyScalar(.5);
        if(selected.id==='dribble-stance'){
          showBall=phase>.05&&phase<.95;const contact=bounceHeight(phase),floorY=.12,handY=Math.max(floorY+.18,rightWorld.y-.06);ballTarget.set(rightWorld.x,floorY+(handY-floorY)*contact,rightWorld.z+.08);
        }else if(selected.id==='chest-pass'){
          showBall=phase>.06&&phase<.86;contactBall.z+=.11;contactBall.y+=.01;
          if(phase<.56)ballTarget.copy(contactBall);else{const t=smooth((phase-.56)/.28);ballTarget.copy(contactBall);ballTarget.z+=.74*t;ballTarget.y+=.05*t;}
        }else if(selected.id==='set-shot'){
          showBall=phase>.06&&phase<.92;
          // The shooting hand owns the ball. The guide hand only supports the side and never drives ball position.
          shotAnchor.copy(rightWorld);shotAnchor.x+=.035;shotAnchor.y+=.11;shotAnchor.z+=.075;ballTarget.copy(shotAnchor);
          // Delay release until the shooting arm has reached the set/extension window. The arc begins from the exact anchor to avoid a jump.
          if(phase>=.66){const t=smooth((phase-.66)/.22);ballTarget.z+=.46*t;ballTarget.y+=.62*t-.14*t*t;}
        }
        ball.visible=selected.ball&&showBall;if(ball.visible)ball.position.copy(ballTarget);
        camera.position.lerp(positions[viewRef.current],.09);camera.lookAt(0,1.02,0);renderer.render(scene,camera);
      });
      cleanup=()=>{resetRef.current=null;stepRef.current=null;seekRef.current=null;ro.disconnect();renderer.setAnimationLoop(null);mixer.stopAllAction();renderer.dispose();mount.replaceChildren();};
    })().catch(err=>{console.error('RCL Lab motion clip failed',err);if(!disposed){setStatus('error');mount.replaceChildren();}});
    return()=>{disposed=true;cleanup();};
  },[motionId]);

  const selectedMotion=LAB_MOTIONS.find(m=>m.id===motionId)??defaultMotion;
  const durationFrames=Math.max(1,Math.round(selectedMotion.duration*selectedMotion.fps));
  const reviewCount=reviewDone.filter(Boolean).length;
  const reviewComplete=reviewCount===reviewChecks.length;
  const reviewContext=`${selectedMotion.label} · ${view==='quarter'?'3/4':view.toUpperCase()} · Frame ${frame} / ${(frame/selectedMotion.fps).toFixed(2)}s · QA ${reviewCount}/${reviewChecks.length}${reviewComplete?' COMPLETE':''} · Result ${reviewResult.toUpperCase()}${reviewNotes.trim()?` · Notes: ${reviewNotes.trim()}`:''}`;
  const copyReviewContext=async()=>{try{await navigator.clipboard.writeText(reviewContext);setCopied(true);window.setTimeout(()=>setCopied(false),1400);}catch{setCopied(false);}};
  const resetReviewState=()=>{setReviewDone(reviewChecks.map(()=>false));setReviewNotes('');setReviewResult('pending');setPaused(true);setSpeed(1);};
  const startReview=()=>{setReviewMode(true);resetReviewState();resetRef.current?.();};
  const moveReview=(direction:-1|1)=>{const index=LAB_MOTIONS.findIndex(m=>m.id===motionId);const next=(index+direction+LAB_MOTIONS.length)%LAB_MOTIONS.length;resetReviewState();setFrame(0);setStatus('loading-motion');setMotionId(LAB_MOTIONS[next].id);};

  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>THE LAB · {skill.toUpperCase()}</small><h2>{title}</h2><p>{match.note}</p></div><span>{match.exact?'MATCHED MOTION':'TECHNIQUE REFERENCE'}</span></div>
    {qaEnabled&&<div className="rigged-motion-picker" role="group" aria-label="Basketball motion QA picker">{LAB_MOTIONS.map(m=><button key={m.id} type="button" aria-pressed={motionId===m.id} className={motionId===m.id?'on':''} onClick={()=>{setStatus('loading-motion');setMotionId(m.id);}}><small>{m.category}</small><b>{m.label}</b></button>)}</div>}
    {qaEnabled&&<div className="rigged-review-context"><button type="button" aria-pressed={reviewMode} onClick={()=>reviewMode?setReviewMode(false):startReview()}>{reviewMode?'EXIT REVIEW':'START REVIEW'}</button><div className="rigged-timeline" aria-live="polite"><b>FRAME {frame}</b><span>{(frame/selectedMotion.fps).toFixed(2)}s</span></div><button type="button" onClick={copyReviewContext}>{copied?'COPIED':'COPY REVIEW POINT'}</button></div>}
    {qaEnabled&&reviewMode&&<fieldset className={`rigged-review-checklist${reviewComplete?' is-complete':''}`}><legend>VISUAL QA · {selectedMotion.label} · {reviewCount}/{reviewChecks.length}{reviewComplete?' COMPLETE':''}</legend>{reviewChecks.map((item,i)=><label key={item}><input type="checkbox" checked={reviewDone[i]} onChange={()=>setReviewDone(v=>v.map((x,j)=>j===i?!x:x))}/><span>{item}</span></label>)}</fieldset>}
    {qaEnabled&&reviewMode&&<div className="rigged-review-nav"><button type="button" onClick={()=>moveReview(-1)}>← PREVIOUS MOTION</button><strong>{LAB_MOTIONS.findIndex(m=>m.id===motionId)+1} / {LAB_MOTIONS.length}</strong><button type="button" onClick={()=>moveReview(1)}>NEXT MOTION →</button></div>}
    {qaEnabled&&reviewMode&&<div className="rigged-review-result" role="group" aria-label="Visual QA result"><span>REVIEW RESULT</span><button type="button" aria-pressed={reviewResult==='pass'} disabled={!reviewComplete} onClick={()=>setReviewResult('pass')}>PASS</button><button type="button" aria-pressed={reviewResult==='needs-fix'} onClick={()=>setReviewResult('needs-fix')}>NEEDS FIX</button></div>}
    {qaEnabled&&reviewMode&&<label className="rigged-review-notes"><span>REVIEW NOTES</span><textarea value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} placeholder="Record the exact visual issue or approval note…" rows={2}/></label>}
    <div className="rigged-player-controls">
      <div className="rigged-playback" role="group" aria-label="Animation playback">
        <button type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'PLAY':'PAUSE'}</button>
        <button type="button" onClick={()=>resetRef.current?.()}>RESTART</button>
        {qaEnabled&&<button type="button" disabled={!paused} onClick={()=>stepRef.current?.()} aria-label="Advance one animation frame">+1 FRAME</button>}
        {([0.5,1,1.5] as const).map(v=><button type="button" key={v} className={speed===v?'on':''} aria-pressed={speed===v} onClick={()=>setSpeed(v)}>{v}×</button>)}
      </div>
      <label className="rigged-scrubber"><span>REPLAY POSITION</span><input type="range" min="0" max={durationFrames} step="1" value={Math.min(frame,durationFrames)} onChange={e=>{setPaused(true);seekRef.current?.(Number(e.target.value));}}/><output>{(Math.min(frame,durationFrames)/selectedMotion.fps).toFixed(2)}s</output></label>
    </div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage"/>
      {(status==='loading-athlete'||status==='loading-motion')&&<div className="rigged-native__status">LOADING MOVEMENT…</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">3D PREVIEW UNAVAILABLE · USE THE COACHING STEPS BELOW</div>}
      <div className="rigged-native__views" role="group" aria-label="Camera angle">{(['front','quarter','side','back'] as View[]).map(v=><button type="button" key={v} className={view===v?'on':''} aria-pressed={view===v} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge">{qaEnabled?<><b>READY V4</b> · {selectedMotion.label}</>:<><b>RCL MOTION</b> · {selectedMotion.label} · {view==='quarter'?'3/4':view.toUpperCase()}</>}</div>
    </div>
  </section>;
}
