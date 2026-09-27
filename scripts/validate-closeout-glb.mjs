#!/usr/bin/env node
import {validateMotion} from './lib/basketball-motion-validator.mjs';
console.log(JSON.stringify(validateMotion('closeout',process.argv[2]),null,2));
