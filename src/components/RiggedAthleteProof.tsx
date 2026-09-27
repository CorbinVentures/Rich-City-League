'use client';

import { useEffect, useRef, useState } from 'react';
import './RiggedAthleteProof.css';
import { LAB_MOTIONS, type LabMotionId } from '@/lib/labMotionLibrary';

type Props={title:string};
type View='front'|'quarter'|'side'|'back';
type Status='loading-athlete'|'loading-motion'|'ready'|'error';

export function RiggedAthleteProof({title}:Props){
  const mountRef=useRef<HTMLDivElement>(null);
  const viewRef=useRef<View>('front');
  const [status,setStatus]=useState<Status>('loading-athlete');
  const [view,setView]=useState<View>('front');
  const [motion,setMotion]=useState('Set Shot V1');
  const [motionId,setMotionId]=useState<LabMotionId>('set-shot');
  const [paused,setPaused]=useState(false);
  const [speed,setSpeed]=useState<0.5|1|1.5>(1);
  const [frame,setFrame]=useState(0);
  const [copied,setCopied]=useState(false);
  const [reviewMode,setReviewMode]=useState(false);
  const reviewChecks=['Base / foot plant','Knee tracking','Hip / torso posture','Arm / hand mechanics','Ball timing / contact','Return to Ready V4'];
  const [reviewDone,setReviewDone]=useState<boolean[]>(()=>reviewChecks.map(()=>false));
  const pausedRef=useRef(false),speedRef=useRef(1),resetRef=useRef<(()=>void)|null>(null),stepRef=useRef<(()=>void)|null>(null),seekRef=useRef<((frame:number)=>void)|null>(null);


  useEffect(()=>{viewRef.current=view;},[view]);
  useEffect(()=>{pausedRef.current=paused;},[paused]);
  useEffect(()=>{speedRef.current=speed;},[speed]);

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;mount.appendChild(renderer.domElement);
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

      // Playback layer only: load the basketball-specific baked action by exact name.
      // Never silently fall back to a generic locomotion/crouch animation.
      const selected=LAB_MOTIONS.find(m=>m.id===motionId);if(!selected)throw new Error('Unknown Lab motion: '+motionId);
      const motionModel=await load(selected.file);if(disposed)return;
      const clips=motionModel.animations||[];
      const expectedClip=selected.clip;
      const bakedClip=clips.find((a:any)=>a.name===expectedClip);
      if(!bakedClip)throw new Error(`Basketball clip missing: ${expectedClip}. Found: ${clips.map((a:any)=>a.name).join(', ')||'none'}`);
      const mixer=new THREE.AnimationMixer(athlete);
      const action=mixer.clipAction(bakedClip);action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
      setMotion(`BAKED ${selected.category.toUpperCase()} MOTION · ${bakedClip.name}`);
      const bones:Record<string,any>={};
      athlete.traverse((o:any)=>{if(o.isBone)bones[o.name.toLowerCase()]=o;});
      const findBone=(...names:string[])=>{
        for(const n of names){const exact=bones[n.toLowerCase()];if(exact)return exact;}
        return Object.values(bones).find((b:any)=>names.some(n=>b.name.toLowerCase().includes(n.toLowerCase())));
      };
      const leftHand=findBone('hand_l','lefthand'),rightHand=findBone('hand_r','righthand');
      if(!leftHand||!rightHand)throw new Error('Full-rig proof: hand bones missing');
      const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,32,20),new THREE.MeshStandardMaterial({color:0xd85b16,roughness:.72,metalness:.02}));
      ball.castShadow=true;ball.visible=selected.ball;scene.add(ball);
      const seamMat=new THREE.LineBasicMaterial({color:0x24130b});
      for(const rot of [[0,0,0],[0,Math.PI/2,0]]){
        const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.121,Math.sin(a)*.121,0);})),seamMat);
        seam.rotation.set(rot[0],rot[1],rot[2]);ball.add(seam);
      }

      const handWorld=new THREE.Vector3(),ballTarget=new THREE.Vector3(),prevBall=new THREE.Vector3();
      const ballClock=new THREE.Clock(false);ballClock.start();
      resetRef.current=()=>{action.reset().play();ballClock.stop();ballClock.start();prevBall.set(0,0,0);setFrame(0);};
      stepRef.current=()=>{if(!pausedRef.current)return;action.paused=false;mixer.update(1/selected.fps);action.paused=true;setFrame(Math.round(action.time*selected.fps));};
      seekRef.current=(nextFrame:number)=>{const t=Math.max(0,Math.min(bakedClip.duration,nextFrame/selected.fps));mixer.setTime(t);action.time=t;setFrame(Math.round(t*selected.fps));};
      const leftWorld=new THREE.Vector3(),rightWorld=new THREE.Vector3(),chestBall=new THREE.Vector3(),releaseOrigin=new THREE.Vector3();
      const clock=new THREE.Clock();
      // Ball timing follows a smooth push → floor → recovery cycle. The athlete remains
      // 100% baked animation; no runtime bone rotations are applied.
      const smooth=(t:number)=>t*t*(3-2*t);
      const bounceHeight=(phase:number)=>{
        // phase 0 = hand contact, .5 = floor contact, 1 = next hand contact.
        const d=phase<.5?smooth(phase*2):smooth((1-phase)*2);
        return 1-d;
      };
      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const ro=new ResizeObserver(resize);ro.observe(mount);resize();
      const positions:Record<View,any>={front:new THREE.Vector3(0,1.25,5.2),quarter:new THREE.Vector3(3.7,1.5,4.1),side:new THREE.Vector3(5.2,1.3,0),back:new THREE.Vector3(0,1.3,-5.2)};
      camera.position.copy(positions.front);setStatus('ready');

      renderer.setAnimationLoop(()=>{
        const delta=Math.min(clock.getDelta(),.05);action.paused=pausedRef.current;if(!pausedRef.current){mixer.update(delta*speedRef.current);setFrame(Math.round(action.time*selected.fps));}
        rightHand.getWorldPosition(handWorld);athlete.worldToLocal(handWorld);
        leftHand.getWorldPosition(leftWorld);rightHand.getWorldPosition(rightWorld);athlete.worldToLocal(leftWorld);athlete.worldToLocal(rightWorld);
        if(pausedRef.current){ballClock.stop();}else if(!ballClock.running){ballClock.start();}
        if(selected.id==='dribble-stance'){
          const phase=(ballClock.getElapsedTime()%1.0),contact=bounceHeight(phase),floorY=.13,handY=Math.max(floorY+.25,rightWorld.y-.08);
          ballTarget.set(rightWorld.x+.08,floorY+(handY-floorY)*contact,rightWorld.z+.04);
        }else if(selected.id==='chest-pass'){
          const phase=(ballClock.getElapsedTime()%1.15)/1.15;chestBall.copy(leftWorld).add(rightWorld).multiplyScalar(.5);chestBall.z+=.08;
          if(phase<.48){ballTarget.copy(chestBall);releaseOrigin.copy(chestBall);}
          else if(phase<.76){const t=smooth((phase-.48)/.28);ballTarget.copy(releaseOrigin).lerp(new THREE.Vector3(releaseOrigin.x,releaseOrigin.y,releaseOrigin.z+.78),t);}
          else {const t=smooth((phase-.76)/.24);ballTarget.copy(chestBall).lerp(releaseOrigin,t);}
        }else if(selected.id==='set-shot'){
          const phase=(ballClock.getElapsedTime()%1.35)/1.35;chestBall.copy(leftWorld).add(rightWorld).multiplyScalar(.5);chestBall.z+=.06;
          if(phase<.48){const pocket=smooth(phase/.48);ballTarget.copy(chestBall);ballTarget.y+=.38*pocket;ballTarget.z+=.10*pocket;releaseOrigin.copy(ballTarget);}
          else if(phase<.82){const t=smooth((phase-.48)/.34);ballTarget.copy(releaseOrigin);ballTarget.y+=.82*t-.30*t*t;ballTarget.z+=.32*t;}
          else {const t=smooth((phase-.82)/.18);ballTarget.copy(chestBall).lerp(releaseOrigin,t);}
        }
        if(selected.ball){if(prevBall.lengthSq()===0)prevBall.copy(ballTarget);prevBall.lerp(ballTarget,.5);ball.position.copy(prevBall);}
        camera.position.lerp(positions[viewRef.current],.09);camera.lookAt(0,1.02,0);renderer.render(scene,camera);
      });
      cleanup=()=>{resetRef.current=null;stepRef.current=null;seekRef.current=null;ro.disconnect();renderer.setAnimationLoop(null);mixer.stopAllAction();renderer.dispose();mount.replaceChildren();};
    })().catch(err=>{console.error('RCL Lab motion clip failed',err);if(!disposed)setStatus('error');});
    return()=>{disposed=true;cleanup();};
  },[motionId]);

  const selectedMotion=LAB_MOTIONS.find(m=>m.id===motionId)!;
  const durationFrames=Math.round(selectedMotion.duration*selectedMotion.fps);
  const reviewCount=reviewDone.filter(Boolean).length;
  const reviewComplete=reviewCount===reviewChecks.length;
  const reviewContext=`${selectedMotion.label} · ${view==='quarter'?'3/4':view.toUpperCase()} · Frame ${frame} / ${(frame/selectedMotion.fps).toFixed(2)}s · QA ${reviewCount}/${reviewChecks.length}${reviewComplete?' COMPLETE':''}`;
  const copyReviewContext=async()=>{try{await navigator.clipboard.writeText(reviewContext);setCopied(true);window.setTimeout(()=>setCopied(false),1400);}catch{setCopied(false);}};
  const startReview=()=>{setReviewMode(true);setReviewDone(reviewChecks.map(()=>false));setPaused(true);setSpeed(1);resetRef.current?.();};
  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>THE LAB · {selectedMotion.category.toUpperCase()}</small><h2>{selectedMotion.label}</h2><p>Canonical Ready-V4 basketball motion. Select any engineering-complete action below to inspect the same athlete, rig, camera views, and baked timeline.</p></div><span>DRILL PREVIEW</span></div>
    <div className="rigged-motion-picker" role="group" aria-label="Basketball motion">
      {LAB_MOTIONS.map(m=><button key={m.id} type="button" aria-pressed={motionId===m.id} className={motionId===m.id?'on':''} onClick={()=>{setStatus('loading-motion');setMotionId(m.id);}}><small>{m.category}</small><b>{m.label}</b></button>)}
    </div>
    <div className="rigged-review-context"><button type="button" aria-pressed={reviewMode} onClick={()=>reviewMode?setReviewMode(false):startReview()}>{reviewMode?'EXIT REVIEW':'START REVIEW'}</button><div className="rigged-timeline" aria-live="polite"><b>FRAME {frame}</b><span>{(frame/selectedMotion.fps).toFixed(2)}s</span></div><button type="button" onClick={copyReviewContext}>{copied?'COPIED':'COPY REVIEW POINT'}</button></div>
    {reviewMode&&<fieldset className={`rigged-review-checklist${reviewComplete?' is-complete':''}`}><legend>VISUAL QA · {selectedMotion.label} · {reviewCount}/{reviewChecks.length}{reviewComplete?' COMPLETE':''}</legend>{reviewChecks.map((item,i)=><label key={item}><input type="checkbox" checked={reviewDone[i]} onChange={()=>setReviewDone(v=>v.map((x,j)=>j===i?!x:x))}/><span>{item}</span></label>)}</fieldset>}
    <label className="rigged-scrubber"><span>SCRUB TIMELINE</span><input type="range" min="0" max={durationFrames} step="1" value={Math.min(frame,durationFrames)} onChange={e=>{setPaused(true);seekRef.current?.(Number(e.target.value));}}/><output>{Math.min(frame,durationFrames)} / {durationFrames}</output></label>
    <div className="rigged-playback" role="group" aria-label="Animation playback">
      <button type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'PLAY':'PAUSE'}</button>
      <button type="button" onClick={()=>resetRef.current?.()}>RESTART</button>
      <button type="button" disabled={!paused} onClick={()=>stepRef.current?.()} aria-label="Advance one 30 FPS animation frame">+1 FRAME</button>
      {([0.5,1,1.5] as const).map(v=><button type="button" key={v} className={speed===v?'on':''} aria-pressed={speed===v} onClick={()=>setSpeed(v)}>{v}×</button>)}
    </div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage"/>
      {(status==='loading-athlete'||status==='loading-motion')&&<div className="rigged-native__status">{status==='loading-motion'?'LOADING ATHLETIC STANCE…':'LOADING ATHLETE…'}</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">DRILL PREVIEW FAILED</div>}
      <div className="rigged-native__views">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'on':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge"><b>READY V4 ANCHORED</b> · {motion} · Same athlete / same timeline</div>
    </div>
  </section>;
}
