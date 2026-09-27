#!/usr/bin/env node

const clamp=t=>Math.max(0,Math.min(1,t));
export const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
export const seg=(p,a,b)=>a===b?(p>=b?1:0):smooth((p-a)/(b-a));
export const pulse=(p,a,b,c,d)=>seg(p,a,b)*(1-seg(p,c,d));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const keyCurve=(p,pts)=>{
  if(p<=pts[0][0])return pts[0][1];
  for(let i=1;i<pts.length;i++)if(p<=pts[i][0]){const [p0,v0]=pts[i-1],[p1,v1]=pts[i],t=smooth((p-p0)/(p1-p0));return lerp(v0,v1,t)}
  return pts.at(-1)[1];
};
const hand=(mode='ready',target=[0,0,0],blend=0,offset=[0,0,0])=>({mode,target,blend:clamp(blend),offset});
const frameBase=(phase,p)=>({phase,p,pelvis:[0,0,0],feet:{l:[0,0,0],r:[0,0,0]},footPlant:{l:true,r:true},torso:{pitch:0,yaw:0,roll:0},hands:{l:hand(),r:hand()},wrist:{lPitch:0,lYaw:0,rPitch:0,rYaw:0},armPole:{l:[-.55,.08,.45],r:[.55,.08,.45]}});

function defensiveSlide(p){
  const f=frameBase(p<.12?'load':p<.34?'lead-step':p<.52?'trail-recover':p<.64?'hold':p<.82?'return-step':'reset',p);
  const travel=keyCurve(p,[[0,0],[.12,.02],[.34,.19],[.52,.23],[.64,.23],[.82,.08],[1,0]]);
  f.pelvis=[travel,-.026*pulse(p,.04,.16,.80,.98),0];
  f.feet.r=[keyCurve(p,[[0,0],[.08,0],[.26,.29],[.70,.29],[.94,0],[1,0]]),.028*(pulse(p,.08,.13,.21,.28)+pulse(p,.70,.76,.88,.95)),0];
  f.feet.l=[keyCurve(p,[[0,0],[.20,0],[.42,.18],[.56,.18],[.78,0],[1,0]]),.024*(pulse(p,.20,.25,.36,.43)+pulse(p,.56,.61,.72,.79)),0];
  f.footPlant.r=f.feet.r[1]<.004;f.footPlant.l=f.feet.l[1]<.004;
  f.torso.roll=-3.0*travel/.23;
  const active=Math.sin(Math.PI*p);
  f.hands.l=hand('ready',[0,0,0],0,[-.025,.035,.035*active]);
  f.hands.r=hand('ready',[0,0,0],0,[.025,.035,-.02*active]);
  return f;
}

function closeout(p){
  const f=frameBase(p<.10?'load':p<.48?'approach':p<.68?'chop':p<.80?'contest':'retreat-reset',p);
  const rootF=keyCurve(p,[[0,0],[.08,.02],[.24,.18],[.42,.38],[.56,.46],[.72,.46],[.90,.14],[1,0]]);
  f.pelvis=[0,-.035*pulse(p,.34,.50,.78,.96),rootF];
  f.feet.r=[0,.024*(pulse(p,.07,.10,.16,.20)+pulse(p,.31,.34,.40,.45)+pulse(p,.76,.80,.86,.91)),keyCurve(p,[[0,0],[.16,.18],[.30,.18],[.43,.43],[.72,.43],[.88,.12],[1,0]])];
  f.feet.l=[0,.024*(pulse(p,.18,.22,.28,.33)+pulse(p,.44,.48,.54,.58)+pulse(p,.67,.71,.77,.82)+pulse(p,.86,.90,.95,.99)),keyCurve(p,[[0,0],[.14,0],[.29,.29],[.46,.29],[.57,.46],[.67,.46],[.80,.23],[.95,0],[1,0]])];
  f.footPlant.r=f.feet.r[1]<.004;f.footPlant.l=f.feet.l[1]<.004;
  f.torso.pitch=5*pulse(p,.05,.16,.48,.64)+2*pulse(p,.54,.62,.78,.88);
  const contest=pulse(p,.48,.58,.76,.86);
  f.hands.l=hand('pelvis',[-.22,.68,.14],contest);
  f.hands.r=hand('pelvis',[.22,.68,.14],contest);
  f.armPole={l:[-.35,.18,.55],r:[.35,.18,.55]};
  return f;
}

