'use client';

import { useEffect, useRef, useState } from 'react';
import './RiggedAthleteProof.css';

type Props = { title: string };
type View = 'front'|'quarter'|'side'|'back';

export function RiggedAthleteProof({ title }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [view,setView]=useState<View>('front');

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
    new GLTFLoader().load('/lab3d/athlete.glb',(model:any)=>{
      if(disposed) return;
      const athlete=model.scene;
      athlete.traverse((o:any)=>{const mesh:any=o;if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
      const box=new THREE.Box3().setFromObject(athlete),size=new THREE.Vector3(),center=new THREE.Vector3();
      box.getSize(size); box.getCenter(center);
      athlete.position.set(-center.x,-box.min.y,-center.z);
      athlete.scale.setScalar(2.15/Math.max(size.y,.001));
      scene.add(athlete);
      const clip=model.animations.find((a:any)=>/Idle|Jog/i.test(a.name))||model.animations[0];
      if(clip){mixer=new THREE.AnimationMixer(athlete);mixer.clipAction(clip).play();}
      setStatus('ready');
    },undefined,(err:any)=>{console.error('RCL athlete load failed',err);if(!disposed)setStatus('error');});
    const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();};
    const ro=new ResizeObserver(resize); ro.observe(mount); resize();
    const positions:Record<View,any>={front:new THREE.Vector3(0,1.25,5.2),quarter:new THREE.Vector3(3.7,1.5,4.1),side:new THREE.Vector3(5.2,1.3,0),back:new THREE.Vector3(0,1.3,-5.2)};
    renderer.setAnimationLoop(()=>{mixer?.update(Math.min(clock.getDelta(),.05));camera.position.lerp(positions[view],.09);camera.lookAt(0,1.08,0);renderer.render(scene,camera);});
    cleanup=()=>{ro.disconnect();renderer.setAnimationLoop(null);renderer.dispose();mount.replaceChildren();};
    })().catch((err)=>{console.error('RCL renderer init failed',err);if(!disposed)setStatus('error');});
    return()=>{disposed=true;cleanup();};
  },[view]);

  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>NEW LAB ENGINE</small><h2>One real rig. One athlete.</h2><p>Self-hosted RCL athlete renderer. Basketball-specific motion comes after this rendering checkpoint.</p></div><span>DEV PREVIEW</span></div>
    <div className="rigged-native">
      <div ref={mountRef} className="rigged-native__stage" />
      {status==='loading'&&<div className="rigged-native__status">LOADING RIGGED ATHLETE…</div>}
      {status==='error'&&<div className="rigged-native__status rigged-native__status--error">ATHLETE LOAD FAILED</div>}
      <div className="rigged-native__views">{(['front','quarter','side','back'] as View[]).map(v=><button key={v} className={view===v?'on':''} onClick={()=>setView(v)}>{v==='quarter'?'3/4':v.toUpperCase()}</button>)}</div>
      <div className="rigged-native__badge"><b>PIPELINE VALIDATION</b> · Bundled Three.js · RCL-hosted GLB</div>
    </div>
  </section>;
}
