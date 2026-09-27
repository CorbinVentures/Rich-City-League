#!/usr/bin/env node
import fs from 'node:fs';
const [,,inPath='public/lab3d/RCL_Ready_Stance_v4.glb',planPath='public/lab3d/motion/triple-threat-jab-v1-plan.json',outPath='public/lab3d/RCL_Triple_Threat_Jab_v1.glb']=process.argv;
const src=fs.readFileSync(inPath);if(src.toString('ascii',0,4)!=='glTF')throw Error('input is not GLB');
const jl=src.readUInt32LE(12),je=20+jl,g=JSON.parse(src.toString('utf8',20,je).trim());const bl=src.readUInt32LE(je),bt=src.readUInt32LE(je+4);if(bt!==0x004e4942)throw Error('missing BIN');let bin=Buffer.from(src.subarray(je+8,je+8+bl));
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));if(plan.clip!=='RCL_Triple_Threat_Jab_v1'||!plan.validation?.startReady||!plan.validation?.endReady||!plan.validation?.pivotLocked||!plan.validation?.noCrossing)throw Error('jab contract has not passed');
const nodes=new Map((g.nodes||[]).map((n,i)=>[n.name,i])),pelvis=nodes.get('pelvis'),pivot=nodes.get(plan.pivotFoot),jab=nodes.get(plan.jabFoot);if([pelvis,pivot,jab].some(x=>x==null))throw Error('missing pelvis/pivot/jab node');
if(plan.pivotFoot!=='foot_l'||plan.jabFoot!=='foot_r')throw Error('unexpected jab side contract');
const ready=(g.animations||[]).find(a=>a.name==='RCL_Ready_Stance_v4');if(!ready)throw Error('frozen ready stance missing');
g.bufferViews??=[];g.accessors??=[];const pad=()=>{const p=(4-bin.length%4)%4;if(p)bin=Buffer.concat([bin,Buffer.alloc(p)])};
const floats=(vals,type,count)=>{pad();const start=bin.length,b=Buffer.alloc(vals.length*4);vals.forEach((v,i)=>b.writeFloatLE(v,i*4));bin=Buffer.concat([bin,b]);const bv=g.bufferViews.push({buffer:0,byteOffset:start,byteLength:b.length})-1;return g.accessors.push({bufferView:bv,componentType:5126,count,type})-1};
const times=plan.frames.map(f=>f.time),time=floats(times,'SCALAR',times.length),samplers=[],channels=[];
const addTranslation=(node,vals)=>{const out=floats(vals,'VEC3',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;channels.push({sampler:si,target:{node,path:'translation'}})};
const pb=g.nodes[pelvis].translation||[0,0,0],pv=[];for(const f of plan.frames)pv.push(pb[0]+f.pelvisLateral,pb[1]+f.pelvisHeightOffset,pb[2]+f.pelvisForward);addTranslation(pelvis,pv);
const jb=g.nodes[jab].translation||[0,0,0],jv=[];for(const f of plan.frames)jv.push(jb[0]+f.jabLateral,jb[1],jb[2]+f.jabForward);addTranslation(jab,jv);
// Explicit pivot track is intentionally constant: validation can prove it never travels.
const xb=g.nodes[pivot].translation||[0,0,0],xv=[];for(const f of plan.frames)xv.push(...xb);addTranslation(pivot,xv);
// Layer 2: ready-relative leg articulation. The pivot leg stays loaded while the
// right leg opens into the jab. We preserve the proven V4 anatomical knee direction
// by applying only small sagittal quaternion deltas that vanish at both boundaries.
const qmul=(a,b)=>{const q=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];const n=Math.hypot(...q)||1;return q.map(v=>v/n)};
const qx=a=>[Math.sin(a/2),0,0,Math.cos(a/2)];
const readyRot=name=>{const n=nodes.get(name);if(n==null)throw Error('missing '+name);const ch=ready.channels.find(ch=>ch.target.node===n&&ch.target.path==='rotation');if(!ch)throw Error('ready stance missing rotation '+name);const acc=g.accessors[ready.samplers[ch.sampler].output],bv=g.bufferViews[acc.bufferView],start=(bv.byteOffset||0)+(acc.byteOffset||0);return [0,1,2,3].map(i=>bin.readFloatLE(start+i*4))};
const addRotation=(name,vals)=>{const node=nodes.get(name),out=floats(vals,'VEC4',plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;channels.push({sampler:si,target:{node,path:'rotation'}})};
for(const [name,role,side] of [['thigh_r','thigh','jab'],['calf_r','calf','jab'],['thigh_l','thigh','pivot'],['calf_l','calf','pivot']]){
 const baseQ=readyRot(name),vals=[];
 for(const f of plan.frames){
   const a=f.attack;
   const deg=side==='jab'?(role==='thigh'?8:11)*a:(role==='thigh'?3:5)*a;
   const signed=(role==='thigh'?-1:1)*deg*Math.PI/180;
   vals.push(...qmul(baseQ,qx(signed)));
 }
 addRotation(name,vals);
}

g.animations.push({name:plan.clip,samplers,channels,extras:{canonicalStartEnd:plan.canonicalStartEnd,contract:planPath,pivotFoot:plan.pivotFoot,jabFoot:plan.jabFoot,pivotLocked:true,noCrossing:true,phase:'leg-mechanics-layer',legMechanics:'ready-relative-jab-pivot-load'}});
g.buffers[0].byteLength=bin.length;let j=Buffer.from(JSON.stringify(g)),jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);pad();const total=12+8+j.length+8+bin.length,o=Buffer.alloc(total);o.write('glTF',0);o.writeUInt32LE(2,4);o.writeUInt32LE(total,8);o.writeUInt32LE(j.length,12);o.writeUInt32LE(0x4e4f534a,16);j.copy(o,20);const bo=20+j.length;o.writeUInt32LE(bin.length,bo);o.writeUInt32LE(0x004e4942,bo+4);bin.copy(o,bo+8);fs.writeFileSync(outPath,o);console.log('Baked triple-threat jab foundation',outPath,'frames='+plan.frames.length);
