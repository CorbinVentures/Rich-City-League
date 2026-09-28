#!/usr/bin/env node
import fs from 'node:fs';
import {MOTION_SPECS} from './lib/basketball-motion-specs.mjs';
import {validateMotion} from './lib/basketball-motion-validator.mjs';

const results=Object.keys(MOTION_SPECS).map(id=>validateMotion(id));

// A generic GLB can be mathematically valid while still looking nothing like a jump/set shot.
// Gate the set-shot on actual baked joint geometry so crossed/horizontal forearms cannot ship again.
const shot=JSON.parse(fs.readFileSync('public/lab3d/motion/set-shot-quality.json','utf8'));
const nearest=phase=>shot.framePoints.reduce((best,frame)=>Math.abs(frame.time/1.45-phase)<Math.abs(best.time/1.45-phase)?frame:best);
const setPoint=nearest(.56),release=nearest(.68),leg=shot.legScale;
const setHandSeparation=Math.abs(setPoint.handR[0]-setPoint.handL[0]);
const releaseHandSeparation=Math.abs(release.handR[0]-release.handL[0]);
const shootingForearmStack=release.handR[1]-release.elbowR[1];
const guideDrop=release.handR[1]-release.handL[1];
const failures=[];
if(setHandSeparation<leg*.22)failures.push(`set-shot hands collapse at set point (${setHandSeparation.toFixed(3)})`);
if(releaseHandSeparation<leg*.30)failures.push(`set-shot guide hand has not peeled laterally (${releaseHandSeparation.toFixed(3)})`);
if(shootingForearmStack<leg*.18)failures.push(`set-shot shooting forearm is not vertically stacked (${shootingForearmStack.toFixed(3)})`);
if(guideDrop<leg*.06)failures.push(`set-shot shooting hand is not above guide hand at release (${guideDrop.toFixed(3)})`);
if(failures.length)throw Error(`Set Shot V1 visual mechanics gate failed: ${failures.join('; ')}`);

console.log(JSON.stringify({engine:'RCL_TASK_SPACE_IK_V2',phaseModel:'basketball-training-v3',setShotGeometry:{setHandSeparation,releaseHandSeparation,shootingForearmStack,guideDrop,pass:true},motions:results},null,2));
