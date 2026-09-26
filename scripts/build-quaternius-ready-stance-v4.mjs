#!/usr/bin/env node
// RCL Lab V4 clean rebuild. Author the reference READY STANCE directly from the
// canonical bind skeleton. No V2/V3 pole targets, no inherited stance percentages.
import fs from 'node:fs';
const rp=process.argv[2]||'public/lab3d/motion/quaternius-rig-analysis.json',out=process.argv[3]||'public/lab3d/motion/quaternius-ready-v4.json';
const r=JSON.parse(fs.readFileSync(rp,'utf8')),J=Object.fromEntries(r.joints.filter(j=>!j.missing).map(j=>[j.name,j]));
const V=a=>Array.isArray(a)?{x:a[0],y:a[1],z:a[2]}:a,add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),mul=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k}),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,len=a=>Math.hypot(a.x,a.y,a.z),norm=a=>mul(a,1/(len(a)||1)),cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}),dist=(a,b)=>len(sub(a,b));
const P=n=>V(J[n].worldPosition),pel=P('pelvis'),hipL=P('thigh_l'),hipR=P('thigh_r'),footL=P('foot_l'),footR=P('foot_r'),shoulderL=P('upperarm_l'),shoulderR=P('upperarm_r');
const lateral=norm(sub(hipR,hipL)),up=norm(sub(P('spine_03'),pel)),forward=norm(cross(lateral,up));const floor=Math.min(footL.y,footR.y),leg=(J.thigh_l.segmentLength+J.calf_l.segmentLength+J.thigh_r.segmentLength+J.calf_r.segmentLength)/2,hipSpan=dist(hipL,hipR),shoulderSpan=dist(shoulderL,shoulderR);
// Visual reference supplied by project owner: wide symmetrical defensive/ready base,
// hips lowered, knees separated and tracking toward feet, torso centered, hands low/wide.
// Dimensionless ratios are athlete-relative and validated below; they are not claimed as universal biomechanics.
const stance=Math.max(shoulderSpan*1.55,hipSpan*2.15),pelvisDrop=leg*.16,targetPel=add(pel,add(mul(up,-pelvisDrop),mul(forward,leg*.045)));
const hipOffset=n=>sub(P(n),pel),HL=add(targetPel,hipOffset('thigh_l')),HR=add(targetPel,hipOffset('thigh_r'));
const FL=add(add({x:targetPel.x,y:floor,z:targetPel.z},mul(lateral,-stance/2)),mul(forward,leg*.025)),FR=add(add({x:targetPel.x,y:floor,z:targetPel.z},mul(lateral,stance/2)),mul(forward,leg*.025));
function solveLeg(root,end,side,l1,l2){const d=sub(end,root),D=len(d),u=norm(d),reach=Math.min(D,l1+l2-1e-5),a=(l1*l1-l2*l2+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,l1*l1-a*a));let bend=add(mul(forward,.94),mul(lateral,side*.34));bend=sub(bend,mul(u,dot(bend,u)));bend=norm(bend);return{joint:add(add(root,mul(u,a)),mul(bend,h)),end,reachable:D<=l1+l2};}
const LL=solveLeg(HL,FL,-1,J.thigh_l.segmentLength,J.calf_l.segmentLength),RR=solveLeg(HR,FR,1,J.thigh_r.segmentLength,J.calf_r.segmentLength);
const SL=add(targetPel,hipOffset('upperarm_l')),SR=add(targetPel,hipOffset('upperarm_r'));
function solveArm(root,side,l1,l2){const hand=add(add(add(targetPel,mul(lateral,side*stance*.39)),mul(up,-leg*.03)),mul(forward,leg*.24)),d=sub(hand,root),D=len(d),u=norm(d),reach=Math.min(D,l1+l2-1e-5),a=(l1*l1-l2*l2+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,l1*l1-a*a));let bend=add(mul(lateral,side*.82),mul(forward,.57));bend=norm(sub(bend,mul(u,dot(bend,u))));return{joint:add(add(root,mul(u,a)),mul(bend,h)),end:hand,reachable:D<=l1+l2};}
const AL=solveArm(SL,-1,J.upperarm_l.segmentLength,J.lowerarm_l.segmentLength),AR=solveArm(SR,1,J.upperarm_r.segmentLength,J.lowerarm_r.segmentLength);
const angle=(a,b,c)=>Math.acos(Math.max(-1,Math.min(1,dot(norm(sub(a,b)),norm(sub(c,b))))))*180/Math.PI;
const points={pelvis:targetPel,hipL:HL,hipR:HR,kneeL:LL.joint,kneeR:RR.joint,footL:FL,footR:FR,shoulderL:SL,shoulderR:SR,elbowL:AL.joint,elbowR:AR.joint,handL:AL.end,handR:AR.end};
const kneeL=angle(HL,LL.joint,FL),kneeR=angle(HR,RR.joint,FR),stanceWidth=dist(FL,FR),kneeSpan=dist(LL.joint,RR.joint);
const center=targetPel.x,fail=[];if(!LL.reachable||!RR.reachable||!AL.reachable||!AR.reachable)fail.push('unreachable');if((LL.joint.x-center)*(FL.x-center)<=0||(RR.joint.x-center)*(FR.x-center)<=0)fail.push('crossed-knee');if(kneeSpan<stanceWidth*.38)fail.push('collapsed-knee-base');if(kneeL<90||kneeL>150||kneeR<90||kneeR>150)fail.push('knee-flexion');if(Math.abs(FL.y-FR.y)>.002)fail.push('uneven-foot-floor');
const report={version:'RCL_READY_V4',reference:'owner-supplied basketball ready/defensive stance images',frame:{lateral,up,forward},points,metrics:{stanceWidth,kneeSpan,kneeL,kneeR,pelvisDrop},gate:{pass:!fail.length,failures:fail}};fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(fail.length)process.exit(1);
