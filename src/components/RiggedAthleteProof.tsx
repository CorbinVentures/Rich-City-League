'use client';

import { useMemo } from 'react';
import './RiggedAthleteProof.css';

type Props = { title: string };

export function RiggedAthleteProof({ title }: Props) {
  const srcDoc = useMemo(() => {
    const safeTitle = title.replace(/[<>&"]/g, '');
    return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#071019;color:#fff;font-family:Inter,system-ui,sans-serif}
#stage{position:absolute;inset:0}canvas{display:block;width:100%;height:100%}
.hud{position:absolute;left:18px;top:16px;z-index:2;pointer-events:none}.hud small{display:block;color:#ff6a21;font-weight:900;letter-spacing:.16em;font-size:10px}.hud b{display:block;margin-top:5px;font-size:14px}.hud span{display:block;color:#8ea0b2;font-size:11px;margin-top:4px}
.views{position:absolute;right:14px;top:14px;display:flex;gap:6px;z-index:3}.views button{border:1px solid #2c3d4d;background:#0c1721;color:#aebdca;border-radius:999px;padding:8px 10px;font-size:10px;font-weight:900;cursor:pointer}.views button.on{background:#ff5b16;border-color:#ff5b16;color:#fff}
.badge{position:absolute;left:18px;bottom:16px;background:rgba(6,14,22,.82);border:1px solid #263847;border-radius:12px;padding:10px 12px;font-size:10px;color:#9fb0be}.badge b{color:#fff}
.loading{position:absolute;inset:0;display:grid;place-items:center;background:#071019;z-index:5;font-size:12px;letter-spacing:.12em;color:#9fb0be}.error{color:#ff8a62;padding:24px}
</style></head><body><div id="stage"></div><div class="loading" id="loading">LOADING RIGGED ATHLETE…</div>
<div class="hud"><small>RCL LAB · RIGGED ATHLETE PROOF</small><b>${safeTitle}</b><span>Quaternius humanoid · real skeletal clip</span></div>
<div class="views"><button data-v="front" class="on">FRONT</button><button data-v="quarter">3/4</button><button data-v="side">SIDE</button><button data-v="back">BACK</button></div>
<div class="badge"><b>PIPELINE VALIDATION</b> · Jog cycle only — not presented as basketball-specific mocap.</div>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js/examples/jsm/loaders/GLTFLoader.js';
const CHARACTER='/lab3d/athlete.glb';
const MOTION='/lab3d/jog-proof.glb';
const stage=document.getElementById('stage'), loading=document.getElementById('loading');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x071019); scene.fog=new THREE.Fog(0x071019,7,15);
const camera=new THREE.PerspectiveCamera(36,1,.05,50);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.outputColorSpace=THREE.SRGBColorSpace; stage.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb9dcff,0x15202a,2.2)); const key=new THREE.DirectionalLight(0xffffff,3.2); key.position.set(3,6,4); key.castShadow=true; scene.add(key);
const rim=new THREE.DirectionalLight(0xff5b16,2.4); rim.position.set(-4,3,-4); scene.add(rim);
const floor=new THREE.Mesh(new THREE.CircleGeometry(5.5,64),new THREE.MeshStandardMaterial({color:0x0c1822,roughness:.9,metalness:.05})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid=new THREE.GridHelper(10,20,0x315064,0x142a38); grid.position.y=.004; scene.add(grid);
const ring=new THREE.Mesh(new THREE.RingGeometry(2.3,2.32,96),new THREE.MeshBasicMaterial({color:0xff5b16,transparent:true,opacity:.55,side:THREE.DoubleSide})); ring.rotation.x=-Math.PI/2; ring.position.y=.01; scene.add(ring);
const loader=new GLTFLoader(); const clock=new THREE.Clock(); let mixer=null, athlete=null;
function load(url){return new Promise((res,rej)=>loader.load(url,res,undefined,rej))}
try{
 const [model,motion]=await Promise.all([load(CHARACTER),load(MOTION)]);
 athlete=model.scene; scene.add(athlete);
 athlete.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.metalness=.04;o.material.roughness=.7}}});
 const box=new THREE.Box3().setFromObject(athlete), size=new THREE.Vector3(), center=new THREE.Vector3(); box.getSize(size); box.getCenter(center);
 athlete.position.x-=center.x; athlete.position.z-=center.z; athlete.position.y-=box.min.y;
 const targetH=2.15, scale=targetH/Math.max(size.y,.001); athlete.scale.setScalar(scale);
 const clip=motion.animations.find(a=>a.name==='Jog_Fwd_Loop')||motion.animations.find(a=>/Jog/i.test(a.name))||motion.animations[0];
 if(clip){mixer=new THREE.AnimationMixer(athlete); mixer.clipAction(clip).reset().play();}
 loading.remove();
}catch(e){loading.className='loading error';loading.textContent='ATHLETE LOAD FAILED — preview asset pipeline needs attention';console.error(e)}
const views={front:[0,1.25,5.2],quarter:[3.7,1.5,4.1],side:[5.2,1.3,0],back:[0,1.3,-5.2]}; let current='front';
document.querySelectorAll('.views button').forEach(b=>b.onclick=()=>{current=b.dataset.v;document.querySelectorAll('.views button').forEach(x=>x.classList.toggle('on',x===b))});
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()} addEventListener('resize',resize);resize();
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05); if(mixer)mixer.update(dt); const p=views[current]; camera.position.lerp(new THREE.Vector3(...p),.09); camera.lookAt(0,1.08,0); renderer.render(scene,camera)});
</script></body></html>`;
  }, [title]);

  return <section className="rigged-proof">
    <div className="rigged-proof__top"><div><small>NEW LAB ENGINE</small><h2>One real rig. One athlete.</h2><p>This isolated proof validates the permanent character and skeletal-animation pipeline before basketball-specific mocap is added.</p></div><span>DEV PREVIEW</span></div>
    <iframe title="RCL rigged athlete proof" srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" />
  </section>;
}
