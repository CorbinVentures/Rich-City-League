import {describe,it,expect} from 'vitest';import fs from 'node:fs';
describe('stationary dribble track generator',()=>{it('contains full-body named skeletal tracks',()=>{
 const s=fs.readFileSync('scripts/generate-stationary-dribble-tracks.mjs','utf8');
 for(const n of ['pelvis','spine_01','upperarm_l','lowerarm_l','upperarm_r','lowerarm_r','thigh_l','calf_l','thigh_r','calf_r'])expect(s).toContain(n);
 expect(s).not.toContain("node:'RCL_Ball'");expect(s).toContain('continuity');expect(s).toContain('runtimeBonePosing:false');
});});
