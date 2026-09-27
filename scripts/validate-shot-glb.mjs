#!/usr/bin/env node
import fs from 'node:fs';
const path=process.argv[2]||'public/lab3d/RCL_Set_Shot_v1.glb',b=fs.readFileSync(path);if(b.toString('ascii',0,4)!=='glTF')throw Error('not GLB');
const jl=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jl).trim()),nodes=g.nodes||[],a=(g.animations||[]).find(x=>x.name==='RCL_Set_Shot_v1');if(!a)throw Error('Set Shot V1 missing');
const names=new Map(nodes.map((n,i)=>[i,n.name])),tracks=a.channels.map(c=>({name:names.get(c.target.node),path:c.target.path,sampler:c.sampler}));
const req=['pelvis','foot_r','foot_l','upperarm_r','lowerarm_r','upperarm_l','lowerarm_l','spine_01','spine_02','hand_r','hand_l'];for(const n of req)if(!tracks.some(t=>t.name===n))throw Error('missing '+n);
const e=a.extras||{};if(e.canonicalStartEnd!=='RCL_Ready_Stance_v4'||e.shotType!=='two-foot-set-shot'||e.shootingHand!=='right'||e.feetPlanted!==true||e.rightHandRelease!==true||e.guideHandPassive!==true||e.noElbowFlare!==true)throw Error('shot metadata contract missing');
const bo=20+jl,bl=b.readUInt32LE(bo),bin=b.subarray(bo+8,bo+8+bl),read=i=>{const x=g.accessors[i],v=g.bufferViews[x.bufferView],n=x.type==='VEC4'?4:x.type==='VEC3'?3:1,s=(v.byteOffset||0)+(x.byteOffset||0);return Array.from({length:x.count},(_,r)=>Array.from({length:n},(_,j)=>bin.readFloatLE(s+(r*n+j)*4)))};
for(const t of tracks){const v=read(a.samplers[t.sampler].output);if(v.flat().some(x=>!Number.isFinite(x)))throw Error('non-finite '+t.name);const d=Math.max(...v[0].map((x,i)=>Math.abs(x-v.at(-1)[i])));if(d>1e-4)throw Error('boundary mismatch '+t.name+' '+d)}
for(const n of ['foot_r','foot_l']){const t=tracks.find(x=>x.name===n&&x.path==='translation'),v=read(a.samplers[t.sampler].output),z=v[0],travel=Math.max(...v.map(x=>Math.hypot(x[0]-z[0],x[1]-z[1],x[2]-z[2])));if(travel>1e-5)throw Error(n+' traveled '+travel)}
const pelvis=tracks.find(x=>x.name==='pelvis'&&x.path==='translation'),pv=read(a.samplers[pelvis.sampler].output),ys=pv.map(x=>x[1]),range=Math.max(...ys)-Math.min(...ys);if(range<.07||range>.14)throw Error('shot load/rise range '+range);
for(const n of ['hand_r','hand_l'])if(!tracks.some(x=>x.name===n&&x.path==='rotation'))throw Error('release rotation missing '+n);
console.log(JSON.stringify({clip:a.name,tracks:tracks.length,canonical:'RCL_Ready_Stance_v4',feetPlanted:true,rightHandRelease:true,guideHandPassive:true,noElbowFlare:true,loadRiseRange:+range.toFixed(5),finite:true},null,2));
