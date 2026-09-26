import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
describe('GLB baker source contract',()=>{
 it('exists and forbids mutation of skin/bind data by design',()=>{
  const s=fs.readFileSync('scripts/bake-lab-motion-glb.mjs','utf8');
  expect(s).toContain('gltf.animations.push');
  expect(s).toContain('rig node missing');
  expect(s).not.toContain('inverseBindMatrices=');
 });
});
