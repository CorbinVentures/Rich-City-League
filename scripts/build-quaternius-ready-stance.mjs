#!/usr/bin/env node
import fs from 'node:fs';
const p=process.argv[2]||'public/lab3d/motion/quaternius-rig-analysis.json',out=process.argv[3]||'public/lab3d/motion/quaternius-ready-stance.json';
const r=JSON.parse(fs.readFileSync(p,'utf8')),J=Object.fromEntries(r.joints.filter(j=>!j.missing).map(j=>[j.name,j]));
const V=a=>({x:a[0],y:a[1],z:a[2]}),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),len=a=>Math.hypot(a.x,a.y,a.z),dist=(a,b)=>len(sub(a,b));
const pel=V(J.pelvis.worldPosition),lf=V(J.foot_l.worldPosition),rf=V(J.foot_r.worldPosition),floor=Math.min(lf.y,rf.y),pelvisHeight=pel.y-floor,bindSpan=Math.abs(lf.x-rf.x);
const stance=Math.max(bindSpan*1.18,pelvisHeight*.48),py=floor+pelvisHeight*.82,pz=pel.z+pelvisHeight*.05,targetPelvis={x:pel.x,y:py,z:pz};
const translated=n=>({x:targetPelvis.x+(J[n].worldPosition[0]-pel.x),y:targetPelvis.y+(J[n].worldPosition[1]-pel.y),z:targetPelvis.z+(J[n].worldPosition[2]-pel.z)});
const shoulderL=translated('upperarm_l'),shoulderR=translated('upperarm_r'),armReachL=J.upperarm_l.segmentLength+J.lowerarm_l.segmentLength,armReachR=J.upperarm_r.segmentLength+J.lowerarm_r.segmentLength;
const shoulderSpan=dist(shoulderL,shoulderR);
function elbowAngle(D,l1,l2){const c=(l1*l1+l2*l2-D*D)/(2*l1*l2);return Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI}
function chooseHand(sh,side,l1,l2){
 const reach=l1+l2,inner=Math.abs(l1-l2)+.01,outer=reach-.015;
 const box={xMin:Math.max(.025,shoulderSpan*.08),xMax:Math.max(.06,shoulderSpan*.42),yMin:py-pelvisHeight*.06,yMax:py+pelvisHeight*.10,zMin:pz+pelvisHeight*.10,zMax:pz+pelvisHeight*.28};
 let best=null;
 for(let ix=0;ix<=10;ix++)for(let iy=0;iy<=8;iy++)for(let iz=0;iz<=10;iz++){
  const mag=box.xMin+(box.xMax-box.xMin)*ix/10,c={x:side*mag,y:box.yMin+(box.yMax-box.yMin)*iy/8,z:box.zMin+(box.zMax-box.zMin)*iz/10};
  const D=dist(sh,c);if(D<inner||D>outer)continue;
  const ea=elbowAngle(D,l1,l2);if(ea<70||ea>145)continue;
  const score=Math.abs(ea-105)*.02+Math.abs(c.y-py)+Math.abs(c.z-(box.zMin+box.zMax)/2)*.35+Math.abs(mag-shoulderSpan*.24)*.25;
  if(!best||score<best.score)best={point:c,score,distance:D,elbowAngleDeg:ea,box};
 }
 if(!best)throw new Error('No intersection between basketball ready pocket and arm reachable set');
 return best;
}
const left=chooseHand(shoulderL,1,J.upperarm_l.segmentLength,J.lowerarm_l.segmentLength),right=chooseHand(shoulderR,-1,J.upperarm_r.segmentLength,J.lowerarm_r.segmentLength);
const target={pelvis:targetPelvis,leftFoot:{x:pel.x-stance/2,y:lf.y,z:lf.z},rightFoot:{x:pel.x+stance/2,y:rf.y,z:rf.z},leftKneePole:{x:pel.x-stance*.42,y:floor+pelvisHeight*.42,z:pz+pelvisHeight*.32},rightKneePole:{x:pel.x+stance*.42,y:floor+pelvisHeight*.42,z:pz+pelvisHeight*.32},leftHand:left.point,rightHand:right.point,leftElbowPole:{x:shoulderL.x+shoulderSpan*.18,y:py+pelvisHeight*.08,z:pz+pelvisHeight*.34},rightElbowPole:{x:shoulderR.x-shoulderSpan*.18,y:py+pelvisHeight*.08,z:pz+pelvisHeight*.34}};
const measured={pelvisHeight,bindFootSpan:bindSpan,targetStanceWidth:stance,shoulderSpan,armReachL,armReachR,leftShoulderToHand:left.distance,rightShoulderToHand:right.distance,leftPredictedElbowAngle:left.elbowAngleDeg,rightPredictedElbowAngle:right.elbowAngleDeg,readyPocket:left.box};
const gate={pelvisLoaded:py<pel.y,pocketReachIntersection:true,kneesForward:target.leftKneePole.z>pz&&target.rightKneePole.z>pz,stanceWiderThanBind:stance>=bindSpan,leftHandReachable:left.distance<armReachL,rightHandReachable:right.distance<armReachR};
const report={source:p,measured,target,gate};fs.writeFileSync(out,JSON.stringify(report,null,2));const failed=Object.entries(gate).filter(([,x])=>!x).map(([k])=>k);if(failed.length){console.error('READY STANCE REJECTED',failed);process.exit(1)}console.log('READY STANCE TARGET PASSED',measured);
