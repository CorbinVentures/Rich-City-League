#!/usr/bin/env node
import fs from 'node:fs';
const out=process.argv[2]||'public/lab3d/motion/pass-v1-plan.json',fps=30,duration=1.15,frames=[];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(let i=0;i<=Math.round(duration*fps);i++){const time=Math.min(duration,i/fps),p=time/duration;
 const load=p<.18?smooth(p/.18):p<.34?1:1-smooth((p-.34)/.18);
 const extend=p<.20?0:p<.58?smooth((p-.20)/.38):p<.72?1:1-smooth((p-.72)/.28);
 const release=p<.48?0:p<.62?smooth((p-.48)/.14):p<.76?1:1-smooth((p-.76)/.24);
 const pelvisHeightOffset=-.012*load,torsoLean=4*extend,armExtend=extend,wristSnap=12*release,ballForward=.78*release;
 frames.push({frame:i,time:+time.toFixed(4),load:+load.toFixed(5),extend:+extend.toFixed(5),release:+release.toFixed(5),pelvisHeightOffset:+pelvisHeightOffset.toFixed(5),torsoLean:+torsoLean.toFixed(3),armExtend:+armExtend.toFixed(5),wristSnap:+wristSnap.toFixed(3),ballForward:+ballForward.toFixed(5)});
}
const plan={version:1,clip:'RCL_Chest_Pass_v1',fps,duration,canonicalStartEnd:'RCL_Ready_Stance_v4',passType:'two-hand-chest',principles:['ball starts in protected chest window','hips stay loaded','both feet stay planted','hands extend symmetrically through target','release occurs after extension begins','wrists finish through the pass','no overhead flare','canonical recovery'],events:[{name:'ready-start',time:0},{name:'load',time:.18},{name:'extend',time:.40},{name:'release',time:.62},{name:'follow-through',time:.76},{name:'ready-end',time:duration}],validation:{startReady:true,endReady:true,feetPlanted:true,symmetricRelease:true,noOverheadFlare:true},frames};
fs.mkdirSync(new URL('.', 'file://'+process.cwd()+'/'+out).pathname,{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2));console.log('Authored',out,plan.clip,frames.length+' frames');
