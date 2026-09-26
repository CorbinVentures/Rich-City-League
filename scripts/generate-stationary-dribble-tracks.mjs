#!/usr/bin/env node
import fs from 'node:fs';
const plan=JSON.parse(fs.readFileSync('public/lab3d/motion/stationary-dribble-plan.json','utf8'));
const times=plan.taskSpaceFrames.map(f=>f.time),I=[0,0,0,1];
const q=(axis,a)=>{const s=Math.sin(a/2),c=Math.cos(a/2);return[axis[0]*s,axis[1]*s,axis[2]*s,c]};
const mul=(a,b)=>{const o=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];const n=Math.hypot(...o)||1;return o.map(v=>v/n)};
const cont=a=>{for(let i=4;i<a.length;i+=4){let d=0;for(let j=0;j<4;j++)d+=a[i-4+j]*a[i+j];if(d<0)for(let j=0;j<4;j++)a[i+j]*=-1;}return a};
const names=['pelvis','spine_01','spine_02','spine_03','neck_01','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r'];
const R=Object.fromEntries(names.map(n=>[n,[]]));
for(const f of plan.taskSpaceFrames){const ph=(f.time%1.36)/1.36,r=Math.sin(ph*Math.PI*4),left=f.activeSide==='left',push=Math.max(0,1-(f.ballTarget.y-.125)/.895);
 const v={pelvis:q([0,1,0],r*.025),spine_01:q([1,0,0],-.07+r*.012),spine_02:q([1,0,0],-.055),spine_03:q([1,0,0],-.04),neck_01:q([1,0,0],.08),
 thigh_l:mul(q([1,0,0],-.43),q([0,0,1],-.06)),thigh_r:mul(q([1,0,0],-.43),q([0,0,1],.06)),calf_l:q([1,0,0],.72),calf_r:q([1,0,0],.72),foot_l:q([1,0,0],-.29),foot_r:q([1,0,0],-.29),
 upperarm_l:mul(q([0,0,1],left?.52+.28*push:.38),q([1,0,0],left?.20:.08)),lowerarm_l:q([0,0,1],left?-.78-.34*push:-.62),hand_l:q([1,0,0],left?.18+.25*push:.08),
 upperarm_r:mul(q([0,0,1],left?-.38:-.52-.28*push),q([1,0,0],left?.08:.20)),lowerarm_r:q([0,0,1],left?.62:.78+.34*push),hand_r:q([1,0,0],left?.08:.18+.25*push)};
 for(const n of names)R[n].push(...(v[n]||I));
}
const tracks=names.map(node=>({node,path:'rotation',values:cont(R[node])}));
fs.writeFileSync('public/lab3d/motion/stationary-dribble-tracks.json',JSON.stringify({clip:plan.clip,times,events:plan.events,tracks,extras:{runtimeBonePosing:false}},null,2));
console.log('generated',times.length,'frames',tracks.length,'skeletal tracks');
