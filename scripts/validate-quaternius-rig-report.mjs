#!/usr/bin/env node
import fs from 'node:fs';
const p=process.argv[2]||'public/lab3d/motion/quaternius-rig-analysis.json',r=JSON.parse(fs.readFileSync(p,'utf8'));
const required=['pelvis','spine_01','spine_02','spine_03','neck_01','clavicle_l','upperarm_l','lowerarm_l','hand_l','clavicle_r','upperarm_r','lowerarm_r','hand_r','thigh_l','calf_l','foot_l','thigh_r','calf_r','foot_r'];
const fail=[];if(r.skinJointCount<50)fail.push('skin-joint-count');for(const n of required){const j=r.joints.find(x=>x.name===n);if(!j||j.missing)fail.push('missing:'+n);else{if(!Array.isArray(j.worldPosition)||j.worldPosition.length!==3)fail.push('world-position:'+n);if(!Array.isArray(j.worldRotation)||j.worldRotation.length!==4)fail.push('world-rotation:'+n);if(['upperarm_l','lowerarm_l','upperarm_r','lowerarm_r','thigh_l','calf_l','thigh_r','calf_r'].includes(n)&&!(j.segmentLength>0))fail.push('segment-length:'+n)}}
if(fail.length){console.error('RIG REPORT REJECTED',fail);process.exit(1)}console.log('RIG REPORT PASSED',{skinJointCount:r.skinJointCount,required:required.length});
