#!/usr/bin/env node
import {bakeMotion} from './lib/basketball-motion-baker.mjs';
const [,,inPath,planPath,outPath]=process.argv;
bakeMotion('closeout',{inPath,planPath,outPath});
