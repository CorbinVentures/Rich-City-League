#!/usr/bin/env node
import fs from 'node:fs';
const path=process.argv[2]||'public/lab3d/motion/quaternius-rig-analysis.json',out=process.argv[3]||'public/lab3d/motion/quaternius-anatomical-validation.json';
const r=JSON.parse(fs.readFileSync(path,'utf8')),J=Object.fromEntries(r.joints.filter(j=>!j.missing).map(j=>[j.name,j]));
const V=a=>({x:a[0],y:a[1],z:a[2]}),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,len=a=>Math.hypot(a.x,a.y,a.z),norm=a=>{const l=len(a)||1;return{x:a.x/l,y:a.y/l,z:a.z/l}},cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const p=n=>V(J[n].worldPosition),axis=n=>V(J[n].primaryWorldAxis);
const lateral=norm(sub(p('thigh_r'),p('thigh_l'))),up=norm(sub(p('spine_03'),p('pelvis'))),forward=norm(cross(lateral,up));
const chains={leftLeg:['thigh_l','calf_l','foot_l'],rightLeg:['thigh_r','calf_r','foot_r'],leftArm:['upperarm_l','lowerarm_l','hand_l'],rightArm:['upperarm_r','lowerarm_r','hand_r']};
const failures=[],checks={};
for(const [name,ns] of Object.entries(chains)){checks[name]={segments:ns.slice(0,2).map(n=>({name:n,length:J[n].segmentLength,axisLength:len(axis(n))}))};for(const n of ns.slice(0,2)){if(!(J[n].segmentLength>0))failures.push(n+'-zero-length');if(Math.abs(len(axis(n))-1)>1e-6)failures.push(n+'-axis-not-unit')}}
const hipSeparation=dot(sub(p('thigh_r'),p('thigh_l')),lateral),shoulderSeparation=dot(sub(p('upperarm_r'),p('upperarm_l')),lateral);
if(hipSeparation<=0)failures.push('left-right-hip-order');if(shoulderSeparation<=0)failures.push('left-right-shoulder-order');if(Math.abs(dot(lateral,up))>.08)failures.push('pelvis-frame-not-orthogonal');
const report={source:path,coordinateFrame:{lateral,up,forward,orthogonality:{lateralUp:dot(lateral,up),lateralForward:dot(lateral,forward),upForward:dot(up,forward)}},symmetry:{hipSeparation,shoulderSeparation},checks,gate:{pass:!failures.length,failures}};
fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
