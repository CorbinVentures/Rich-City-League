'use client';

import { useEffect, useRef, useState } from 'react';
import './RiggedAthleteProof.css';

type Props = { title: string };
type View = 'front'|'quarter'|'side'|'back';
type Status = 'loading-athlete'|'ready'|'error';

export function RiggedAthleteProof({ title }: Props) {
  const mountRef=useRef<HTMLDivElement>(null);
  const viewRef=useRef<View>('front');
  const [status,setStatus]=useState<Status>('loading-athlete');
  const [view,setView]=useState<View>('front');

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
      const model:any=await new Promise((resolve,reject)=>loader.load('/lab3d/athlete.glb',resolve,undefined,reject));
      if(disposed)return;
      const athlete=model.scene;
      athlete.traverse((o:any)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      const box=new THREE.Box3().setFromObject(athlete),size=new THREE.Vector3(),center=new THREE.Vector3();box.getSize(size);box.getCenter(center);
      athlete.position.set(-center.x,-box.min.y,-center.z);athlete.scale.setScalar(2.15/Math.max(size.y,.001));scene.add(athlete);

      const bones:Record<string,any>={};
      athlete.traverse((o:any)=>{if(o.isBone)bones[o.name.toLowerCase()]=o;});
      const findBone=(...names:string[])=>{for(const name of names){const exact=bones[name.toLowerCase()];if(exact)return exact;}return Object.values(bones).find((b:any)=>names.some(n=>b.name.toLowerCase().includes(n.toLowerCase())));};
      const pelvis=findBone('pelvis','hips','hip');
      const spine=findBone('spine_01','spine1','spine');
      const leftUpper=findBone('upperarm_l','leftupperarm','arm_l');
      const rightUpper=findBone('upperarm_r','rightupperarm','arm_r');
      const leftFore=findBone('lowerarm_l','leftforearm','forearm_l');
      const rightFore=findBone('lowerarm_r','rightforearm','forearm_r');
      const leftThigh=findBone('thigh_l','leftupleg','upleg_l');
      const rightThigh=findBone('thigh_r','rightupleg','upleg_r');
      const leftCalf=findBone('calf_l','leftleg','leg_l');
      const rightCalf=findBone('calf_r','rightleg','leg_r');
      const leftHand=findBone('hand_l','lefthand');
      const rightHand=findBone('hand_r','righthand');

      const controlled=[pelvis,spine,leftUpper,rightUpper,leftFore,rightFore,leftThigh,rightThigh,leftCalf,rightCalf].filter(Boolean);
      const base=new Map<any,any>();controlled.forEach((b:any)=>base.set(b,b.quaternion.clone()));
      const euler=new THREE.Euler();
      const apply=(bone:any,x=0,y=0,z=0)=>{if(!bone)return;bone.quaternion.copy(base.get(bone));euler.set(x,y,z,'XYZ');bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(euler));};

      const ball=new THREE.Mesh(new THREE.SphereGeometry(.12,32,20),new THREE.MeshStandardMaterial({color:0xd85b16,roughness:.72,metalness:.02}));
      ball.castShadow=true;scene.add(ball);
      const seamMat=new THREE.LineBasicMaterial({color:0x24130b});
      const seam=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return new THREE.Vector3(Math.cos(a)*.121,Math.sin(a)*.121,0);})),seamMat);
      ball.add(seam);

      const handWorld=new THREE.Vector3();
      const target=new THREE.Vector3();
      const clock=new THREE.Clock();
      let elapsed=0;
      setStatus('ready');

      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const ro=new ResizeObserver(resize);ro.observe(mount);resize();
      const positions:Record<View,any>={front:new THREE.Vector3(0,1.25,5.2),quarter:new THREE.Vector3(3.7,1.5,4.1),side:new THREE.Vector3(5.2,1.3,0),back:new THREE.Vector3(0,1.3,-5.2)};
      camera.position.copy(positions.front);

      renderer.setAnimationLoop(()=>{
        elapsed+=Math.min(clock.getDelta(),.05);
        const phase=(elapsed%1.1)/1.1;
        const leftCycle=phase<.5;
        const local=leftCycle?phase*2:(phase-.5)*2;
        const bounce=Math.abs(Math.cos(local*Math.PI));
        const pulse=Math.sin(local*Math.PI*2);
        apply(pelvis,-.16,0,pulse*.025);
        apply(spine,.08,0,-pulse*.035);
        apply(leftThigh,.28+(leftCycle?.08:.02),0,.08);
        apply(rightThigh,.28+(leftCycle?.02:.08),0,-.08);
        apply(leftCalf,-.5,0,0);apply(rightCalf,-.5,0,0);
        apply(leftUpper,leftCycle?.62:.38,0,leftCycle?.22:.08);
        apply(rightUpper,leftCycle?.38:.62,0,rightCycleZ(leftCycle));
        apply(leftFore,leftCycle?-1.02:-.62,0,0);
        apply(rightFore,leftCycle?-.62:-1.02,0,0);

        const activeHand=leftCycle?leftHand:rightHand;
        if(activeHand){activeHand.getWorldPosition(handWorld);target.copy(handWorld);target.y=.18+(.62*bounce);target.x+=leftCycle?-.04:.04;target.z+=.05;ball.position.lerp(target,.42);}
        else{ball.position.set(leftCycle?-.34:.34,.18+(.62*bounce),.28);}
        ball.rotation.x+=.06;ball.rotation.z+=(leftCycle?-.05:.05);

        camera.position.lerp(positions[viewRef.current],.09);camera.lookAt(0,1.03,0);renderer.render(scene,camera);
      });
      cleanup=()=>{ro.disconnect();renderer.setAnimationLoop(null);renderer.dispose();mount.replaceChildren();};
    })().catch(err=>{console.error('RCL stationary handling demo failed',err);if(!disposed)setStatus('error');});
    return()=>{disposed=true;cleanup();};
  },[]);

  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>THE LAB · BALL HANDLING</small><h2>Stationary Ball-Handling Series</h2><p>Athletic stance · finger-pad control · eyes up · alternating rhythm. First basketball-specific motion prototype on the production athlete rig.</p></div><span>DRILL PREVIEW</span></div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage" />
      {status==='loading-athlete'&&<div className="rigged-native__status">LOADING BALL-HANDLING DRILL…</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">DRILL PREVIEW FAILED</div>}
      <div className="rigged-native__views">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'on':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge"><b>STATIONARY HANDLE</b> · Alternating hands · Same athlete / same timeline</div>
    </div>
  </section>;
}

function rightCycleZ(leftCycle:boolean){return leftCycle?-.08:-.22;}
