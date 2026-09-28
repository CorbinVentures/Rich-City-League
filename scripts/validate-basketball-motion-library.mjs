#!/usr/bin/env node
import {MOTION_SPECS} from './lib/basketball-motion-specs.mjs';
import {validateMotion} from './lib/basketball-motion-validator.mjs';
const results=Object.keys(MOTION_SPECS).map(id=>validateMotion(id));
console.log(JSON.stringify({engine:'RCL_TASK_SPACE_IK_V3',phaseModel:'basketball-training-v4',contactModel:'ball-led-v1',motions:results},null,2));
