#!/usr/bin/env node
import fs from 'node:fs';
const [,,inPath='public/lab3d/RCL_Ready_Stance_v4.glb',planPath='public/lab3d/motion/closeout-v1-plan.json',outPath='public/lab3d/RCL_Closeout_v1.glb']=process.argv;
const src=fs.readFileSync(inPath);if(src.toString('ascii',0,4)!=='glTF')throw Error('input is not GLB');
const jl=src.readUInt32LE(12),je=20+jl,g=JSON.parse(src.toString('utf8',20,je).trim());let off=je;const bl=src.readUInt32LE(off),bt=src.readUInt32LE(off+4);if(bt!==0x004e4942)throw Error('missing BIN');let bin=Buffer.from(src.subarray(off+8,off+8+bl));
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));if(plan.clip!=='RCL_Closeout_v1'||!plan.validation?.startReady||!plan.validation?.endReady||!plan.validation?.noFlyBy||!plan.validation?.controlledDeceleration)throw Error('closeout contract has not passed');
const nodes=new Map((g.nodes||[]).map((n,i)=>[n.name,i])),pelvis=nodes.get('pelvis');if(pelvis==null)throw Error('missing pelvis');
const ready=(g.animations||[]).find(a=>a.name==='RCL_Ready_Stance_v4');if(!ready)throw Error('frozen ready stance missing');
g.bufferViews??=[];g.accessors??=[];const pad=()=>{const p=(4-bin.length%4)%4;if(p)bin=Buffer.concat([bin,Buffer.alloc(p)])};
const floats=(vals,type,count)=>{pad();const start=bin.length,b=Buffer.alloc(vals.length*4);vals.forEach((v,i)=>b.writeFloatLE(v,i*4));bin=Buffer.concat([bin,b]);const bv=g.bufferViews.push({buffer:0,byteOffset:start,byteLength:b.length})-1;return g.accessors.push({bufferView:bv,componentType:5126,count,type})-1};
const times=plan.frames.map(f=>f.time),time=floats(times,'SCALAR',times.length),base=g.nodes[pelvis].translation||[0,0,0],vals=[];
for(const f of plan.frames)vals.push(base[0],base[1]+f.pelvisHeightOffset,base[2]+f.forwardOffset);
const output=floats(vals,'VEC3',plan.frames.length),samplers=[{input:time,output,interpolation:'LINEAR'}],channels=[{sampler:0,target:{node:pelvis,path:'translation'}}];
// Layer 2: alternating choppy closeout steps. Feet move in short forward pulses,
// then both settle exactly back to their Ready V4 local offsets. This keeps the
// foundation rig-safe while making the braking cadence explicit before joint rotation.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(const [name,phase] of [['foot_r',0],['foot_l',.5]]){
 const node=nodes.get(name);if(node==null)throw Error('missing '+name);
 const bind=g.nodes[node].translation||[0,0,0],foot=[];
 for(const f of plan.frames){
   const p=f.time/plan.duration;
   const approach=Math.min(1,p/.62);
   const cadence=Math.max(0,Math.sin((approach*3+phase)*Math.PI));
   const brake=p<.52?1:1-smooth((p-.52)/.48);
   const stride=.115*cadence*brake;
   const lift=.026*cadence*brake;
   foot.push(bind[0],bind[1]+lift,bind[2]+stride);
 }
 const out=floats(foot,'VEC3',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;
 channels.push({sampler:si,target:{node,path:'translation'}});
}

// Layer 3: ready-relative hip/knee articulation synchronized to the choppy steps.
// The same conservative sagittal delta pattern proven by Defensive Slide V1 is used
// here so knee direction is never re-solved or guessed. Deltas vanish at boundaries.
const qmul=(a,b)=>{const q=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];const n=Math.hypot(...q)||1;return q.map(v=>v/n)};
const qx=a=>[Math.sin(a/2),0,0,Math.cos(a/2)];
const readyRot=name=>{const n=nodes.get(name);if(n==null)throw Error('missing '+name);const ch=ready.channels.find(ch=>ch.target.node===n&&ch.target.path==='rotation');if(!ch)throw Error('ready stance missing rotation '+name);const acc=g.accessors[ready.samplers[ch.sampler].output],bv=g.bufferViews[acc.bufferView],start=(bv.byteOffset||0)+(acc.byteOffset||0);return [0,1,2,3].map(i=>bin.readFloatLE(start+i*4))};
for(const [name,phase,role] of [['thigh_r',0,'thigh'],['calf_r',0,'calf'],['thigh_l',.5,'thigh'],['calf_l',.5,'calf']]){
 const node=nodes.get(name),baseQ=readyRot(name),joint=[];
 for(const f of plan.frames){
   const p=f.time/plan.duration,approach=Math.min(1,p/.62);
   const pulse=Math.max(0,Math.sin((approach*3+phase)*Math.PI));
   const brake=p<.52?1:1-smooth((p-.52)/.48);
   const deg=(role==='thigh'?6:9)*pulse*brake;
   const signed=(role==='thigh'?-1:1)*deg*Math.PI/180;
   joint.push(...qmul(baseQ,qx(signed)));
 }
 const out=floats(joint,'VEC4',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;
 channels.push({sampler:si,target:{node,path:'rotation'}});
}

g.animations.push({name:plan.clip,samplers,channels,extras:{canonicalStartEnd:plan.canonicalStartEnd,contract:planPath,noFlyBy:true,controlledDeceleration:true,phase:'leg-mechanics-layer',legMechanics:'ready-relative-choppy-step-deltas',footwork:'alternating-choppy-brake'}});
g.buffers[0].byteLength=bin.length;let j=Buffer.from(JSON.stringify(g)),jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);pad();const total=12+8+j.length+8+bin.length,o=Buffer.alloc(total);o.write('glTF',0);o.writeUInt32LE(2,4);o.writeUInt32LE(total,8);o.writeUInt32LE(j.length,12);o.writeUInt32LE(0x4e4f534a,16);j.copy(o,20);const bo=20+j.length;o.writeUInt32LE(bin.length,bo);o.writeUInt32LE(0x004e4942,bo+4);bin.copy(o,bo+8);fs.writeFileSync(outPath,o);console.log('Baked closeout foundation',outPath,'frames='+plan.frames.length);
