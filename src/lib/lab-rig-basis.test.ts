import {describe,it,expect} from 'vitest';
import {localRotationForDirection,qMul,rotate,quatFromTo,type BindJoint} from './lab-rig-basis';

const near=(a:number,b:number)=>expect(a).toBeCloseTo(b,5);
describe('Lab bind-basis conversion',()=>{
 it('maps a nontrivial bind axis to a desired world direction',()=>{
  const bind:BindJoint={name:'upperarm_l',parent:'clavicle_l',localPosition:{x:0,y:0,z:0},localRotation:[0.149803,0.691131,-0.149388,0.691072],primaryAxis:{x:1,y:0,z:0}};
  const parent=quatFromTo({x:0,y:1,z:0},{x:.1,y:.98,z:.15});
  const desired={x:-.45,y:-.7,z:.3};
  const local=localRotationForDirection(bind,parent,desired);
  const world=qMul(parent,local),actual=rotate(world,bind.primaryAxis);
  const n=Math.hypot(desired.x,desired.y,desired.z);
  near(actual.x,desired.x/n);near(actual.y,desired.y/n);near(actual.z,desired.z/n);
 });
 it('keeps quaternion unit length',()=>{
  const q=quatFromTo({x:1,y:0,z:0},{x:0,y:0,z:1});
  near(Math.hypot(...q),1);
 });
});
