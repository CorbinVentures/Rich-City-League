#!/usr/bin/env node
import {validateMotion} from './lib/basketball-motion-validator.mjs';
console.log(JSON.stringify(validateMotion('defensive-slide',process.argv[2]),null,2));
