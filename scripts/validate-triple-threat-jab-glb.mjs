#!/usr/bin/env node
import {validateMotion} from './lib/basketball-motion-validator.mjs';
console.log(JSON.stringify(validateMotion('triple-threat-jab',process.argv[2]),null,2));
