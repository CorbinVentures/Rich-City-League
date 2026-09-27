#!/usr/bin/env node
import fs from 'node:fs';
const path=process.argv[2]||'public/lab3d/RCL_Dribble_Stance_v1.glb',b=fs.readFileSync(path);
if(b.toString('ascii',0,4)!=='glTF')throw Error('not GLB');
const jl=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jl).trim()),nodes=g.nodes||[],anim=(g.animations||[]).find(a=>a.name==='RCL_Dribble_Stance_v1');
if(!anim)throw Error('RCL_Dribble_Stance_v1 missing');
const names=new Map(nodes.map((n,i)=>[i,n.name])),tracks=anim.channels.map(ch=>({name:names.get(ch.target.node),path:ch.target.path,sampler:ch.sampler}));
const required=['pelvis','foot_r','foot_l','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','spine_01','spine_02'];for(const n of required)if(!tracks.some(t=>t.name===n))throw Error('missing '+n);
if(anim.extras?.canonicalStartEnd!=='RCL_Ready_Stance_v4'||anim.extras?.dribbleHand!=='right'||anim.extras?.feetPlanted!==true||anim.extras?.noUprightBounce!==true)throw Error('dribble contract metadata missing');
const bo=20+jl,bl=b.readUInt32LE(bo),bin=b.subarray(bo+8,bo+8+bl);
const read=i=>{const a=g.accessors[i],v=g.bufferViews[a.bufferView],n=a.type==='VEC4'?4:a.type==='VEC3'?3:1,s=(v.byteOffset||0)+(a.byteOffset||0);return Array.from({length:a.count},(_,r)=>Array.from({length:n},(_,j)=>bin.readFloatLE(s+(r*n+j)*4)))};
for(const t of tracks){const v=read(anim.samplers[t.sampler].output);if(v.flat().some(x=>!Number.isFinite(x)))throw Error('non-finite '+t.name);const e=Math.max(...v[0].map((x,i)=>Math.abs(x-v.at(-1)[i])));if(e>1e-4)throw Error('boundary mismatch '+t.name+' '+e)}
for(const name of ['foot_r','foot_l']){const t=tracks.find(x=>x.name===name&&x.path==='translation');if(!t)throw Error('missing foot translation '+name);const v=read(anim.samplers[t.sampler].output),z=v[0],travel=Math.max(...v.map(x=>Math.hypot(x[0]-z[0],x[1]-z[1],x[2]-z[2])));if(travel>1e-5)throw Error(name+' traveled '+travel)}
const pt=tracks.find(x=>x.name==='pelvis'&&x.path==='translation'),pv=read(anim.samplers[pt.sampler].output),base=pv[0][1],drop=Math.min(...pv.map(x=>x[1]-base));if(drop<-.03||drop>-.005)throw Error('unexpected pelvis load '+drop);
console.log(JSON.stringify({clip:anim.name,tracks:tracks.length,feetPlanted:true,pelvisDrop:+drop.toFixed(5),boundary:'ready-v4',finite:true},null,2));