function jab(p){
  const f=frameBase(p<.16?'triple-threat-load':p<.48?'jab-extend':p<.70?'sell-hold':'jab-recover',p);
  const attack=pulse(p,.14,.30,.70,.94);
  f.pelvis=[.022*attack,-.035*attack,.055*attack];
  f.feet.l=[0,0,0];
  f.feet.r=[.065*attack,.026*(pulse(p,.14,.20,.30,.37)+pulse(p,.70,.76,.87,.94)),.25*attack];
  f.footPlant.l=true;f.footPlant.r=f.feet.r[1]<.004;
  f.torso.yaw=8*attack;f.torso.pitch=2.5*attack;
  const triple=seg(p,.06,.18)*(1-seg(p,.86,1));
  f.hands.l=hand('pelvis',[-.065,.44,.13],triple);
  f.hands.r=hand('pelvis',[.065,.42,.15],triple);
  f.armPole={l:[-.28,.04,.62],r:[.28,.04,.62]};
  return f;
}

function dribble(p){
  const f=frameBase(p<.18?'control-top':p<.52?'pound-down':p<.78?'recover-up':'reset',p);
  const activity=Math.sin(Math.PI*p),down=Math.sin(Math.PI*p)**2;
  f.pelvis=[0,-.025*activity,0];
  f.torso.pitch=4.5*activity;f.feet.l=[0,0,0];f.feet.r=[0,0,0];
  f.hands.r=hand('pelvis',[.28,lerp(.43,.27,down),.11],activity);
  f.hands.l=hand('pelvis',[-.30,.42,.20],activity);
  f.armPole={l:[-.52,.10,.52],r:[.28,-.05,.60]};
  f.wrist.rPitch=10*down;f.wrist.lYaw=-6*activity;
  return f;
}

function chestPass(p){
  const f=frameBase(p<.16?'load':p<.48?'drive':p<.70?'release':p<.86?'follow-through':'recover',p);
  const active=seg(p,.04,.16)*(1-seg(p,.86,1)),drive=seg(p,.20,.55),release=pulse(p,.47,.56,.76,.86);
  f.pelvis=[0,-.028*pulse(p,.04,.14,.34,.48),.035*drive*active];
  f.torso.pitch=5.5*drive*active;
  f.feet.l=[0,0,0];f.feet.r=[0,0,0];
  const forward=lerp(.15,.47,drive),sep=lerp(.065,.105,drive),up=lerp(.45,.47,drive);
  f.hands.l=hand('pelvis',[-sep,up,forward],active);
  f.hands.r=hand('pelvis',[sep,up,forward],active);
  f.armPole={l:[-.26,.02,.72],r:[.26,.02,.72]};
  f.wrist.lPitch=-16*release;f.wrist.rPitch=-16*release;f.wrist.lYaw=8*release;f.wrist.rYaw=-8*release;
  return f;
}

function setShot(p){
  const f=frameBase(p<.22?'dip':p<.48?'shot-pocket':p<.68?'rise-release':p<.84?'follow-through':'recover',p);
  const active=seg(p,.04,.14)*(1-seg(p,.88,1));
  const dip=pulse(p,.03,.13,.30,.44),rise=seg(p,.24,.62)*(1-seg(p,.80,1)),release=pulse(p,.48,.58,.78,.88);
  f.pelvis=[0,-.055*dip+.045*rise,0];
  f.torso.pitch=3.5*dip-1.5*rise;
  f.feet.l=[0,0,0];f.feet.r=[0,0,0];
  const pocketR=[.10,.48,.14],topR=[.10,.79,.20],finishR=[.10,.80,.29];
  const pocketL=[.015,.47,.13],topL=[.015,.72,.17],finishL=[-.01,.68,.12];
  const up=seg(p,.24,.58),follow=seg(p,.58,.75);
  const interp=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
  const r=interp(interp(pocketR,topR,up),finishR,follow),l=interp(interp(pocketL,topL,up),finishL,follow);
  f.hands.r=hand('pelvis',r,active);f.hands.l=hand('pelvis',l,active);
  f.armPole={l:[-.12,.04,.76],r:[.10,-.04,.84]};
  f.wrist.rPitch=-24*release;f.wrist.rYaw=-3*release;f.wrist.lPitch=-5*release;f.wrist.lYaw=8*release;
  return f;
}

