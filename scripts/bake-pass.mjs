#!/usr/bin/env node
import fs from 'node:fs';
const [,,inPath='public/lab3d/RCL_Ready_Stance_v4.glb',planPath='public/lab3d/motion/pass-v1-plan.json',outPath='public/lab3d/RCL_Chest_Pass_v1.glb']=process.argv;
const src=fs.readFileSync(inPath);if(src.toString('ascii',0,4)!=='glTF')throw Error('input is not GLB');
const jl=src.readUInt32LE(12),je=20+jl,g=JSON.parse(src.toString('utf8',20,je).trim()),bl=src.readUInt32LE(je);let bin=Buffer.from(src.subarray(je+8,je+8+bl));
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));if(plan.clip!=='RCL_Chest_Pass_v1'||!plan.validation?.feetPlanted||!plan.validation?.symmetricRelease||!plan.validation?.noOverheadFlare)throw Error('pass contract has not passed');
const nodes=new Map((g.nodes||[]).map((n,i)=>[n.name,i])),ready=(g.animations||[]).find(a=>a.name==='RCL_Ready_Stance_v4');if(!ready)throw Error('Ready V4 missing');
for(const n of ['pelvis','foot_r','foot_l','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','spine_01','spine_02'])if(nodes.get(n)==null)throw Error('missing '+n);
g.bufferViews??=[];g.accessors??=[];const pad=()=>{const p=(4-bin.length%4)%4;if(p)bin=Buffer.concat([bin,Buffer.alloc(p)])};
const floats=(vals,type,count)=>{pad();const s=bin.length,b=Buffer.alloc(vals.length*4);vals.forEach((v,i)=>b.writeFloatLE(v,i*4));bin=Buffer.concat([bin,b]);const bv=g.bufferViews.push({buffer:0,byteOffset:s,byteLength:b.length})-1;return g.accessors.push({bufferView:bv,componentType:5126,count,type})-1};
const time=floats(plan.frames.map(f=>f.time),'SCALAR',plan.frames.length),samplers=[],channels=[],add=(node,path,vals,type)=>{const out=floats(vals,type,plan.frames.length),si=samplers.push({input:time,output:out,interpolation:'LINEAR'})-1;channels.push({sampler:si,target:{node,path}})};
const pb=g.nodes[nodes.get('pelvis')].translation||[0,0,0],pv=[];for(const f of plan.frames)pv.push(pb[0],pb[1]+f.pelvisHeightOffset,pb[2]);add(nodes.get('pelvis'),'translation',pv,'VEC3');
for(const n of ['foot_r','foot_l']){const node=nodes.get(n),base=g.nodes[node].translation||[0,0,0],v=[];for(const _ of plan.frames)v.push(...base);add(node,'translation',v,'VEC3')}
const qmul=(a,b)=>{const q=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];const n=Math.hypot(...q)||1;return q.map(v=>v/n)},qx=a=>[Math.sin(a/2),0,0,Math.cos(a/2)],qz=a=>[0,0,Math.sin(a/2),Math.cos(a/2)];
const readyRot=name=>{const node=nodes.get(name),ch=ready.channels.find(ch=>ch.target.node===node&&ch.target.path==='rotation');if(!ch)throw Error('ready rotation missing '+name);const a=g.accessors[ready.samplers[ch.sampler].output],v=g.bufferViews[a.bufferView],s=(v.byteOffset||0)+(a.byteOffset||0);return [0,1,2,3].map(i=>bin.readFloatLE(s+i*4))};
const addRot=(name,axis,degFn)=>{const base=readyRot(name),v=[];for(const f of plan.frames)v.push(...qmul(base,axis(degFn(f)*Math.PI/180)));add(nodes.get(name),'rotation',v,'VEC4')};
addRot('upperarm_r',qz,f=>-18*f.armExtend);addRot('upperarm_l',qz,f=>18*f.armExtend);
addRot('lowerarm_r',qx,f=>-24*f.armExtend);addRot('lowerarm_l',qx,f=>-24*f.armExtend);
addRot('spine_01',qx,f=>-f.torsoLean*.45);addRot('spine_02',qx,f=>-f.torsoLean*.55);
// Layer 2: wrist finish. The release is driven by the authored release envelope,
// so both hands finish together and return exactly to Ready V4.
for(const [name,side] of [['hand_r',-1],['hand_l',1]]){
 if(nodes.get(name)==null)throw Error('missing '+name);
 addRot(name,qz,f=>side*f.wristSnap);
}

g.animations.push({name:plan.clip,samplers,channels,extras:{canonicalStartEnd:plan.canonicalStartEnd,contract:planPath,passType:plan.passType,feetPlanted:true,symmetricRelease:true,noOverheadFlare:true,phase:'release-layer',release:'symmetric-wrist-finish'}});
g.buffers[0].byteLength=bin.length;let j=Buffer.from(JSON.stringify(g)),jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);pad();const total=12+8+j.length+8+bin.length,o=Buffer.alloc(total);o.write('glTF',0);o.writeUInt32LE(2,4);o.writeUInt32LE(total,8);o.writeUInt32LE(j.length,12);o.writeUInt32LE(0x4e4f534a,16);j.copy(o,20);const bo=20+j.length;o.writeUInt32LE(bin.length,bo);o.writeUInt32LE(0x004e4942,bo+4);bin.copy(o,bo+8);fs.writeFileSync(outPath,o);console.log('Baked chest pass foundation',outPath,'tracks='+channels.length);
