'use client';

import { useEffect, useRef, useState } from 'react';
import './RiggedAthleteProof.css';

type Props = { title: string };
type View = 'front'|'quarter'|'side'|'back';
type Status = 'loading-athlete'|'loading-motion'|'ready'|'error';

export function RiggedAthleteProof({ title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>('front');
  const [status,setStatus]=useState<Status>('loading-athlete');
  const [view,setView]=useState<View>('front');
  const [motion,setMotion]=useState('—');

  useEffect(()=>{ viewRef.current=view; },[view]);

  useEffect(()=>{
    const mount=mountRef.current;
    if(!mount) return;
    let disposed=false;
    let cleanup=()=>{};
    (async()=>{
      const importModule=(url:string)=>import(/* webpackIgnore: true */ url);
      const THREE:any=await importModule('/lab3d/vendor/three.module.min.js');
      const { GLTFLoader }:any=await importModule('/lab3d/vendor/GLTFLoader.js');
      if(disposed) return;

      const scene=new THREE.Scene();
      scene.background=new THREE.Color(0x071019);
      scene.fog=new THREE.Fog(0x071019,7,15);
      const camera=new THREE.PerspectiveCamera(36,1,.05,50);
      const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
      renderer.shadowMap.enabled=true;
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xb9dcff,0x15202a,2.2));
      const key=new THREE.DirectionalLight(0xffffff,3.2); key.position.set(3,6,4); key.castShadow=true; scene.add(key);
      const rim=new THREE.DirectionalLight(0xff5b16,2.4); rim.position.set(-4,3,-4); scene.add(rim);
      const floor=new THREE.Mesh(new THREE.CircleGeometry(5.5,64),new THREE.MeshStandardMaterial({color:0x0c1822,roughness:.9,metalness:.05}));
      floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
      const grid=new THREE.GridHelper(10,20,0x315064,0x142a38); grid.position.y=.004; scene.add(grid);

      let mixer:any=null;
      const clock=new THREE.Clock();
      const loader=new GLTFLoader();
      const loadGLTF=(url:string)=>new Promise<any>((resolve,reject)=>loader.load(url,resolve,undefined,reject));

      const model=await loadGLTF('/lab3d/athlete.glb');
      if(disposed) return;
      const athlete=model.scene;
      athlete.traverse((o:any)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      const box=new THREE.Box3().setFromObject(athlete),size=new THREE.Vector3(),center=new THREE.Vector3();
      box.getSize(size); box.getCenter(center);
      athlete.position.set(-center.x,-box.min.y,-center.z);
      athlete.scale.setScalar(2.15/Math.max(size.y,.001));
      scene.add(athlete);

      setStatus('loading-motion');
      const motionAsset=await loadGLTF('/lab3d/UAL1_Standard.glb');
      if(disposed) return;
      const clips=motionAsset.animations||[];
      const clip=clips.find((a:any)=>/^Jog$/i.test(a.name))
        || clips.find((a:any)=>/Jog/i.test(a.name))
        || clips.find((a:any)=>/^Idle$/i.test(a.name))
        || clips[0];
      if(!clip) throw new Error('Universal Animation Library contains no animation clips');

      mixer=new THREE.AnimationMixer(athlete);
      const action=mixer.clipAction(clip);
      action.reset().setLoop(THREE.LoopRepeat,Infinity).play();
      setMotion(clip.name||'Animation test');
      setStatus('ready');

      const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
      const ro=new ResizeObserver(resize); ro.observe(mount); resize();
      const positions:Record<View,any>={
        front:new THREE.Vector3(0,1.25,5.2),
        quarter:new THREE.Vector3(3.7,1.5,4.1),
        side:new THREE.Vector3(5.2,1.3,0),
        back:new THREE.Vector3(0,1.3,-5.2)
      };
      camera.position.copy(positions.front);
      renderer.setAnimationLoop(()=>{
        const delta=Math.min(clock.getDelta(),.05);
        mixer?.update(delta);
        camera.position.lerp(positions[viewRef.current],.09);
        camera.lookAt(0,1.08,0);
        renderer.render(scene,camera);
      });
      cleanup=()=>{ro.disconnect();renderer.setAnimationLoop(null);mixer?.stopAllAction();renderer.dispose();mount.replaceChildren();};
    })().catch((err)=>{console.error('RCL rig animation proof failed',err);if(!disposed)setStatus('error');});
    return()=>{disposed=true;cleanup();};
  },[]);

  const loading=status==='loading-athlete'||status==='loading-motion';
  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>RIG ANIMATION TEST</small><h2>One athlete. One live animation.</h2><p>Universal Animation Library rig-compatibility proof. Camera changes now observe the same continuously animated athlete.</p></div><span>DEV PREVIEW</span></div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage" />
      {loading&&<div className="rigged-native__status">{status==='loading-motion'?'LOADING FULL-BODY MOTION…':'LOADING RIGGED ATHLETE…'}</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">ANIMATION PROOF FAILED</div>}
      <div className="rigged-native__views">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'on':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge"><b>RIG ANIMATION TEST</b> · {status==='ready'?motion:'Preparing motion'} · Same athlete / same timeline</div>
    </div>
  </section>;
}
