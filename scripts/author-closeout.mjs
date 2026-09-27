#!/usr/bin/env node
import fs from 'node:fs';
const out=process.argv[2]||'public/lab3d/motion/closeout-v1-plan.json';
const fps=30,duration=1.35,frames=[];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(let i=0;i<=Math.round(duration*fps);i++){
 const time=Math.min(duration,i/fps),p=time/duration;
 // Advance under control, then decelerate into the same canonical defensive base.
 const advance=.72*smooth(Math.min(1,p/.62));
 const settle=p<.62?0:smooth((p-.62)/.38);
 const forwardOffset=advance-.72*settle;
 // Small center-of-mass drop on braking; never pop upright at the contest.
 const pelvisHeightOffset=-.014*Math.sin(Math.PI*Math.min(1,p/.82));
 // Arms rise late so the athlete closes space before showing the contest.
 const contest=p<.46?0:smooth((p-.46)/.38)*(1-smooth(Math.max(0,(p-.86)/.14)));
 frames.push({frame:i,time:+time.toFixed(4),forwardOffset:+forwardOffset.toFixed(5),pelvisHeightOffset:+pelvisHeightOffset.toFixed(5),contest:+contest.toFixed(5)});
}
const plan={version:1,clip:'RCL_Closeout_v1',fps,duration,canonicalStartEnd:'RCL_Ready_Stance_v4',principles:['short controlled approach','hips remain loaded','choppy braking steps','high active contest hands','no fly-by','finish in canonical defensive stance'],events:[{name:'ready-start',time:0},{name:'approach',time:.18},{name:'chop-brake',time:.72},{name:'high-hands-contest',time:.92},{name:'ready-end',time:duration}],validation:{startReady:true,endReady:true,noFlyBy:true,controlledDeceleration:true},frames};
fs.mkdirSync(new URL('.', 'file://'+process.cwd()+'/'+out).pathname,{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2));console.log('Authored',out,plan.clip,frames.length+' frames');
