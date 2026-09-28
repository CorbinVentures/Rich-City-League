#!/usr/bin/env node
import fs from 'node:fs';
import {MOTION_SPECS} from './lib/basketball-motion-specs.mjs';
import {validateMotion} from './lib/basketball-motion-validator.mjs';

const results=Object.keys(MOTION_SPECS).map(id=>validateMotion(id));

// Set Shot V1 gets a biomechanical gate, not merely a generic GLB-validity gate.
// The mobile screenshots exposed that positions could pass while the palms/fingers were literally facing the wrong way.
const shot=JSON.parse(fs.readFileSync('public/lab3d/motion/set-shot-quality.json','utf8'));
const nearest=phase=>shot.framePoints.reduce((best,frame)=>Math.abs(frame.p-phase)<Math.abs(best.p-phase)?frame:best);
const setPoint=nearest(.54),release=nearest(.70),leg=shot.legScale;
const setHandSeparation=Math.abs(setPoint.handR[0]-setPoint.handL[0]);
const releaseHandSeparation=Math.abs(release.handR[0]-release.handL[0]);
const shootingForearmStack=release.handR[1]-release.elbowR[1];
const shootingHandUnderBall=setPoint.ball?setPoint.ball[1]-setPoint.handR[1]:-1;
const guideVerticalOffset=setPoint.ball?Math.abs(setPoint.ball[1]-setPoint.handL[1]):Infinity;
const contactFrames=shot.framePoints.filter(frame=>frame.p>=.20&&frame.p<=.60);
const minShootingPalm=Math.min(...contactFrames.map(frame=>frame.palmToBallR??-1));
const minGuidePalm=Math.min(...contactFrames.map(frame=>frame.palmToBallL??-1));
const minShootingFingerUp=Math.min(...contactFrames.map(frame=>frame.fingerUpR??-1));
const minGuideFingerUp=Math.min(...contactFrames.map(frame=>frame.fingerUpL??-1));
const failures=[];
if(setHandSeparation<leg*.12)failures.push(`set-shot shooting/guide wrists collapse at set point (${setHandSeparation.toFixed(3)})`);
if(releaseHandSeparation<leg*.22)failures.push(`set-shot guide hand has not peeled laterally (${releaseHandSeparation.toFixed(3)})`);
if(shootingForearmStack<leg*.15)failures.push(`set-shot shooting forearm is not vertically stacked (${shootingForearmStack.toFixed(3)})`);
if(shootingHandUnderBall<leg*.095)failures.push(`set-shot shooting wrist is not underneath the ball (${shootingHandUnderBall.toFixed(3)})`);
if(guideVerticalOffset>leg*.06)failures.push(`set-shot guide wrist is underneath/above the ball instead of on its side (${guideVerticalOffset.toFixed(3)})`);
if(minShootingPalm<.75)failures.push(`set-shot shooting palm is not facing the ball (${minShootingPalm.toFixed(3)})`);
if(minGuidePalm<.72)failures.push(`set-shot guide palm is reversed away from the ball (${minGuidePalm.toFixed(3)})`);
if(minShootingFingerUp<.08)failures.push(`set-shot shooting fingers point downward during contact (${minShootingFingerUp.toFixed(3)})`);
if(minGuideFingerUp<.08)failures.push(`set-shot guide fingers point downward during contact (${minGuideFingerUp.toFixed(3)})`);
if(failures.length)throw Error(`Set Shot V1 biomechanical gate failed: ${failures.join('; ')}`);

console.log(JSON.stringify({engine:'RCL_TASK_SPACE_IK_V2',phaseModel:'basketball-training-v3',setShotBiomechanics:{setHandSeparation,releaseHandSeparation,shootingForearmStack,shootingHandUnderBall,guideVerticalOffset,minShootingPalm,minGuidePalm,minShootingFingerUp,minGuideFingerUp,pass:true},motions:results},null,2));