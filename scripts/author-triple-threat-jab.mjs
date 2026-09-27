#!/usr/bin/env node
import fs from 'node:fs';
const out=process.argv[2]||'public/lab3d/motion/triple-threat-jab-v1-plan.json';
const fps=30,duration=1.2,frames=[];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(let i=0;i<=Math.round(duration*fps);i++){
 const time=Math.min(duration,i/fps),p=time/duration;
 // Right-foot jab: load, extend, recover. Left foot remains the pivot anchor.
 const attack=p<.18?0:p<.48?smooth((p-.18)/.30):p<.72?1:1-smooth((p-.72)/.28);
 const jabForward=.24*attack;
 const jabLateral=.055*attack;
 const pelvisForward=.055*attack;
 const pelvisLateral=.025*attack;
 const pelvisHeightOffset=-.018*Math.sin(Math.PI*attack);
 const torsoTurn=7*attack;
 frames.push({frame:i,time:+time.toFixed(4),attack:+attack.toFixed(5),jabForward:+jabForward.toFixed(5),jabLateral:+jabLateral.toFixed(5),pelvisForward:+pelvisForward.toFixed(5),pelvisLateral:+pelvisLateral.toFixed(5),pelvisHeightOffset:+pelvisHeightOffset.toFixed(5),torsoTurn:+torsoTurn.toFixed(3)});
}
const plan={version:1,clip:'RCL_Triple_Threat_Jab_v1',fps,duration,canonicalStartEnd:'RCL_Ready_Stance_v4',pivotFoot:'foot_l',jabFoot:'foot_r',principles:['ball-ready triple-threat base','left pivot foot stays planted','right jab attacks forward-outside','hips stay loaded','controlled torso sell','no pivot-foot travel','recover to canonical stance'],events:[{name:'ready-start',time:0},{name:'load',time:.18},{name:'jab-extend',time:.58},{name:'jab-recover',time:.88},{name:'ready-end',time:duration}],validation:{startReady:true,endReady:true,pivotLocked:true,noCrossing:true},frames};
fs.mkdirSync(new URL('.', 'file://'+process.cwd()+'/'+out).pathname,{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2));console.log('Authored',out,plan.clip,frames.length+' frames');
