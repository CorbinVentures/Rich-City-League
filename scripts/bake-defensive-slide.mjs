#!/usr/bin/env node
import fs from 'node:fs';
const [,,inPath='public/lab3d/RCL_Ready_Stance_v4.glb',planPath='public/lab3d/motion/defensive-slide-v1-plan.json',outPath='public/lab3d/RCL_Defensive_Slide_v1.glb']=process.argv;
const src=fs.readFileSync(inPath);if(src.toString('ascii',0,4)!=='glTF')throw Error('input is not GLB');
const jl=src.readUInt32LE(12),je=20+jl,g=JSON.parse(src.toString('utf8',20,je).trim());let off=je;const bl=src.readUInt32LE(off),bt=src.readUInt32LE(off+4);if(bt!==0x004e4942)throw Error('missing BIN');let bin=Buffer.from(src.subarray(off+8,off+8+bl));
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));if(plan.clip!=='RCL_Defensive_Slide_v1'||!plan.validation?.startReady||!plan.validation?.endReady||!plan.validation?.noCrossing)throw Error('defensive slide contract has not passed');
const nodes=new Map((g.nodes||[]).map((n,i)=>[n.name,i])),pelvis=nodes.get('pelvis');if(pelvis==null)throw Error('missing pelvis');
const ready=(g.animations||[]).find(a=>a.name==='RCL_Ready_Stance_v4');if(!ready)throw Error('frozen ready stance clip missing');
g.bufferViews??=[];g.accessors??=[];const pad=()=>{const p=(4-bin.length%4)%4;if(p)bin=Buffer.concat([bin,Buffer.alloc(p)])};
const floats=(vals,type,count)=>{pad();const start=bin.length,b=Buffer.alloc(vals.length*4);vals.forEach((v,i)=>b.writeFloatLE(v,i*4));bin=Buffer.concat([bin,b]);const bv=g.bufferViews.push({buffer:0,byteOffset:start,byteLength:b.length})-1;return g.accessors.push({bufferView:bv,componentType:5126,count,type})-1};
const times=plan.frames.map(f=>f.time),time=floats(times,'SCALAR',times.length);const smooth01=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const base=g.nodes[pelvis].translation||[0,0,0],positions=[];
for(const f of plan.frames)positions.push(base[0]+f.lateralOffset,base[1]+f.pelvisHeightOffset,base[2]);
const output=floats(positions,'VEC3',plan.frames.length),samplers=[{input:time,output,interpolation:'LINEAR'}],channels=[{sampler:0,target:{node:pelvis,path:'translation'}}];
// Layer 2: authored defensive footwork. Translate feet relative to the moving pelvis:
// lead/right foot opens first, trail/left foot follows later, and both return to the
// canonical ready-stance offsets at the final frame. This intentionally leaves the
// proven Ready V4 joint rotations untouched while establishing non-crossing step timing.
for(const [name,side] of [['foot_r','lead'],['foot_l','trail']]){
 const node=nodes.get(name);if(node==null)throw Error('missing '+name);
 const bind=g.nodes[node].translation||[0,0,0],vals=[];
 for(const f of plan.frames){
   const p=f.time/plan.duration;
   const step=side==='lead'?(p<.5?smooth01(p/.5):1):(p<.35?0:smooth01((p-.35)/.65));
   const recover=p<.5?1:1-smooth01((p-.5)/.5);
   const localShift=(side==='lead'?.19:.15)*step*recover;
   vals.push(bind[0]+localShift,bind[1],bind[2]);
 }
 const out=floats(vals,'VEC3',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;
 channels.push({sampler:si,target:{node,path:'translation'}});
}

// Layer 3: leg articulation layered on top of the proven V4 rotations.
// We use small local quaternion deltas only, with the same sign on each thigh/calf
// pair that preserves the already-correct anatomical knee direction. Deltas are
// zero at frame 0/end, so Ready V4 is reproduced exactly at both boundaries.
const qmul=(a,b)=>{const q=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];const n=Math.hypot(...q)||1;return q.map(v=>v/n)};
const qx=a=>[Math.sin(a/2),0,0,Math.cos(a/2)];
const readyRot=name=>{const n=nodes.get(name);if(n==null)throw Error('missing '+name);const ch=ready.channels.find(ch=>ch.target.node===n&&ch.target.path==='rotation');if(!ch)throw Error('ready stance missing rotation '+name);const acc=g.accessors[ready.samplers[ch.sampler].output],bv=g.bufferViews[acc.bufferView],start=(bv.byteOffset||0)+(acc.byteOffset||0);return [0,1,2,3].map(i=>bin.readFloatLE(start+i*4))};
for(const [name,side,role] of [['thigh_r','lead','thigh'],['calf_r','lead','calf'],['thigh_l','trail','thigh'],['calf_l','trail','calf']]){
 const node=nodes.get(name),baseQ=readyRot(name),vals=[];
 for(const f of plan.frames){
   const p=f.time/plan.duration;
   const envelope=Math.sin(Math.PI*p);
   const timing=side==='lead'?smooth01(Math.min(1,p/.45)):(p<.28?0:smooth01((p-.28)/.55));
   // modest articulation: enough to make the step read without overriding V4 biomechanics
   const deg=(role==='thigh'?7:10)*envelope*timing;
   const signed=(role==='thigh'?-1:1)*deg*Math.PI/180;
   vals.push(...qmul(baseQ,qx(signed)));
 }
 const out=floats(vals,'VEC4',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;
 channels.push({sampler:si,target:{node,path:'rotation'}});
}

// Layer 4: upper-body counterbalance and active hands.
// Small ready-relative deltas keep the chest quiet while the arms respond opposite
// the travel phase. All deltas return to identity at both boundaries.
const qz=a=>[0,0,Math.sin(a/2),Math.cos(a/2)];
for(const [name,side,role] of [['upperarm_r','right','upper'],['lowerarm_r','right','lower'],['upperarm_l','left','upper'],['lowerarm_l','left','lower']]){
 const node=nodes.get(name),baseQ=readyRot(name),vals=[];
 for(const f of plan.frames){
   const p=f.time/plan.duration,envelope=Math.sin(Math.PI*p);
   const direction=side==='right'?-1:1;
   const deg=(role==='upper'?5:7)*envelope*direction;
   vals.push(...qmul(baseQ,qz(deg*Math.PI/180)));
 }
 const out=floats(vals,'VEC4',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;
 channels.push({sampler:si,target:{node,path:'rotation'}});
}
for(const [name,deg] of [['spine_01',2.5],['spine_02',1.5]]){
 const node=nodes.get(name),baseQ=readyRot(name),vals=[];
 for(const f of plan.frames){const p=f.time/plan.duration,envelope=Math.sin(Math.PI*p);vals.push(...qmul(baseQ,qz(deg*envelope*Math.PI/180)))}
 const out=floats(vals,'VEC4',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;channels.push({sampler:si,target:{node,path:'rotation'}});
}

g.animations.push({name:plan.clip,samplers,channels,extras:{canonicalStartEnd:plan.canonicalStartEnd,contract:planPath,validatedNoCrossing:true,phase:'upper-body-layer',upperBody:'active-hands-counterbalance',legMechanics:'ready-relative-quaternion-deltas',leadFoot:'foot_r',trailFoot:'foot_l',noCrossing:true}});
g.buffers[0].byteLength=bin.length;let j=Buffer.from(JSON.stringify(g)),jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);pad();const total=12+8+j.length+8+bin.length,o=Buffer.alloc(total);o.write('glTF',0);o.writeUInt32LE(2,4);o.writeUInt32LE(total,8);o.writeUInt32LE(j.length,12);o.writeUInt32LE(0x4e4f534a,16);j.copy(o,20);const bo=20+j.length;o.writeUInt32LE(bin.length,bo);o.writeUInt32LE(0x004e4942,bo+4);bin.copy(o,bo+8);fs.writeFileSync(outPath,o);console.log('Baked defensive slide foundation',outPath,'frames='+plan.frames.length);
