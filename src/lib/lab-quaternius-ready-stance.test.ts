import {describe,it,expect} from 'vitest';import fs from 'node:fs';

describe('real Quaternius stance target builder',()=>{
  it('uses measured rig geometry and geometric feasible-set selection',()=>{
    const s=fs.readFileSync('scripts/build-quaternius-ready-stance.mjs','utf8');
    for(const x of [
      'J.pelvis.worldPosition',
      'J.foot_l.worldPosition',
      'J.upperarm_l.segmentLength',
      'J.lowerarm_l.segmentLength',
      'chooseHand',
      'pocketReachIntersection',
      'leftPredictedElbowAngle',
      'kneesForward'
    ]) expect(s).toContain(x);
    expect(s).not.toContain('handsBelowPelvis');
  });
});
