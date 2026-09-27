#!/usr/bin/env node
import fs from 'node:fs';
const out=process.argv[2]||'public/lab3d/motion/shot-v1-plan.json',fps=30,duration=1.35,frames=[];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(let i=0;i<=Math.round(duration*fps);i++){const time=Math.min(duration,i/fps),p=time/duration;
 const load=p<.24?smooth(p/.24):p<.34?1:1-smooth((p-.34)/.18);
 const rise=p<.20?0:p<.62?smooth((p-.20)/.42):p<.78?1:1-smooth((p-.78)/.22);
 const release=p<.48?0:p<.68?smooth((p-.48)/.20):p<.82?1:1-smooth((p-.82)/.18);
 const pelvisHeightOffset=-.045*load+.065*rise,armRaise=rise,shootElbow=rise,wristSnap=18*release,guideRelease=8*release,ballRise=.62*rise,ballForward=.32*release;
 frames.push({frame:i,time:+time.toFixed(4),load:+load.toFixed(5),rise:+rise.toFixed(5),release:+release.toFixed(5),pelvisHeightOffset:+pelvisHeightOffset.toFixed(5),armRaise:+armRaise.toFixed(5),shootElbow:+shootElbow.toFixed(5),wristSnap:+wristSnap.toFixed(3),guideRelease:+guideRelease.toFixed(3),ballRise:+ballRise.toFixed(5),ballForward:+ballForward.toFixed(5)});
}
const plan={version:1,clip:'RCL_Set_Shot_v1',fps,duration,canonicalStartEnd:'RCL_Ready_Stance_v4',shotType:'two-foot-set-shot',shootingHand:'right',principles:['balanced two-foot base','hips and knees load before rise','ball travels through compact shot pocket','right elbow stays under shooting line','guide hand supports without driving','release occurs near top of rise','shooting wrist finishes through target','feet remain grounded in V1','canonical recovery'],events:[{name:'ready-start',time:0},{name:'load',time:.22},{name:'shot-pocket',time:.40},{name:'rise',time:.58},{name:'release',time:.72},{name:'follow-through',time:.86},{name:'ready-end',time:duration}],validation:{startReady:true,endReady:true,feetPlanted:true,rightHandRelease:true,guideHandPassive:true,noElbowFlare:true},frames};
fs.mkdirSync(new URL('.', 'file://'+process.cwd()+'/'+out).pathname,{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2));console.log('Authored',out,plan.clip,frames.length+' frames');
