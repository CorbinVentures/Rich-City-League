'use client';

import { useEffect, useRef, useState } from 'react';
import './RiggedAthleteProof.css';

type Props={title:string};
type View='front'|'quarter'|'side'|'back';
type Status='loading-athlete'|'loading-motion'|'ready'|'error';

export function RiggedAthleteProof({title}:Props){
  const mountRef=useRef<HTMLDivElement>(null);
  const viewRef=useRef<View>('front');
  const [status,setStatus]=useState<Status>('loading-athlete');
  const [view,setView]=useState<View>('front');
  const [motion,setMotion]=useState('Defensive Slide V1');

  useEffect(()=>{viewRef.current=view;},[view]);

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
      const motionModel=await load('/lab3d/RCL_Dribble_Stance_v1.glb');if(disposed)return;
      const clips=motionModel.animations||[];
      const expectedClip='RCL_Dribble_Stance_v1';
      const bakedClip=clips.find((a:any)=>a.name===expectedClip);
      if(!bakedClip)throw new Error(`Basketball clip missing: ${expectedClip}. Found: ${clips.map((a:any)=>a.name).join(', ')||'none'}`);
      const mixer=new THREE.AnimationMixer(athlete);
      const action=mixer.clipAction(bakedClip);action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
      setMotion(`BAKED DRIBBLE MOTION · ${bakedClip.name}`);
      const bones:Record<string,any>={};
      athlete.traverse((o:any)=>{if(o.isBone)bones[o.name.toLowerCase()]=o;});
      const findBone=(...names:string[])=>{
        for(const n of names){const exact=bones[n.toLowerCase()];if(exact)return exact;}
        return Object.values(bones).find((b:any)=>names.some(n=>b.name.toLowerCase().includes(n.toLowerCase())));
      };
      const leftHand=findBone('hand_l','lefthand'),rightHand=findBone('hand_r','righthand');
      if(!leftHand||!rightHand)throw new Error('Full-rig proof: hand bones missing');
      const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,32,20),new THREE.MeshStandardMaterial({color:0xd85b16,roughness:.72,metalness:.02}));
      ball.castShadow=true;ball.visible=true;scene.add(ball);
      const seamMat=new THREE.LineBasicMaterial({color:0x24130b});
      for(const rot of [[0,0,0],[0,Math.PI/2,0]]){
        const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.121,Math.sin(a)*.121,0);})),seamMat);
        seam.rotation.set(rot[0],rot[1],rot[2]);ball.add(seam);
      }

      const handWorld=new THREE.Vector3(),ballTarget=new THREE.Vector3(),prevBall=new THREE.Vector3();
      const ballClock=new THREE.Clock(false);ballClock.start();
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
        const delta=Math.min(clock.getDelta(),.05);mixer.update(delta);
        rightHand.getWorldPosition(handWorld);athlete.worldToLocal(handWorld);
        const phase=(ballClock.getElapsedTime()%1.0)/1.0,contact=bounceHeight(phase);
        const floorY=.13,handY=Math.max(floorY+.25,handWorld.y-.08);
        ballTarget.set(handWorld.x+.08,floorY+(handY-floorY)*contact,handWorld.z+.04);
        if(prevBall.lengthSq()===0)prevBall.copy(ballTarget);prevBall.lerp(ballTarget,.42);ball.position.copy(prevBall);
        camera.position.lerp(positions[viewRef.current],.09);camera.lookAt(0,1.02,0);renderer.render(scene,camera);
      });
      cleanup=()=>{ro.disconnect();renderer.setAnimationLoop(null);mixer.stopAllAction();renderer.dispose();mount.replaceChildren();};
    })().catch(err=>{console.error('RCL dribble stance clip failed',err);if(!disposed)setStatus('error');});
    return()=>{disposed=true;cleanup();};
  },[]);

  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>THE LAB · BALL HANDLING</small><h2>Dribble Stance V1</h2><p>Ready-V4-anchored pound dribble preview. Loaded hips, planted feet, right-hand pound cycle, protective off hand, and synchronized basketball playback.</p></div><span>DRILL PREVIEW</span></div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage"/>
      {(status==='loading-athlete'||status==='loading-motion')&&<div className="rigged-native__status">{status==='loading-motion'?'LOADING ATHLETIC STANCE…':'LOADING ATHLETE…'}</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">DRILL PREVIEW FAILED</div>}
      <div className="rigged-native__views">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'on':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge"><b>READY V4 ANCHORED</b> · {motion} · Same athlete / same timeline</div>
    </div>
  </section>;
}
