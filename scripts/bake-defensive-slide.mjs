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
const times=plan.frames.map(f=>f.time),time=floats(times,'SCALAR',times.length);
const base=g.nodes[pelvis].translation||[0,0,0],positions=[];
for(const f of plan.frames)positions.push(base[0]+f.lateralOffset,base[1]+f.pelvisHeightOffset,base[2]);
const output=floats(positions,'VEC3',plan.frames.length),samplers=[{input:time,output,interpolation:'LINEAR'}],channels=[{sampler:0,target:{node:pelvis,path:'translation'}}];
g.animations.push({name:plan.clip,samplers,channels,extras:{canonicalStartEnd:plan.canonicalStartEnd,contract:planPath,validatedNoCrossing:true,phase:'translation-foundation'}});
g.buffers[0].byteLength=bin.length;let j=Buffer.from(JSON.stringify(g)),jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);pad();const total=12+8+j.length+8+bin.length,o=Buffer.alloc(total);o.write('glTF',0);o.writeUInt32LE(2,4);o.writeUInt32LE(total,8);o.writeUInt32LE(j.length,12);o.writeUInt32LE(0x4e4f534a,16);j.copy(o,20);const bo=20+j.length;o.writeUInt32LE(bin.length,bo);o.writeUInt32LE(0x004e4942,bo+4);bin.copy(o,bo+8);fs.writeFileSync(outPath,o);console.log('Baked defensive slide foundation',outPath,'frames='+plan.frames.length);
