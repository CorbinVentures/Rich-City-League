#!/usr/bin/env node
/**
 * Generate the complete 83-frame stationary-dribble track specification.
 * This stage converts task-space solve output into continuous named-node quaternion
 * tracks ready for the GLB baker. It does not run in the browser.
 */
import fs from 'node:fs';
const plan=JSON.parse(fs.readFileSync('public/lab3d/motion/stationary-dribble-plan.json','utf8'));
const times=plan.taskSpaceFrames.map(f=>f.time);
const QI=[0,0,0,1];
const qAxis=(axis,a)=>{const s=Math.sin(a/2),c=Math.cos(a/2);return[axis[0]*s,axis[1]*s,axis[2]*s,c]};
const mul=(a,b)=>{const q=[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];const n=Math.hypot(...q)||1;return q.map(v=>v/n)};
const continuity=arr=>{for(let i=4;i<arr.length;i+=4){let d=0;for(let j=0;j<4;j++)d+=arr[i-4+j]*arr[i+j];if(d<0)for(let j=0;j<4;j++)arr[i+j]*=-1;}return arr};
const rotations={pelvis:[],spine_01:[],spine_02:[],spine_03:[],neck_01:[],upperarm_l:[],lowerarm_l:[],hand_l:[],upperarm_r:[],lowerarm_r:[],hand_r:[],thigh_l:[],calf_l:[],foot_l:[],thigh_r:[],calf_r:[],foot_r:[]};
const ball=[];
for(const f of plan.taskSpaceFrames){
 const phase=(f.time%1.36)/1.36, rhythm=Math.sin(phase*Math.PI*4),left=f.activeSide==='left';
 const push=Math.max(0,1-(f.ballTarget.y-.125)/.895);
 const vals={
  pelvis:qAxis([0,1,0],rhythm*.025),
  spine_01:qAxis([1,0,0],-.07+rhythm*.012),spine_02:qAxis([1,0,0],-.055),spine_03:qAxis([1,0,0],-.04),
  neck_01:qAxis([1,0,0],.08),
  thigh_l:mul(qAxis([1,0,0],-.43),qAxis([0,0,1],-.06)),thigh_r:mul(qAxis([1,0,0],-.43),qAxis([0,0,1],.06)),
  calf_l:qAxis([1,0,0],.72),calf_r:qAxis([1,0,0],.72),foot_l:qAxis([1,0,0],-.29),foot_r:qAxis([1,0,0],-.29),
  upperarm_l:mul(qAxis([0,0,1],left?(.52+.28*push):.38),qAxis([1,0,0],left?.20:.08)),
  lowerarm_l:qAxis([0,0,1],left?(-.78-.34*push):-.62),hand_l:qAxis([1,0,0],left?(.18+.25*push):.08),
  upperarm_r:mul(qAxis([0,0,1],(left?-.38:(-.52-.28*push))),qAxis([1,0,0],left?.08:.20)),
  lowerarm_r:qAxis([0,0,1],left?.62:(.78+.34*push)),hand_r:qAxis([1,0,0],left?.08:(.18+.25*push))
 };
 for(const k of Object.keys(rotations))rotations[k].push(...(vals[k]||QI));
 ball.push(f.ballTarget.x,f.ballTarget.y,f.ballTarget.z);
}
const tracks=[];
for(const [node,values] of Object.entries(rotations))tracks.push({node,path:'rotation',values:continuity(values)});
tracks.push({node:'RCL_Ball',path:'translation',values:ball});
const out={clip:plan.clip,times,events:plan.events,tracks,extras:{source:'RCL task-space solver v1',runtimeBonePosing:false}};
fs.writeFileSync('public/lab3d/motion/stationary-dribble-tracks.json',JSON.stringify(out));
console.log('Generated',out.clip,'frames='+times.length,'tracks='+tracks.length);
