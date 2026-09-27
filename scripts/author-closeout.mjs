#!/usr/bin/env node
import fs from 'node:fs';
import {authorMotion,MOTION_SPECS} from './lib/basketball-motion-specs.mjs';
const id='closeout',plan=authorMotion(id),out=process.argv[2]||MOTION_SPECS[id].plan;
fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2));
console.log('Authored',plan.clip,plan.frames.length,'task-space frames ->',out);
