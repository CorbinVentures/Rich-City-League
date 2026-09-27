#!/usr/bin/env node
import fs from 'node:fs';
import {MOTION_SPECS} from './basketball-motion-specs.mjs';

function parse(path){const b=fs.readFileSync(path);if(b.toString('ascii',0,4)!=='glTF')throw Error('not GLB '+path);const jl=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+jl).trim()),bo=20+jl,bl=b.readUInt32LE(bo),bin=b.subarray(bo+8,bo+8+bl);return{g,bin}}
function read(g,bin,index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],n=a.type==='VEC4'?4:a.type==='VEC3'?3:a.type==='VEC2'?2:1,start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||n*4;return Array.from({length:a.count},(_,i)=>Array.from({length:n},(_,j)=>bin.readFloatLE(start+i*stride+j*4)))}

export function validateMotion(id,pathOverride){
 const spec=MOTION_SPECS[id];if(!spec)throw Error('Unknown motion '+id);const path=pathOverride||spec.file,{g,bin}=parse(path),nodes=g.nodes||[],names=new Map(nodes.map((n,i)=>[i,n.name])),anim=(g.animations||[]).find(a=>a.name===spec.clip);if(!anim)throw Error('missing '+spec.clip);
 if(anim.extras?.engine!=='RCL_TASK_SPACE_IK_V1'||anim.extras?.phaseModel!=='basketball-training-v2')throw Error(id+' not baked by canonical basketball engine');if(anim.extras?.canonicalStartEnd!=='RCL_Ready_Stance_v4')throw Error(id+' lost Ready V4 anchor');if(anim.extras?.groundedFootIK!==true||anim.extras?.worldSpaceHandTargets!==true||anim.extras?.qualityGate!==true)throw Error(id+' missing task-space quality metadata');
 const required=['pelvis','spine_01','spine_02','spine_03','neck_01','head','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r'],tracks=anim.channels.map(ch=>({name:names.get(ch.target.node),path:ch.target.path,sampler:ch.sampler}));for(const n of required)if(!tracks.some(t=>t.name===n))throw Error(id+' missing full-body track '+n);if(tracks.length<18)throw Error(id+' insufficient full-body tracks '+tracks.length);
 for(const t of tracks){const vals=read(g,bin,anim.samplers[t.sampler].output);if(vals.flat().some(v=>!Number.isFinite(v)))throw Error(id+' non-finite '+t.name+'.'+t.path);const first=vals[0],last=vals.at(-1),err=Math.max(...first.map((v,i)=>Math.abs(v-last[i])));if(err>1e-4)throw Error(id+' canonical boundary mismatch '+t.name+'.'+t.path+' '+err)}
 const timeSampler=anim.samplers[0],times=read(g,bin,timeSampler.input).flat(),duration=times.at(-1);if(Math.abs(duration-spec.duration)>1/spec.fps+.001)throw Error(id+' duration drift '+duration+' vs '+spec.duration);
 const reportPath=`public/lab3d/motion/${id}-quality.json`;if(!fs.existsSync(reportPath))throw Error(id+' quality report missing');const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));if(report.engine!=='RCL_TASK_SPACE_IK_V1'||report.clip!==spec.clip||report.gate?.pass!==true)throw Error(id+' quality report failed');if(report.belowFloor!==0||report.crossedFeet!==0)throw Error(id+' grounding/crossing regression');
 const expected={
  'defensive-slide':['noCrossing','validatedNoCrossing'],
  'closeout':['noFlyBy','controlledDeceleration'],
  'triple-threat-jab':['pivotLocked'],
  'dribble-stance':['feetPlanted'],
  'chest-pass':['feetPlanted','symmetricRelease','noOverheadFlare'],
  'set-shot':['feetPlanted','rightHandRelease','guideHandPassive','noElbowFlare']
 }[id]||[];for(const k of expected)if(anim.extras?.[k]!==true)throw Error(id+' missing '+k+' contract');
 return{id,clip:spec.clip,tracks:tracks.length,duration,quality:report.gate,engine:anim.extras.engine};
}

if(import.meta.url===`file://${process.argv[1]}`){const id=process.argv[2];if(id)console.log(JSON.stringify(validateMotion(id,process.argv[3]),null,2));else console.log(JSON.stringify(Object.keys(MOTION_SPECS).map(k=>validateMotion(k)),null,2))}
