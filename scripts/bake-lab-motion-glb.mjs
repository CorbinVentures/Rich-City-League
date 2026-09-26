#!/usr/bin/env node
/**
 * GLB animation baker for RCL Lab.
 * Reads a self-contained athlete GLB plus a solver-produced tracks JSON and appends
 * animation accessors/samplers/channels without altering skin, meshes or bind data.
 */
import fs from 'node:fs';
const [,,inPath,tracksPath,outPath]=process.argv;
if(!inPath||!tracksPath||!outPath){console.error('usage: node scripts/bake-lab-motion-glb.mjs athlete.glb tracks.json out.glb');process.exit(2);}
const src=fs.readFileSync(inPath);
if(src.toString('ascii',0,4)!=='glTF')throw Error('input is not GLB');
const jsonLen=src.readUInt32LE(12),jsonStart=20,jsonEnd=jsonStart+jsonLen;
const gltf=JSON.parse(src.toString('utf8',jsonStart,jsonEnd).trim());
let off=jsonEnd;const binLen=src.readUInt32LE(off),binType=src.readUInt32LE(off+4);if(binType!==0x004e4942)throw Error('missing BIN chunk');
let bin=Buffer.from(src.subarray(off+8,off+8+binLen));
const spec=JSON.parse(fs.readFileSync(tracksPath,'utf8'));
const nodes=new Map((gltf.nodes||[]).map((n,i)=>[n.name,i]));
gltf.bufferViews??=[];gltf.accessors??=[];gltf.animations??=[];
const align=()=>{const p=(4-bin.length%4)%4;if(p)bin=Buffer.concat([bin,Buffer.alloc(p)]);};
const appendFloats=(values,type,count,min,max)=>{
 align();const start=bin.length,b=Buffer.alloc(values.length*4);values.forEach((v,i)=>b.writeFloatLE(v,i*4));bin=Buffer.concat([bin,b]);
 const bv=gltf.bufferViews.push({buffer:0,byteOffset:start,byteLength:b.length})-1;
 const ac={bufferView:bv,componentType:5126,count,type};if(min)ac.min=min;if(max)ac.max=max;
 return gltf.accessors.push(ac)-1;
};
const times=spec.times;const input=appendFloats(times,'SCALAR',times.length,[Math.min(...times)],[Math.max(...times)]);
const samplers=[],channels=[];
for(const tr of spec.tracks){
 const node=nodes.get(tr.node);if(node==null)throw Error('rig node missing: '+tr.node);
 const width=tr.path==='rotation'?4:3;if(tr.values.length!==times.length*width)throw Error('bad track width: '+tr.node);
 const output=appendFloats(tr.values,tr.path==='rotation'?'VEC4':'VEC3',times.length);
 const si=samplers.push({input,output,interpolation:'LINEAR'})-1;channels.push({sampler:si,target:{node,path:tr.path}});
}
gltf.animations.push({name:spec.clip,samplers,channels,extras:{rclEvents:spec.events||[]}});
gltf.buffers[0].byteLength=bin.length;
let j=Buffer.from(JSON.stringify(gltf));const jp=(4-j.length%4)%4;if(jp)j=Buffer.concat([j,Buffer.alloc(jp,0x20)]);
align();const total=12+8+j.length+8+bin.length,out=Buffer.alloc(total);out.write('glTF',0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);
out.writeUInt32LE(j.length,12);out.writeUInt32LE(0x4e4f534a,16);j.copy(out,20);
const bo=20+j.length;out.writeUInt32LE(bin.length,bo);out.writeUInt32LE(0x004e4942,bo+4);bin.copy(out,bo+8);
fs.writeFileSync(outPath,out);console.log('Baked',spec.clip,'channels='+channels.length,'bytes='+out.length);
