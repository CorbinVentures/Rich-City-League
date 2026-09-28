#!/usr/bin/env node
import fs from 'node:fs';
const src=fs.readFileSync('src/lib/labMotionLibrary.ts','utf8');
const entries=[...src.matchAll(/\{id:'([^']+)',label:'([^']+)',category:'([^']+)',clip:'([^']+)',file:'([^']+)',duration:([\d.]+),fps:(\d+),ball:(true|false)\}/g)].map(m=>({id:m[1],label:m[2],category:m[3],clip:m[4],file:m[5],duration:+m[6],fps:+m[7],ball:m[8]==='true'}));
if(entries.length!==6)throw Error('Expected 6 canonical motions, found '+entries.length);
const ids=new Set(),clips=new Set(),files=new Set();
for(const x of entries){
 if(ids.has(x.id)||clips.has(x.clip)||files.has(x.file))throw Error('Duplicate canonical motion identity: '+x.id);
 ids.add(x.id);clips.add(x.clip);files.add(x.file);
 if(!(x.duration>0)||!Number.isInteger(x.fps)||x.fps<=0)throw Error('Invalid timing metadata: '+x.id);
 const path='public'+x.file.replace('/lab3d','/lab3d');
 if(!fs.existsSync(path))throw Error('Missing GLB: '+path);
 const b=fs.readFileSync(path),n=b.readUInt32LE(12),g=JSON.parse(b.toString('utf8',20,20+n).trim()),a=(g.animations||[]).find(a=>a.name===x.clip);
 if(!a)throw Error('Exact clip missing for '+x.id);
 if(Math.abs(a.duration-x.duration)>(1/x.fps+.001))throw Error('Duration drift '+x.id+': registry '+x.duration+' GLB '+a.duration);
}
for(const id of ['triple-threat-jab','dribble-stance','chest-pass','set-shot'])if(!entries.find(x=>x.id===id)?.ball)throw Error(id+' must be ball-enabled');
for(const id of ['defensive-slide','closeout'])if(entries.find(x=>x.id===id)?.ball)throw Error(id+' must be ball-free');
console.log(JSON.stringify({motions:entries.length,unique:true,timing:true,ballRouting:true,ballLedMotions:4},null,2));
