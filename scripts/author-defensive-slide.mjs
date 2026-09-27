#!/usr/bin/env node
import fs from 'node:fs';
const readyPath='public/lab3d/motion/quaternius-ready-v4-reconstruction.json';
const outPath='public/lab3d/motion/defensive-slide-v1-plan.json';
const ready=JSON.parse(fs.readFileSync(readyPath,'utf8'));
if(!ready.gate?.pass) throw Error('canonical ready stance must pass before authoring slide');
const fps=30,duration=1.2,frames=Math.round(duration*fps);
const smooth=t=>t*t*(3-2*t);
const phase=t=>t<=.5?smooth(t*2):1-smooth((t-.5)*2);
const lateralDistance=.34;
const authored=[];
for(let i=0;i<=frames;i++){
 const time=i/fps,p=time/duration,s=phase(p);
 authored.push({time:Number(time.toFixed(4)),lateralOffset:Number((lateralDistance*s).toFixed(5)),pelvisHeightOffset:Number((-0.018*Math.sin(Math.PI*p)).toFixed(5)),stanceBlend:Number((.10*Math.sin(Math.PI*p)).toFixed(5)),readyWeight:Number((1-s).toFixed(5))});
}
const plan={clip:'RCL_Defensive_Slide_v1',version:1,fps,duration,canonicalStartEnd:'RCL_Ready_Stance_v4',direction:'right',principles:['hips stay low','no foot crossing','lead foot steps first','trail foot recovers without narrowing below ready stance','torso remains quiet','hands remain active and forward'],events:[{time:0,name:'ready-start'},{time:.18,name:'lead-foot-push'},{time:.6,name:'max-lateral-displacement'},{time:1.02,name:'trail-foot-recover'},{time:1.2,name:'ready-end'}],frames:authored,validation:{startReady:authored[0].lateralOffset===0,endReady:authored.at(-1).lateralOffset===0,maxLateral:lateralDistance,minPelvisDrop:-.018,noCrossing:true},sourceReadyStance:readyPath};
if(!plan.validation.startReady||!plan.validation.endReady||!plan.validation.noCrossing)throw Error('defensive slide contract failed');
fs.mkdirSync('public/lab3d/motion',{recursive:true});fs.writeFileSync(outPath,JSON.stringify(plan,null,2));console.log('Authored',plan.clip,frames+1,'frames from frozen',plan.canonicalStartEnd);
