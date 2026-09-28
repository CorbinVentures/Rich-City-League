#!/usr/bin/env node
import fs from 'node:fs';
import {MOTION_SPECS} from './lib/basketball-motion-specs.mjs';
import {validateMotion} from './lib/basketball-motion-validator.mjs';

const results=Object.keys(MOTION_SPECS).map(id=>validateMotion(id));

// Set Shot V1 gets a biomechanical gate, not merely a generic GLB-validity gate.
// Mobile QA showed that valid palm normals alone are insufficient: the ball can still sit on the
// facial midline, the shooting elbow can flare outside the wrist, and the guide wrist can ride too high.
const shot=JSON.parse(fs.readFileSync('public/lab3d/motion/set-shot-quality.json','utf8'));
const nearest=phase=>shot.framePoints.reduce((best,frame)=>Math.abs(frame.p-phase)<Math.abs(best.p-phase)?frame:best);
const early=nearest(.20),setPoint=nearest(.56),release=nearest(.72),follow=nearest(.84),leg=shot.legScale;
const setHandSeparation=Math.abs(setPoint.handR[0]-setPoint.handL[0]);
const releaseHandSeparation=Math.abs(release.handR[0]-release.handL[0]);
const shootingForearmStack=release.handR[1]-release.elbowR[1];
const shootingHandUnderBall=setPoint.ball?setPoint.ball[1]-setPoint.handR[1]:-1;
const guideBelowBall=setPoint.ball?setPoint.ball[1]-setPoint.handL[1]:-1;
const setBallRightOffset=setPoint.ball?setPoint.pelvis[0]-setPoint.ball[0]:-1;
const earlyBallRightOffset=early.ball?early.pelvis[0]-early.ball[0]:-1;
const shootingLineLateralError=Math.abs(setPoint.handR[0]-setPoint.elbowR[0]);
const followThroughRise=follow.handR[1]-release.handR[1];
const followThroughLateralDrift=Math.abs(follow.handR[0]-setPoint.handR[0]);
const contactFrames=shot.framePoints.filter(frame=>frame.p>=.20&&frame.p<=.64);
const minShootingPalm=Math.min(...contactFrames.map(frame=>frame.palmToBallR??-1));
const minGuidePalm=Math.min(...contactFrames.map(frame=>frame.palmToBallL??-1));
const minShootingFingerUp=Math.min(...contactFrames.map(frame=>frame.fingerUpR??-1));
const minGuideFingerUp=Math.min(...contactFrames.map(frame=>frame.fingerUpL??-1));
const failures=[];
if(setBallRightOffset<leg*.085)failures.push(`set-shot ball is too close to facial midline at set point (${setBallRightOffset.toFixed(3)})`);
if(earlyBallRightOffset<leg*.065)failures.push(`set-shot gather starts too close to facial midline (${earlyBallRightOffset.toFixed(3)})`);
if(setHandSeparation<leg*.12)failures.push(`set-shot shooting/guide wrists collapse at set point (${setHandSeparation.toFixed(3)})`);
if(releaseHandSeparation<leg*.20)failures.push(`set-shot guide hand has not peeled laterally (${releaseHandSeparation.toFixed(3)})`);
if(shootingForearmStack<leg*.15)failures.push(`set-shot shooting forearm is not vertically stacked (${shootingForearmStack.toFixed(3)})`);
if(shootingHandUnderBall<leg*.095)failures.push(`set-shot shooting wrist is not underneath the ball (${shootingHandUnderBall.toFixed(3)})`);
if(guideBelowBall<leg*.025||guideBelowBall>leg*.085)failures.push(`set-shot guide wrist is not on the lower-side quadrant (${guideBelowBall.toFixed(3)})`);
if(shootingLineLateralError>leg*.075)failures.push(`set-shot shooting elbow flares outside the wrist line (${shootingLineLateralError.toFixed(3)})`);
if(followThroughRise<leg*.035)failures.push(`set-shot follow-through does not continue upward after release (${followThroughRise.toFixed(3)})`);
if(followThroughLateralDrift>leg*.075)failures.push(`set-shot follow-through wraps laterally across the head (${followThroughLateralDrift.toFixed(3)})`);
if(minShootingPalm<.75)failures.push(`set-shot shooting palm is not facing the ball (${minShootingPalm.toFixed(3)})`);
if(minGuidePalm<.72)failures.push(`set-shot guide palm is reversed away from the ball (${minGuidePalm.toFixed(3)})`);
if(minShootingFingerUp<.08)failures.push(`set-shot shooting fingers point downward during contact (${minShootingFingerUp.toFixed(3)})`);
if(minGuideFingerUp<.08)failures.push(`set-shot guide fingers point downward during contact (${minGuideFingerUp.toFixed(3)})`);
if(failures.length)throw Error(`Set Shot V1 biomechanical gate failed: ${failures.join('; ')}`);

console.log(JSON.stringify({engine:'RCL_TASK_SPACE_IK_V2',phaseModel:'basketball-training-v4',setShotBiomechanics:{setHandSeparation,releaseHandSeparation,shootingForearmStack,shootingHandUnderBall,guideBelowBall,setBallRightOffset,earlyBallRightOffset,shootingLineLateralError,followThroughRise,followThroughLateralDrift,minShootingPalm,minGuidePalm,minShootingFingerUp,minGuideFingerUp,pass:true},motions:results},null,2));