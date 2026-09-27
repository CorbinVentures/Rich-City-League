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
const stance=Math.max(shoulderSpan*1.32,hipSpan*1.85),pelvisDrop=leg*.13;
// Sagittal correction: sit the pelvis BACK in the stance. The previous negative
// forward offset drove the hips toward the knees and produced the backwards-bent
// side silhouette. `forward` is the calibrated athlete-facing axis.
const pelvisSitBack=leg*.085,targetPel=add(pel,add(mul(up,-pelvisDrop),mul(forward,pelvisSitBack)));
const hipOffset=n=>sub(P(n),pel),HL=add(targetPel,hipOffset('thigh_l')),HR=add(targetPel,hipOffset('thigh_r'));
// Feet stay under the base while the knees advance in the athlete-facing direction.
// Do not move the feet forward with the pelvis: that erases ankle dorsiflexion.
const footForward=-leg*.055;
const FL=add(add({x:targetPel.x,y:floor,z:targetPel.z},mul(lateral,-stance/2)),mul(forward,footForward)),FR=add(add({x:targetPel.x,y:floor,z:targetPel.z},mul(lateral,stance/2)),mul(forward,footForward));
function solveLeg(root,end,side,l1,l2){
 const d=sub(end,root),D=len(d),u=norm(d),reach=Math.min(D,l1+l2-1e-5),a=(l1*l1-l2*l2+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,l1*l1-a*a));
 // Blueprint: knees advance toward toes with only a small outward component.
 // This avoids the exaggerated bowed-femur V silhouette from V4.
 // The Quaternius rig's anatomical knee flexion is opposite the cross-product
 // frame direction used by the previous solver. Use the anatomical sagittal pole
 // explicitly so the knee joint moves toward the toes rather than behind the hip.
 let bend=add(mul(forward,-1.0),mul(lateral,side*.12));bend=sub(bend,mul(u,dot(bend,u)));bend=norm(bend);
 return{joint:add(add(root,mul(u,a)),mul(bend,h)),end,reachable:D<=l1+l2};
}
const LL=solveLeg(HL,FL,-1,J.thigh_l.segmentLength,J.calf_l.segmentLength),RR=solveLeg(HR,FR,1,J.thigh_r.segmentLength,J.calf_r.segmentLength);
// Reference-matched upper body: shoulders travel slightly forward/down with the
// athletic hip hinge; hands occupy a low/wide defensive pocket outside the thighs.
const torsoForward=leg*.145,torsoDrop=leg*.035;
const SL=add(add(add(targetPel,hipOffset('upperarm_l')),mul(forward,torsoForward)),mul(up,-torsoDrop)),
      SR=add(add(add(targetPel,hipOffset('upperarm_r')),mul(forward,torsoForward)),mul(up,-torsoDrop));
function solveArm(root,side,l1,l2){const hand=add(add(add(targetPel,mul(lateral,side*stance*.50)),mul(up,leg*.09)),mul(forward,-leg*.12)),d=sub(hand,root),D=len(d),u=norm(d),reach=Math.min(D,l1+l2-1e-5),a=(l1*l1-l2*l2+reach*reach)/(2*reach),h=Math.sqrt(Math.max(0,l1*l1-a*a));let bend=add(mul(lateral,side*.72),mul(forward,-.55));bend=norm(sub(bend,mul(u,dot(bend,u))));return{joint:add(add(root,mul(u,a)),mul(bend,h)),end:hand,reachable:D<=l1+l2};}
const AL=solveArm(SL,-1,J.upperarm_l.segmentLength,J.lowerarm_l.segmentLength),AR=solveArm(SR,1,J.upperarm_r.segmentLength,J.lowerarm_r.segmentLength);
const angle=(a,b,c)=>Math.acos(Math.max(-1,Math.min(1,dot(norm(sub(a,b)),norm(sub(c,b))))))*180/Math.PI;
const torso={shoulderForward:torsoForward,shoulderDrop:torsoDrop};
const points={pelvis:targetPel,hipL:HL,hipR:HR,kneeL:LL.joint,kneeR:RR.joint,footL:FL,footR:FR,shoulderL:SL,shoulderR:SR,elbowL:AL.joint,elbowR:AR.joint,handL:AL.end,handR:AR.end};
const kneeL=angle(HL,LL.joint,FL),kneeR=angle(HR,RR.joint,FR),stanceWidth=dist(FL,FR),kneeSpan=dist(LL.joint,RR.joint);
// Side-view biomechanics gate. Knees must be forward of ankles while the pelvis
// remains behind the knees. This catches the exact backwards-knee failure that
// front/back-only validation missed.
// Anatomical forward is opposite `frame.forward` for this asset. Validate in that
// signed frame so a mathematically passing pose cannot still bend the knees backward.
const anatomicalForward=mul(forward,-1),fproj=p=>dot(p,anatomicalForward),kneeAdvanceL=fproj(LL.joint)-fproj(FL),kneeAdvanceR=fproj(RR.joint)-fproj(FR),hipBehindKneeL=fproj(LL.joint)-fproj(HL),hipBehindKneeR=fproj(RR.joint)-fproj(HR);
const center=targetPel.x,fail=[];if(!LL.reachable||!RR.reachable||!AL.reachable||!AR.reachable)fail.push('unreachable');if((LL.joint.x-center)*(FL.x-center)<=0||(RR.joint.x-center)*(FR.x-center)<=0)fail.push('crossed-knee');if(kneeSpan<stanceWidth*.38)fail.push('collapsed-knee-base');if(kneeL<90||kneeL>150||kneeR<90||kneeR>150)fail.push('knee-flexion');if(Math.abs(FL.y-FR.y)>.002)fail.push('uneven-foot-floor');if(dist(AL.end,AR.end)<dist(SL,SR)*1.25)fail.push('hands-not-wide-enough');const handFrontL=dot(sub(AL.end,SL),anatomicalForward),handFrontR=dot(sub(AR.end,SR),anatomicalForward);if(Math.min(handFrontL,handFrontR)<leg*.08)fail.push('hands-not-forward-enough');if(Math.min(kneeAdvanceL,kneeAdvanceR)<leg*.035)fail.push('side-knees-not-forward-of-ankles');if(Math.min(hipBehindKneeL,hipBehindKneeR)<leg*.025)fail.push('side-hips-not-behind-knees');
const report={version:'RCL_READY_V5_BLUEPRINT',reference:'approved Athletic Stance Blueprint V1.0: hips back, knees tracking over toes, moderate wide base, forward active hands',frame:{lateral,up,forward},points,metrics:{stanceWidth,kneeSpan,kneeL,kneeR,pelvisDrop,handSpan:dist(AL.end,AR.end),shoulderSpan:dist(SL,SR),torsoForward,torsoDrop,pelvisSitBack,kneeAdvanceL,kneeAdvanceR,hipBehindKneeL,hipBehindKneeR,handFrontL,handFrontR},gate:{pass:!fail.length,failures:fail}};fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(fail.length)process.exit(1);
