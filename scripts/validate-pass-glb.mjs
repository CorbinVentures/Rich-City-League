#!/usr/bin/env node
import fs from 'node:fs';
const path=process.argv[2]||'public/lab3d/RCL_Chest_Pass_v1.glb',b=fs.readFileSync(path);if(b.toString('ascii',0,4)!=='glTF')throw Error('not GLB');
const jl=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jl).trim()),nodes=g.nodes||[],a=(g.animations||[]).find(x=>x.name==='RCL_Chest_Pass_v1');if(!a)throw Error('Chest Pass V1 missing');
const names=new Map(nodes.map((n,i)=>[i,n.name])),tracks=a.channels.map(c=>({name:names.get(c.target.node),path:c.target.path,sampler:c.sampler}));
const req=['pelvis','foot_r','foot_l','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','spine_01','spine_02','hand_r','hand_l'];for(const n of req)if(!tracks.some(t=>t.name===n))throw Error('missing '+n);
if(a.extras?.canonicalStartEnd!=='RCL_Ready_Stance_v4'||a.extras?.passType!=='two-hand-chest'||a.extras?.feetPlanted!==true||a.extras?.symmetricRelease!==true||a.extras?.noOverheadFlare!==true)throw Error('pass metadata contract missing');
const bo=20+jl,bl=b.readUInt32LE(bo),bin=b.subarray(bo+8,bo+8+bl),read=i=>{const x=g.accessors[i],v=g.bufferViews[x.bufferView],n=x.type==='VEC4'?4:x.type==='VEC3'?3:1,s=(v.byteOffset||0)+(x.byteOffset||0);return Array.from({length:x.count},(_,r)=>Array.from({length:n},(_,j)=>bin.readFloatLE(s+(r*n+j)*4)))};
for(const t of tracks){const v=read(a.samplers[t.sampler].output);if(v.flat().some(x=>!Number.isFinite(x)))throw Error('non-finite '+t.name);const e=Math.max(...v[0].map((x,i)=>Math.abs(x-v.at(-1)[i])));if(e>1e-4)throw Error('boundary mismatch '+t.name+' '+e)}
for(const n of ['foot_r','foot_l']){const t=tracks.find(x=>x.name===n&&x.path==='translation'),v=read(a.samplers[t.sampler].output),z=v[0],travel=Math.max(...v.map(x=>Math.hypot(x[0]-z[0],x[1]-z[1],x[2]-z[2])));if(travel>1e-5)throw Error(n+' traveled '+travel)}
const handTracks=['hand_r','hand_l'].map(n=>tracks.find(x=>x.name===n&&x.path==='rotation'));if(handTracks.some(x=>!x))throw Error('wrist release rotations missing');
console.log(JSON.stringify({clip:a.name,tracks:tracks.length,feetPlanted:true,symmetricRelease:true,boundary:'ready-v4',finite:true},null,2));
