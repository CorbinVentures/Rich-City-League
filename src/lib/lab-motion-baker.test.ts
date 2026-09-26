import {describe,it,expect} from 'vitest';
import {solveBasketballFrame,type RigMap} from './lab-motion-baker';
const J=(name:string,axis:any,rot:any=[0,0,0,1])=>({name,parent:null,localPosition:{x:0,y:0,z:0},localRotation:rot,primaryAxis:axis});
const rig:RigMap={
 pelvis:J('pelvis',{x:0,y:1,z:0}),spine01:J('spine_01',{x:0,y:1,z:0}),spine02:J('spine_02',{x:0,y:1,z:0}),spine03:J('spine_03',{x:0,y:1,z:0}),
 thighL:J('thigh_l',{x:0,y:-1,z:0},[.989831,0,0,.142248]),calfL:J('calf_l',{x:0,y:-1,z:0}),footL:J('foot_l',{x:0,y:0,z:1},[-.572168,0,0,.820136]),
 thighR:J('thigh_r',{x:0,y:-1,z:0},[.989831,0,0,.142248]),calfR:J('calf_r',{x:0,y:-1,z:0}),footR:J('foot_r',{x:0,y:0,z:1},[-.572168,0,0,.820136]),
 upperArmL:J('upperarm_l',{x:1,y:0,z:0},[.149803,.691131,-.149388,.691072]),lowerArmL:J('lowerarm_l',{x:1,y:0,z:0}),handL:J('hand_l',{x:1,y:0,z:0}),
 upperArmR:J('upperarm_r',{x:-1,y:0,z:0},[.149803,-.691131,.149388,.691072]),lowerArmR:J('lowerarm_r',{x:-1,y:0,z:0}),handR:J('hand_r',{x:-1,y:0,z:0})
};
describe('whole basketball frame solve',()=>{
 it('keeps a loaded stance and solves all four limbs',()=>{
  const s=solveBasketballFrame(rig,{pelvis:{x:0,y:.91,z:.04},leftFoot:{x:-.24,y:.12,z:0},rightFoot:{x:.24,y:.12,z:0},leftKneePole:{x:-.3,y:.55,z:.35},rightKneePole:{x:.3,y:.55,z:.35},leftHand:{x:-.34,y:.72,z:.22},rightHand:{x:.29,y:1.2,z:.28},leftElbowPole:{x:-.56,y:1.13,z:.08},rightElbowPole:{x:.52,y:1.25,z:.12},headTarget:{x:0,y:1.78,z:.08}},{thighL:.48,calfL:.48,thighR:.48,calfR:.48,upperArmL:.36,lowerArmL:.34,upperArmR:.36,lowerArmR:.34});
  expect(s.points.unreachable).toEqual({x:1,y:0,z:0}); // solver reports reachability diagnostics; stance assertions below remain the gate
  expect(s.points.kneeL.y).toBeGreaterThan(.2);expect(s.points.kneeR.y).toBeGreaterThan(.2);
  expect(Object.keys(s.localRotations)).toEqual(expect.arrayContaining(['thigh_l','calf_l','thigh_r','calf_r','upperarm_l','lowerarm_l','upperarm_r','lowerarm_r']));
 });
});
