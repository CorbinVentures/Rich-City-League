#!/usr/bin/env node
import fs from 'node:fs';
const [,,inPath='public/lab3d/athlete.glb',reconPath='public/lab3d/motion/quaternius-ready-reconstruction.json',outPath='public/lab3d/RCL_Ready_Stance_v2.glb']=process.argv;
const src=fs.readFileSync(inPath);if(src.toString('ascii',0,4)!=='glTF')throw Error('input is not GLB');
const jl=src.readUInt32LE(12),js=20,je=js+jl,g=JSON.parse(src.toString('utf8',js,je).trim());let off=je;const bl=src.readUInt32LE(off),bt=src.readUInt32LE(off+4);if(bt!==0x004e4942)throw Error('missing BIN');let bin=Buffer.from(src.subarray(off+8,off+8+bl));
const rec=JSON.parse(fs.readFileSync(reconPath,'utf8'));if(!rec.gate?.pass)throw Error('reconstruction gate has not passed');
const nodes=new Map((g.nodes||[]).map((n,i)=>[n.name,i]));g.bufferViews??=[];g.accessors??=[];g.animations??=[];
const pad=()=>{const p=(4-bin.length%4)%4;if(p)bin=Buffer.concat([bin,Buffer.alloc(p)])};
const floats=(vals,type)=>{pad();const start=bin.length,b=Buffer.alloc(vals.length*4);vals.forEach((v,i)=>b.writeFloatLE(v,i*4));bin=Buffer.concat([bin,b]);const bv=g.bufferViews.push({buffer:0,byteOffset:start,byteLength:b.length})-1;return g.accessors.push({bufferView:bv,componentType:5126,count:1,type})-1};
const time=floats([0],'SCALAR'),samplers=[],channels=[];
for(const [name,q] of Object.entries(rec.localRotations)){const node=nodes.get(name);if(node==null)throw Error('missing node '+name);const output=floats(q,'VEC4'),si=samplers.push({input:time,output,interpolation:'STEP'})-1;channels.push({sampler:si,target:{node,path:'rotation'}})}
const pelvis=nodes.get('pelvis');if(pelvis==null)throw Error('missing pelvis');const bind=g.nodes[pelvis].translation||[0,0,0],target=rec.worldPoints.pelvis,parent=rec.pelvisParentWorld||null;
if(!rec.pelvisLocalTranslation)throw Error('reconstruction report missing pelvisLocalTranslation');const pout=floats(rec.pelvisLocalTranslation,'VEC3'),psi=samplers.push({input:time,output:pout,interpolation:'STEP'})-1;channels.push({sampler:psi,target:{node:pelvis,path:'translation'}});
g.animations.push({name:'RCL_Ready_Stance_v2',samplers,channels,extras:{validatedReconstruction:true,source:reconPath}});g.buffers[0].byteLength=bin.length;
let j=Buffer.from(JSON.stringify(g)),jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);pad();const total=12+8+j.length+8+bin.length,o=Buffer.alloc(total);o.write('glTF',0);o.writeUInt32LE(2,4);o.writeUInt32LE(total,8);o.writeUInt32LE(j.length,12);o.writeUInt32LE(0x4e4f534a,16);j.copy(o,20);const bo=20+j.length;o.writeUInt32LE(bin.length,bo);o.writeUInt32LE(0x004e4942,bo+4);bin.copy(o,bo+8);fs.writeFileSync(outPath,o);console.log('Baked validated static stance',outPath,'channels='+channels.length);
