#!/usr/bin/env node
import fs from 'node:fs';
const expected=[
 ['public/lab3d/RCL_Defensive_Slide_v1.glb','RCL_Defensive_Slide_v1'],
 ['public/lab3d/RCL_Closeout_v1.glb','RCL_Closeout_v1'],
 ['public/lab3d/RCL_Triple_Threat_Jab_v1.glb','RCL_Triple_Threat_Jab_v1'],
 ['public/lab3d/RCL_Dribble_Stance_v1.glb','RCL_Dribble_Stance_v1'],
 ['public/lab3d/RCL_Chest_Pass_v1.glb','RCL_Chest_Pass_v1'],
 ['public/lab3d/RCL_Set_Shot_v1.glb','RCL_Set_Shot_v1']
];
for(const [path,clip] of expected){if(!fs.existsSync(path))throw Error('missing '+path);const b=fs.readFileSync(path);if(b.toString('ascii',0,4)!=='glTF')throw Error('invalid '+path);const n=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+n).trim());if(!(g.animations||[]).some(a=>a.name===clip))throw Error('missing '+clip+' in '+path)}
console.log('Validated canonical Lab motion library:',expected.length,'motions');
