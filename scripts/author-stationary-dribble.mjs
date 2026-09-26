#!/usr/bin/env node
/**
 * Offline stationary-dribble authoring contract.
 * This intentionally produces task-space targets and event timing, not browser bone rotations.
 * A DCC/IK baker consumes this plan against the canonical Quaternius rig and emits the GLB.
 */
const fs=require('node:fs');
const fps=60,duration=1.36,frames=Math.round(fps*duration)+1;
const smooth=t=>t*t*(3-2*t);
const plan=[];
for(let i=0;i<frames;i++){
  const t=i/(frames-1)*duration;
  const half=(t%duration)/(duration/2);
  const left=half<1;
  const phase=half%1;
  const down=phase<.5?smooth(phase*2):smooth((1-phase)*2);
  plan.push({
    frame:i,time:+t.toFixed(5),
    stance:{pelvisHeight:0.91,pelvisForward:0.04,stanceWidth:0.48,footLock:true,torsoLeanDeg:11,headUp:true},
    activeSide:left?'left':'right',
    handTarget:{x:(left?-0.34:0.34),y:+(1.02-.58*down).toFixed(5),z:0.22},
    elbowHint:{x:(left?-0.56:0.56),y:1.13,z:0.08},
    offHandTarget:{x:(left?0.29:-0.29),y:1.20,z:0.28},
    ballTarget:{x:(left?-0.34:0.34),y:+(0.125+(0.895*(1-down))).toFixed(5),z:0.22}
  });
}
const events=[
 {type:'CONTROL',time:0},{type:'PUSH',time:.08},{type:'RELEASE',time:.24},
 {type:'FLOOR_CONTACT',time:.34},{type:'REACQUIRE',time:.58},
 {type:'CONTROL',time:.68},{type:'PUSH',time:.76},{type:'RELEASE',time:.92},
 {type:'FLOOR_CONTACT',time:1.02},{type:'REACQUIRE',time:1.26}
];
const out={version:1,clip:'RCL_Stationary_Alternating_Pound_v1',fps,duration,frames,events,taskSpaceFrames:plan,
 constraints:{feet:'locked',kneePole:'forward',elbowPole:'outward-forward',runtimeBonePosing:false}};
fs.mkdirSync('public/lab3d/motion',{recursive:true});
fs.writeFileSync('public/lab3d/motion/stationary-dribble-plan.json',JSON.stringify(out,null,2));
console.log('Authored task-space plan:',out.clip,frames+' frames');
