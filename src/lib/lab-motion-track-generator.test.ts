import {describe,it,expect} from 'vitest';import fs from 'node:fs';
describe('stationary dribble track generator',()=>{it('contains full-body skeletal tracks and quaternion sign continuity',()=>{
 const s=fs.readFileSync('scripts/generate-stationary-dribble-tracks.mjs','utf8');
 for(const n of ['pelvis','spine_01','upperarm_l','lowerarm_l','upperarm_r','lowerarm_r','thigh_l','calf_l','thigh_r','calf_r'])expect(s).toContain(n);
 expect(s).not.toContain("node:'RCL_Ball'");
 expect(s).toContain('const cont=a=>');
 expect(s).toContain('if(d<0)');
 expect(s).toContain('a[i+j]*=-1');
 expect(s).toContain('values:cont(R[node])');
 expect(s).toContain('runtimeBonePosing:false');
});});
