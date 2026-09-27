#!/usr/bin/env node
import fs from 'node:fs';
const path=process.argv[2]||'public/lab3d/RCL_Triple_Threat_Jab_v1.glb';
const b=fs.readFileSync(path);if(b.toString('ascii',0,4)!=='glTF')throw Error('not GLB');
const jl=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jl).trim());
const nodes=g.nodes||[],anim=(g.animations||[]).find(a=>a.name==='RCL_Triple_Threat_Jab_v1');if(!anim)throw Error('RCL_Triple_Threat_Jab_v1 missing');
const names=new Map(nodes.map((n,i)=>[i,n.name]));
const required=['pelvis','foot_r','foot_l','thigh_r','calf_r','thigh_l','calf_l','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','spine_01','spine_02'];
const tracks=anim.channels.map(ch=>({name:names.get(ch.target.node),path:ch.target.path,sampler:ch.sampler}));
for(const name of required)if(!tracks.some(t=>t.name===name))throw Error('missing jab track '+name);
if(anim.extras?.canonicalStartEnd!=='RCL_Ready_Stance_v4'||anim.extras?.pivotFoot!=='foot_l'||anim.extras?.jabFoot!=='foot_r')throw Error('jab boundary/side metadata missing');
if(anim.extras?.pivotLocked!==true||anim.extras?.noCrossing!==true)throw Error('jab pivot/no-crossing contract missing');
const binOffset=20+jl,bl=b.readUInt32LE(binOffset),bin=b.subarray(binOffset+8,binOffset+8+bl);
const read=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],n=a.type==='VEC4'?4:a.type==='VEC3'?3:1,start=(v.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count},(_,r)=>Array.from({length:n},(_,j)=>bin.readFloatLE(start+(r*n+j)*4)))};
for(const t of tracks){const vals=read(anim.samplers[t.sampler].output),first=vals[0],last=vals.at(-1),err=Math.max(...first.map((v,i)=>Math.abs(v-last[i])));if(err>1e-4)throw Error(`boundary mismatch ${t.name}.${t.path}: ${err}`);if(vals.flat().some(v=>!Number.isFinite(v)))throw Error(`non-finite motion ${t.name}.${t.path}`)}
const pivot=tracks.find(t=>t.name==='foot_l'&&t.path==='translation'),jab=tracks.find(t=>t.name==='foot_r'&&t.path==='translation');if(!pivot||!jab)throw Error('foot translation tracks missing');
const p=read(anim.samplers[pivot.sampler].output),p0=p[0],pivotTravel=Math.max(...p.map(v=>Math.hypot(v[0]-p0[0],v[1]-p0[1],v[2]-p0[2])));
if(pivotTravel>1e-5)throw Error('pivot foot traveled '+pivotTravel);
const j=read(anim.samplers[jab.sampler].output),j0=j[0],jabTravel=Math.max(...j.map(v=>Math.hypot(v[0]-j0[0],v[2]-j0[2])));
if(jabTravel<.20||jabTravel>.32)throw Error('unexpected jab travel '+jabTravel);
console.log(JSON.stringify({clip:anim.name,tracks:tracks.length,pivotTravel:+pivotTravel.toFixed(6),jabTravel:+jabTravel.toFixed(4),boundary:'ready-v4',finite:true,noCrossing:true},null,2));
