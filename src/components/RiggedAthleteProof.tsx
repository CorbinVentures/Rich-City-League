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
  const [motion,setMotion]=useState('Authoring basketball stance');

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

      // Author a dedicated basketball stance/handle clip on the athlete's exact rig.
      // We deliberately do not reuse generic crouch/idle clips: the clip below owns
      // the basketball pose and is played through AnimationMixer like a normal asset.
      const bones:Record<string,any>={};
      athlete.traverse((o:any)=>{if(o.isBone)bones[o.name.toLowerCase()]=o;});
      const findBone=(...names:string[])=>{
        for(const n of names){const exact=bones[n.toLowerCase()];if(exact)return exact;}
        return Object.values(bones).find((b:any)=>names.some(n=>b.name.toLowerCase().includes(n.toLowerCase())));
      };
      const pelvis=findBone('pelvis','hips','hip'),spine=findBone('spine_01','spine1','spine');
      const leftUpper=findBone('upperarm_l','leftupperarm','arm_l'),rightUpper=findBone('upperarm_r','rightupperarm','arm_r');
      const leftFore=findBone('lowerarm_l','leftforearm','forearm_l'),rightFore=findBone('lowerarm_r','rightforearm','forearm_r');
      const leftThigh=findBone('thigh_l','leftupleg','upleg_l'),rightThigh=findBone('thigh_r','rightupleg','upleg_r');
      const leftCalf=findBone('calf_l','leftleg','leg_l'),rightCalf=findBone('calf_r','rightleg','leg_r');
      const leftHand=findBone('hand_l','lefthand'),rightHand=findBone('hand_r','righthand');
      const required={pelvis,spine,leftUpper,rightUpper,leftFore,rightFore,leftThigh,rightThigh,leftCalf,rightCalf,leftHand,rightHand};
      if(Object.values(required).some(v=>!v))throw new Error('Basketball clip: required rig bones missing');

      const q=(bone:any,x:number,y:number,z:number)=>bone.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'XYZ'))).toArray();
      const times=[0,.3,.6,.9,1.2];
      const tracks:any[]=[];
      const addQ=(bone:any,poses:number[][])=>tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`,times,poses.flatMap(p=>q(bone,p[0],p[1],p[2]))));
      addQ(pelvis,[[-.22,0,.04],[-.25,0,.02],[-.22,0,-.04],[-.25,0,-.02],[-.22,0,.04]]);
      addQ(spine,[[.16,0,-.04],[.13,0,.03],[.16,0,.04],[.13,0,-.03],[.16,0,-.04]]);
      addQ(leftThigh,[[.42,0,.12],[.48,0,.1],[.42,0,.08],[.38,0,.1],[.42,0,.12]]);
      addQ(rightThigh,[[.42,0,-.12],[.38,0,-.1],[.42,0,-.08],[.48,0,-.1],[.42,0,-.12]]);
      addQ(leftCalf,[[-.7,0,0],[-.78,0,0],[-.7,0,0],[-.64,0,0],[-.7,0,0]]);
      addQ(rightCalf,[[-.7,0,0],[-.64,0,0],[-.7,0,0],[-.78,0,0],[-.7,0,0]]);
      addQ(leftUpper,[[.78,.05,.34],[1.05,.02,.4],[.72,.03,.22],[.5,.02,.16],[.78,.05,.34]]);
      addQ(rightUpper,[[.72,-.03,-.22],[.5,-.02,-.16],[.78,-.05,-.34],[1.05,-.02,-.4],[.72,-.03,-.22]]);
      addQ(leftFore,[[-1.0,0,0],[-1.32,0,0],[-.88,0,0],[-.72,0,0],[-1.0,0,0]]);
      addQ(rightFore,[[-.88,0,0],[-.72,0,0],[-1.0,0,0],[-1.32,0,0],[-.88,0,0]]);
      const basketballClip=new THREE.AnimationClip('RCL_Stationary_Handle_v1',1.2,tracks);
      const mixer=new THREE.AnimationMixer(athlete);
      mixer.clipAction(basketballClip).reset().setLoop(THREE.LoopRepeat,Infinity).play();
      setMotion('RCL_Stationary_Handle_v1');
      const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,32,20),new THREE.MeshStandardMaterial({color:0xd85b16,roughness:.72,metalness:.02}));
      ball.castShadow=true;scene.add(ball);
      const seamMat=new THREE.LineBasicMaterial({color:0x24130b});
      for(const rot of [[0,0,0],[0,Math.PI/2,0]]){
        const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.121,Math.sin(a)*.121,0);})),seamMat);
        seam.rotation.set(rot[0],rot[1],rot[2]);ball.add(seam);
      }

      const handWorld=new THREE.Vector3(),ballTarget=new THREE.Vector3();
      const clock=new THREE.Clock();let elapsed=0;
      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const ro=new ResizeObserver(resize);ro.observe(mount);resize();
      const positions:Record<View,any>={front:new THREE.Vector3(0,1.25,5.2),quarter:new THREE.Vector3(3.7,1.5,4.1),side:new THREE.Vector3(5.2,1.3,0),back:new THREE.Vector3(0,1.3,-5.2)};
      camera.position.copy(positions.front);setStatus('ready');

      renderer.setAnimationLoop(()=>{
        const delta=Math.min(clock.getDelta(),.05);elapsed+=delta;mixer.update(delta);
        const cycle=(elapsed%1.2)/1.2,left=cycle<.5,local=left?cycle*2:(cycle-.5)*2;
        const contact=Math.pow(Math.abs(Math.cos(local*Math.PI)),.72);
        const activeHand=left?leftHand:rightHand;
        if(activeHand){activeHand.getWorldPosition(handWorld);ballTarget.set(handWorld.x+(left?-.03:.03),.16+Math.max(.22,handWorld.y-.16)*contact,handWorld.z+.08);}
        else{ballTarget.set(left?-.34:.34,.16+.62*contact,.3);}
        ball.position.lerp(ballTarget,.55);ball.rotation.x+=delta*4.5;ball.rotation.z+=(left?-1:1)*delta*3.2;
        camera.position.lerp(positions[viewRef.current],.09);camera.lookAt(0,1.02,0);renderer.render(scene,camera);
      });
      cleanup=()=>{ro.disconnect();renderer.setAnimationLoop(null);mixer.stopAllAction();renderer.dispose();mount.replaceChildren();};
    })().catch(err=>{console.error('RCL stationary handle clip failed',err);if(!disposed)setStatus('error');});
    return()=>{disposed=true;cleanup();};
  },[]);

  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>THE LAB · BALL HANDLING</small><h2>Stationary Ball-Handling Series</h2><p>Authored basketball keyframe clip: loaded stance, alternating arm chain and synchronized ball contact. One athlete, one timeline, four camera angles.</p></div><span>DRILL PREVIEW</span></div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage"/>
      {(status==='loading-athlete'||status==='loading-motion')&&<div className="rigged-native__status">{status==='loading-motion'?'LOADING ATHLETIC STANCE…':'LOADING ATHLETE…'}</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">DRILL PREVIEW FAILED</div>}
      <div className="rigged-native__views">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'on':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge"><b>AUTHORED BASKETBALL CLIP</b> · {motion} · Same athlete / same timeline</div>
    </div>
  </section>;
}
