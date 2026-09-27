#!/usr/bin/env node
import fs from 'node:fs';
const path=process.argv[2]||'public/lab3d/RCL_Defensive_Slide_v1.glb';
const b=fs.readFileSync(path);if(b.toString('ascii',0,4)!=='glTF')throw Error('not GLB');
const jl=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jl).trim());
const nodes=g.nodes||[],anim=(g.animations||[]).find(a=>a.name==='RCL_Defensive_Slide_v1');
if(!anim)throw Error('RCL_Defensive_Slide_v1 missing');
const names=new Map(nodes.map((n,i)=>[i,n.name]));
const required=['pelvis','foot_r','foot_l','thigh_r','calf_r','thigh_l','calf_l','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','spine_01','spine_02'];
const tracks=anim.channels.map(ch=>({name:names.get(ch.target.node),path:ch.target.path,sampler:ch.sampler}));
for(const name of required)if(!tracks.some(t=>t.name===name))throw Error('missing motion track '+name);
if(anim.extras?.canonicalStartEnd!=='RCL_Ready_Stance_v4')throw Error('canonical boundary metadata missing');
if(anim.extras?.noCrossing!==true||anim.extras?.validatedNoCrossing!==true)throw Error('no-crossing contract missing');
const binOffset=20+jl,bl=b.readUInt32LE(binOffset),bin=b.subarray(binOffset+8,binOffset+8+bl);
const read=(accIndex)=>{const a=g.accessors[accIndex],v=g.bufferViews[a.bufferView],n=a.type==='VEC4'?4:a.type==='VEC3'?3:1,start=(v.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>bin.readFloatLE(start+(i*n+j)*4)))};
for(const t of tracks){
 const s=anim.samplers[t.sampler],vals=read(s.output);
 const first=vals[0],last=vals.at(-1);
 const err=Math.max(...first.map((v,i)=>Math.abs(v-last[i])));
 if(err>1e-4)throw Error(`boundary mismatch ${t.name}.${t.path}: ${err}`);
 if(vals.flat().some(v=>!Number.isFinite(v)))throw Error(`non-finite motion ${t.name}.${t.path}`);
}
const pelvisTrack=tracks.find(t=>t.name==='pelvis'&&t.path==='translation');if(!pelvisTrack)throw Error('pelvis translation missing');
const pv=read(anim.samplers[pelvisTrack.sampler].output),travel=Math.max(...pv.map(v=>v[0]))-Math.min(...pv.map(v=>v[0]));
if(travel<.25||travel>.45)throw Error('unexpected lateral travel '+travel);
console.log(JSON.stringify({clip:anim.name,tracks:tracks.length,lateralTravel:+travel.toFixed(4),boundary:'ready-v4',finite:true,noCrossing:true},null,2));