export const MOTION_SPECS={
  'defensive-slide':{clip:'RCL_Defensive_Slide_v1',file:'public/lab3d/RCL_Defensive_Slide_v1.glb',plan:'public/lab3d/motion/defensive-slide-v1-plan.json',fps:30,duration:1.6,principles:['stay low','push from trail foot','lead foot creates space','trail foot recovers without crossing','feet replant before direction change','hands stay active','finish in balanced ready stance'],events:[['load',.08],['lead-step',.24],['trail-recover',.42],['change-direction',.64],['reset',1]],validation:{startReady:true,endReady:true,noCrossing:true,groundedPlants:true},frame:defensiveSlide},
  'closeout':{clip:'RCL_Closeout_v1',file:'public/lab3d/RCL_Closeout_v1.glb',plan:'public/lab3d/motion/closeout-v1-plan.json',fps:30,duration:1.8,principles:['short controlled approach','choppy final steps','hips drop before contest','high balanced hands','no fly-by','controlled retreat to reset'],events:[['approach',.18],['chop',.48],['contest',.64],['retreat',.82],['reset',1]],validation:{startReady:true,endReady:true,noFlyBy:true,controlledDeceleration:true},frame:closeout},
  'triple-threat-jab':{clip:'RCL_Triple_Threat_Jab_v1',file:'public/lab3d/RCL_Triple_Threat_Jab_v1.glb',plan:'public/lab3d/motion/triple-threat-jab-v1-plan.json',fps:30,duration:1.3,principles:['ball-ready triple-threat pocket','left pivot stays planted','right jab attacks forward-outside','hips stay loaded','torso sells without losing balance','jab foot retracts to base'],events:[['load',.14],['jab',.34],['sell',.58],['recover',.82],['reset',1]],validation:{startReady:true,endReady:true,pivotLocked:true,noCrossing:true},frame:jab},
  'dribble-stance':{clip:'RCL_Dribble_Stance_v1',file:'public/lab3d/RCL_Dribble_Stance_v1.glb',plan:'public/lab3d/motion/dribble-stance-v1-plan.json',fps:30,duration:1.0,principles:['feet stay planted','hips remain loaded','right hand pounds beside body','off hand protects space','torso stays controlled','one clean hand-floor-hand rhythm'],events:[['control-top',0],['pound-down',.32],['floor-contact',.5],['recover-up',.72],['reset',1]],validation:{startReady:true,endReady:true,feetPlanted:true,noUprightBounce:true},frame:dribble},
  'chest-pass':{clip:'RCL_Chest_Pass_v1',file:'public/lab3d/RCL_Chest_Pass_v1.glb',plan:'public/lab3d/motion/pass-v1-plan.json',fps:30,duration:1.25,principles:['ball loads at chest','feet stay grounded','hips and torso drive target','elbows extend symmetrically','release follows extension','wrists finish through target','recover to ready'],events:[['load',.12],['drive',.34],['release',.56],['follow-through',.72],['reset',1]],validation:{startReady:true,endReady:true,feetPlanted:true,symmetricRelease:true,noOverheadFlare:true},frame:chestPass},
  'set-shot':{clip:'RCL_Set_Shot_v1',file:'public/lab3d/RCL_Set_Shot_v1.glb',plan:'public/lab3d/motion/shot-v1-plan.json',fps:30,duration:1.45,principles:['balanced two-foot base','hips and knees dip before rise','compact shot pocket','right elbow stays under ball','guide hand stays passive','release near top of rise','wrist finishes through target','feet stay grounded','recover to ready'],events:[['dip',.14],['shot-pocket',.34],['rise',.50],['release',.62],['follow-through',.76],['reset',1]],validation:{startReady:true,endReady:true,feetPlanted:true,rightHandRelease:true,guideHandPassive:true,noElbowFlare:true},frame:setShot}
};

export function authorMotion(id){
  const spec=MOTION_SPECS[id];if(!spec)throw Error('Unknown motion '+id);
  const frames=[],count=Math.round(spec.duration*spec.fps);
  for(let i=0;i<=count;i++){const time=Math.min(spec.duration,i/spec.fps),p=time/spec.duration;frames.push({frame:i,time:+time.toFixed(4),...spec.frame(p)})}
  const plan={version:2,engine:'RCL_TASK_SPACE_IK_V1',id,clip:spec.clip,fps:spec.fps,duration:spec.duration,canonicalStartEnd:'RCL_Ready_Stance_v4',principles:spec.principles,events:spec.events.map(([name,p])=>({name,time:+(p*spec.duration).toFixed(4)})),validation:spec.validation,frames};
  return plan;
}
