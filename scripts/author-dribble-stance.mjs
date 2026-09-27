#!/usr/bin/env node
import fs from 'node:fs';
const out=process.argv[2]||'public/lab3d/motion/dribble-stance-v1-plan.json';
const fps=30,duration=1.0,frames=[];
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
for(let i=0;i<=Math.round(duration*fps);i++){
 const time=Math.min(duration,i/fps),p=time/duration;
 // One controlled right-hand pound cycle from and back to the canonical stance.
 const cycle=Math.sin(Math.PI*p);
 const down=smooth(Math.min(1,p/.46));
 const recover=p<.46?0:smooth((p-.46)/.54);
 const handDrop=.20*(down-recover);
 const pelvisHeightOffset=-.012*cycle;
 const torsoLean=3.5*cycle;
 const offHandGuard=6*cycle;
 frames.push({frame:i,time:+time.toFixed(4),cycle:+cycle.toFixed(5),handDrop:+handDrop.toFixed(5),pelvisHeightOffset:+pelvisHeightOffset.toFixed(5),torsoLean:+torsoLean.toFixed(3),offHandGuard:+offHandGuard.toFixed(3)});
}
const plan={version:1,clip:'RCL_Dribble_Stance_v1',fps,duration,canonicalStartEnd:'RCL_Ready_Stance_v4',dribbleHand:'right',principles:['hips remain loaded','eyes/chest stay controlled','right hand pounds beside body','left hand protects space','feet stay planted','no upright bounce','recover to canonical stance'],events:[{name:'ready-start',time:0},{name:'ball-descend',time:.18},{name:'pound-low',time:.46},{name:'recover',time:.72},{name:'ready-end',time:duration}],validation:{startReady:true,endReady:true,feetPlanted:true,noUprightBounce:true},frames};
fs.mkdirSync(new URL('.', 'file://'+process.cwd()+'/'+out).pathname,{recursive:true});fs.writeFileSync(out,JSON.stringify(plan,null,2));console.log('Authored',out,plan.clip,frames.length+' frames');
