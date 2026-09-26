import {describe,it,expect} from 'vitest';
import {solveTwoBone,quatContinuous} from './lab-motion-ik';

describe('Lab offline IK primitives',()=>{
  it('solves a reachable limb and preserves segment lengths',()=>{
    const r=solveTwoBone({x:0,y:1,z:0},{x:.2,y:.45,z:.25},{x:.35,y:.7,z:.55},.42,.43);
    const d=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    expect(r.reachable).toBe(true);
    expect(d({x:0,y:1,z:0},r.joint)).toBeCloseTo(.42,5);
    expect(d(r.joint,r.end)).toBeCloseTo(.43,5);
  });
  it('uses the pole to keep the bend on the requested side',()=>{
    const a=solveTwoBone({x:0,y:1,z:0},{x:0,y:.35,z:.1},{x:.3,y:.7,z:.4},.42,.43);
    const b=solveTwoBone({x:0,y:1,z:0},{x:0,y:.35,z:.1},{x:-.3,y:.7,z:.4},.42,.43);
    expect(Math.sign(a.joint.x)).toBe(1);expect(Math.sign(b.joint.x)).toBe(-1);
  });
  it('normalizes and removes quaternion sign flips',()=>{
    const q=quatContinuous([0,0,0,1],[0,0,0,-2]);
    expect(q[3]).toBeCloseTo(1,8);
    expect(Math.hypot(...q)).toBeCloseTo(1,8);
  });
});
