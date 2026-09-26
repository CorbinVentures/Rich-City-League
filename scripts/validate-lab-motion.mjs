#!/usr/bin/env node
/**
 * RCL Lab motion-asset release gate.
 * Validates a glTF JSON report exported by the offline solver.
 * The solver must emit measurements per frame; runtime code never invents poses.
 */
const fs=require('node:fs');
const path=process.argv[2];
if(!path){console.error('usage: node scripts/validate-lab-motion.mjs <report.json>');process.exit(2);}
const r=JSON.parse(fs.readFileSync(path,'utf8'));
const fail=[];
const req=['clip','fps','frames','metrics','events'];
for(const k of req)if(r[k]==null)fail.push('missing '+k);
const m=r.metrics||{};
const limits={
  maxFootSlideM:.025,
  minPelvisHeightM:.72,
  minKneeFloorClearanceM:.22,
  maxContactHandBallM:.08,
  maxFloorPenetrationM:.005,
  maxQuaternionNormError:.001,
  maxLoopPositionErrorM:.02,
  maxTPoseScore:.18
};
for(const [k,limit] of Object.entries(limits)){
  const v=m[k];
  if(typeof v!=='number'){fail.push('missing metric '+k);continue;}
  if(k.startsWith('min')){if(v<limit)fail.push(k+' '+v+' < '+limit);}
  else if(v>limit)fail.push(k+' '+v+' > '+limit);
}
const requiredEvents=['CONTROL','PUSH','RELEASE','FLOOR_CONTACT','REACQUIRE'];
for(const e of requiredEvents)if(!(r.events||[]).some(x=>x.type===e))fail.push('missing event '+e);
if((r.frames||0)<2)fail.push('insufficient frames');
if(fail.length){console.error('RCL MOTION REJECTED\n- '+fail.join('\n- '));process.exit(1);}
console.log('RCL MOTION APPROVED:',r.clip,'frames='+r.frames,'fps='+r.fps);
