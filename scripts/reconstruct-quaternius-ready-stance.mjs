#!/usr/bin/env node
import fs from 'node:fs';
const rp=process.argv[2]||'public/lab3d/motion/quaternius-rig-analysis.json',sp=process.argv[3]||'public/lab3d/motion/quaternius-ready-v4.json',out=process.argv[4]||'public/lab3d/motion/quaternius-ready-v4-reconstruction.json';
const r=JSON.parse(fs.readFileSync(rp,'utf8')),s=JSON.parse(fs.readFileSync(sp,'utf8'));if(!r.allNodes)throw new Error('Rig report missing allNodes');
const N=r.allNodes,by=Object.fromEntries(N.map((n,i)=>[n.name,i])),P=s.points;
const V=a=>Array.isArray(a)?{x:a[0],y:a[1],z:a[2]}:a,A=a=>[a.x,a.y,a.z],sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),mul=(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k}),len=a=>Math.hypot(a.x,a.y,a.z),norm=a=>{const l=len(a)||1;return{x:a.x/l,y:a.y/l,z:a.z/l}},dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const qn=q=>{const n=Math.hypot(...q)||1;return q.map(x=>x/n)},qm=(a,b)=>qn([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]),qc=q=>[-q[0],-q[1],-q[2],q[3]];
const rot=(q,v)=>{const [x,y,z,w]=q,tx=2*(y*v.z-z*v.y),ty=2*(z*v.x-x*v.z),tz=2*(x*v.y-y*v.x);return{x:v.x+w*tx+(y*tz-z*ty),y:v.y+w*ty+(z*tx-x*tz),z:v.z+w*tz+(x*ty-y*tx)}};
function qBasis(primary,secondary){
 const x=norm(primary),s=sub(secondary,{x:x.x*dot(secondary,x),y:x.y*dot(secondary,x),z:x.z*dot(secondary,x)}),y=norm(s),z=norm(cross(x,y));
 const m00=x.x,m01=y.x,m02=z.x,m10=x.y,m11=y.y,m12=z.y,m20=x.z,m21=y.z,m22=z.z,tr=m00+m11+m22;let q;
 if(tr>0){const S=Math.sqrt(tr+1)*2;q=[(m21-m12)/S,(m02-m20)/S,(m10-m01)/S,.25*S]}
 else if(m00>m11&&m00>m22){const S=Math.sqrt(1+m00-m11-m22)*2;q=[.25*S,(m01+m10)/S,(m02+m20)/S,(m21-m12)/S]}
 else if(m11>m22){const S=Math.sqrt(1+m11-m00-m22)*2;q=[(m01+m10)/S,.25*S,(m12+m21)/S,(m02-m20)/S]}
 else{const S=Math.sqrt(1+m22-m00-m11)*2;q=[(m02+m20)/S,(m12+m21)/S,.25*S,(m10-m01)/S]}return qn(q)
}
function qFromTo(a,b){const u=norm(a),v=norm(b),d=Math.max(-1,Math.min(1,dot(u,v)));if(d>.999999)return[0,0,0,1];if(d<-.999999){let ax=norm(cross(u,Math.abs(u.x)<.8?{x:1,y:0,z:0}:{x:0,y:1,z:0}));return[ax.x,ax.y,ax.z,0]}const c=cross(u,v),ss=Math.sqrt((1+d)*2);return qn([c.x/ss,c.y/ss,c.z/ss,ss/2])}
const localQ=N.map(n=>n.localRotation||[0,0,0,1]),localT=N.map(n=>n.localTranslation||[0,0,0]),worldQ=[],worldP=[];
const bodyForward=V(s.frame.forward),bodyUp=V(s.frame.up),bodyLateral=V(s.frame.lateral);
const desired={thigh_l:sub(P.kneeL,P.hipL),calf_l:sub(P.footL,P.kneeL),thigh_r:sub(P.kneeR,P.hipR),calf_r:sub(P.footR,P.kneeR),upperarm_l:sub(P.elbowL,P.shoulderL),lowerarm_l:sub(P.handL,P.elbowL),upperarm_r:sub(P.elbowR,P.shoulderR),lowerarm_r:sub(P.handR,P.elbowR)};
let lockSolvedArms=false;
const chainPlane={thigh_l:norm(cross(sub(P.kneeL,P.hipL),sub(P.footL,P.kneeL))),calf_l:norm(cross(sub(P.kneeL,P.hipL),sub(P.footL,P.kneeL))),thigh_r:norm(cross(sub(P.kneeR,P.hipR),sub(P.footR,P.kneeR))),calf_r:norm(cross(sub(P.kneeR,P.hipR),sub(P.footR,P.kneeR))),upperarm_l:norm(cross(sub(P.elbowL,P.shoulderL),sub(P.handL,P.elbowL))),lowerarm_l:norm(cross(sub(P.elbowL,P.shoulderL),sub(P.handL,P.elbowL))),upperarm_r:norm(cross(sub(P.elbowR,P.shoulderR),sub(P.handR,P.elbowR))),lowerarm_r:norm(cross(sub(P.elbowR,P.shoulderR),sub(P.handR,P.elbowR)))};
const bind=Object.fromEntries(r.joints.filter(j=>!j.missing).map(j=>[j.name,j]));
function solve(i){const n=N[i],pi=n.parentIndex;if(pi!==null)solve(pi);const parentQ=pi===null?[0,0,0,1]:worldQ[pi],parentP=pi===null?{x:0,y:0,z:0}:worldP[pi];
 if(desired[n.name]){const b=bind[n.name];const bindPrimary=V(b.primaryWorldAxis),targetPrimary=norm(desired[n.name]);
  // Calibrated two-axis frame: primary controls endpoint; bend-plane normal controls twist.
  // This removes the unconstrained axial twist left by swing-only reconstruction.
  // Preserve anatomical facing around the limb axis. Bend-plane normals are not
  // valid twist references for a skinned humanoid and caused the V4 thigh bulges.
  // Project the calibrated body-forward vector into each bone's normal plane.
  let bindSecondary=sub(bodyForward,{x:bindPrimary.x*dot(bodyForward,bindPrimary),y:bindPrimary.y*dot(bodyForward,bindPrimary),z:bindPrimary.z*dot(bodyForward,bindPrimary)});
  if(len(bindSecondary)<1e-5)bindSecondary=sub(bodyLateral,{x:bindPrimary.x*dot(bodyLateral,bindPrimary),y:bindPrimary.y*dot(bodyLateral,bindPrimary),z:bindPrimary.z*dot(bodyLateral,bindPrimary)});
  bindSecondary=norm(bindSecondary);
  let targetSecondary=sub(bodyForward,{x:targetPrimary.x*dot(bodyForward,targetPrimary),y:targetPrimary.y*dot(bodyForward,targetPrimary),z:targetPrimary.z*dot(bodyForward,targetPrimary)});
  if(len(targetSecondary)<1e-5)targetSecondary=sub(bodyLateral,{x:targetPrimary.x*dot(bodyLateral,targetPrimary),y:targetPrimary.y*dot(bodyLateral,targetPrimary),z:targetPrimary.z*dot(bodyLateral,targetPrimary)});
  targetSecondary=norm(targetSecondary);
  const bindFrame=qBasis(bindPrimary,bindSecondary),targetFrame=qBasis(targetPrimary,targetSecondary),delta=qm(targetFrame,qc(bindFrame));
  const desiredWorld=qm(delta,b.worldRotation);localQ[i]=qm(qc(parentQ),desiredWorld)}
 // Feet must stay planted in their calibrated bind-world orientation instead of
 // inheriting the calf swing (the prior build visibly balanced on heel/edge).
 if(n.name==='foot_l'||n.name==='foot_r'){localQ[i]=qm(qc(parentQ),bind[n.name].worldRotation)}
 worldQ[i]=qm(parentQ,localQ[i]);const t=V(localT[i]);worldP[i]=pi===null?t:{x:parentP.x+rot(parentQ,t).x,y:parentP.y+rot(parentQ,t).y,z:parentP.z+rot(parentQ,t).z};
}
// Athletic trunk hinge. Rotate the spine chain forward around the calibrated
// lateral axis while preserving the lower-body solution. Distribution avoids a
// single-bone kink and keeps the head/chest readable.
const qAxis=(axis,ang)=>{const a=norm(axis),h=ang/2,s=Math.sin(h);return[a.x*s,a.y*s,a.z*s,Math.cos(h)]};
const trunkHingeDeg=10,spineWeights={spine_01:.45,spine_02:.35,spine_03:.20};
for(const [name,w] of Object.entries(spineWeights)){const i=by[name];if(i!==undefined)localQ[i]=qm(qAxis(bodyLateral,-trunkHingeDeg*Math.PI/180*w),localQ[i])}
// Apply the solved pelvis translation before re-solving the arms so their world
// targets and shoulder roots are expressed in the same task-space frame.
const pelvisI=by.pelvis,pelvisParent=N[pelvisI].parentIndex,deltaWorld=sub(P.pelvis,V(N[pelvisI].worldPosition));
const parentBindQ=pelvisParent===null?[0,0,0,1]:N[pelvisParent].worldRotation;
const deltaLocal=rot(qc(parentBindQ),deltaWorld);
localT[pelvisI]=[localT[pelvisI][0]+deltaLocal.x,localT[pelvisI][1]+deltaLocal.y,localT[pelvisI][2]+deltaLocal.z];
// The hinge changes the shoulder parent frames. Reconstruct once, then solve
// a fresh two-bone arm IK from the ACTUAL hinged shoulder roots. The authored
// pre-hinge elbow is not a valid endpoint after its parent chain moves.
worldQ.length=0;worldP.length=0;for(let i=0;i<N.length;i++)solve(i);
const armLengths={l:[bind.upperarm_l.segmentLength,bind.lowerarm_l.segmentLength],r:[bind.upperarm_r.segmentLength,bind.lowerarm_r.segmentLength]};
const armTargets={};
for(const side of ['l','r']){
  const upper='upperarm_'+side,handKey='hand'+side.toUpperCase(),elbowKey='elbow'+side.toUpperCase();
  const root=worldP[by[upper]],authoredHand=P[handKey],[l1,l2]=armLengths[side],raw=sub(authoredHand,root),rawD=len(raw),maxReach=l1+l2,reachMargin=.012;
  // The torso hinge changes the real shoulder root. Preserve the authored low/wide
  // hand direction, but derive the final task target from that post-hinge root and
  // the measured arm envelope instead of asking the skeleton to overextend.
  const solvedD=Math.min(rawD,maxReach-reachMargin),u=norm(raw),hand={x:root.x+u.x*solvedD,y:root.y+u.y*solvedD,z:root.z+u.z*solvedD};
  const a=(l1*l1-l2*l2+solvedD*solvedD)/(2*solvedD),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  let pole=sub(P[elbowKey],root);pole=sub(pole,mul(u,dot(pole,u)));if(len(pole)<1e-5)pole=sub(bodyLateral,mul(u,dot(bodyLateral,u)));pole=norm(pole);
  armTargets[side]={elbow:{x:root.x+u.x*a+pole.x*h,y:root.y+u.y*a+pole.y*h,z:root.z+u.z*a+pole.z*h},hand,rawD,solvedD,maxReach};
}
// From this point forward every hierarchy reconstruction must use the post-hinge
// arm vectors. Otherwise solve() silently overwrites the IK result with stale
// pre-hinge V4 arm directions.
for(const side of ['l','r']){
  desired['upperarm_'+side]=sub(armTargets[side].elbow,worldP[by['upperarm_'+side]]);
  desired['lowerarm_'+side]=sub(armTargets[side].hand,armTargets[side].elbow);
}
lockSolvedArms=true;
// Reconstruct through the single authoritative hierarchy solver using the
// post-hinge IK directions.
// Recompute hierarchy after the hinge, pelvis translation, and arm re-solve.
worldQ.length=0;worldP.length=0;for(let i=0;i<N.length;i++)solve(i);
const rootTranslationError=len(sub(worldP[pelvisI],P.pelvis));
const gp=n=>worldP[by[n]],dist=(a,b)=>len(sub(a,b)),floor=Math.min(P.footL.y,P.footR.y);
const metrics={rootTranslationError,leftHandError:dist(gp('hand_l'),armTargets.l.hand),rightHandError:dist(gp('hand_r'),armTargets.r.hand),leftFootError:dist(gp('foot_l'),P.footL),rightFootError:dist(gp('foot_r'),P.footR),leftKneeError:dist(gp('calf_l'),P.kneeL),rightKneeError:dist(gp('calf_r'),P.kneeR),leftElbowError:dist(gp('lowerarm_l'),armTargets.l.elbow),rightElbowError:dist(gp('lowerarm_r'),armTargets.r.elbow),leftKneeClearance:gp('calf_l').y-floor,rightKneeClearance:gp('calf_r').y-floor};
const cx=P.pelvis.x,actualKneeL=gp('calf_l'),actualKneeR=gp('calf_r'),actualFootL=gp('foot_l'),actualFootR=gp('foot_r');
metrics.bakedKneeSpan=Math.abs(actualKneeL.x-actualKneeR.x);metrics.bakedStanceWidth=Math.abs(actualFootL.x-actualFootR.x);
metrics.bakedLeftIpsilateral=(actualKneeL.x-cx)*(actualFootL.x-cx)>0;metrics.bakedRightIpsilateral=(actualKneeR.x-cx)*(actualFootR.x-cx)>0;metrics.bakedKneesSeparated=(actualKneeL.x-cx)*(actualKneeR.x-cx)<0;
const failures=[];if(!metrics.bakedLeftIpsilateral||!metrics.bakedRightIpsilateral||!metrics.bakedKneesSeparated)failures.push('baked-knee-centerline-cross');if(metrics.bakedKneeSpan<metrics.bakedStanceWidth*.28)failures.push('baked-knee-base-too-narrow');
metrics.bakedLeftKneeFootDx=Math.abs(actualKneeL.x-actualFootL.x);metrics.bakedRightKneeFootDx=Math.abs(actualKneeR.x-actualFootR.x);
if(metrics.bakedLeftKneeFootDx>metrics.bakedStanceWidth*.38||metrics.bakedRightKneeFootDx>metrics.bakedStanceWidth*.38)failures.push('baked-knee-foot-tracking');if(metrics.rootTranslationError>.001)failures.push('root-space-translation');if(Math.max(metrics.leftHandError,metrics.rightHandError)>.04)failures.push('reconstructed-hand-error');if(Math.max(metrics.leftFootError,metrics.rightFootError)>.04)failures.push('reconstructed-foot-error');if(Math.min(metrics.leftKneeClearance,metrics.rightKneeClearance)<.18)failures.push('reconstructed-knee-floor');
// Orientation/deformation gates: feet must preserve their calibrated bind-world
// orientation and limb frames must remain finite/unit after reconstruction.
const qdot=(a,b)=>Math.abs(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]);
metrics.leftFootWorldOrientationErrorDeg=2*Math.acos(Math.min(1,qdot(worldQ[by.foot_l],bind.foot_l.worldRotation)))*180/Math.PI;
metrics.rightFootWorldOrientationErrorDeg=2*Math.acos(Math.min(1,qdot(worldQ[by.foot_r],bind.foot_r.worldRotation)))*180/Math.PI;
if(Math.max(metrics.leftFootWorldOrientationErrorDeg,metrics.rightFootWorldOrientationErrorDeg)>.25)failures.push('foot-world-orientation');
for(const n of [...Object.keys(desired),'foot_l','foot_r'])if(localQ[by[n]].some(v=>!Number.isFinite(v)))failures.push('nonfinite-orientation-'+n);
metrics.trunkHingeDeg=trunkHingeDeg;metrics.leftArmAuthoredReach=armTargets.l.rawD;metrics.rightArmAuthoredReach=armTargets.r.rawD;metrics.leftArmSolvedReach=armTargets.l.solvedD;metrics.rightArmSolvedReach=armTargets.r.solvedD;metrics.leftArmMaxReach=armTargets.l.maxReach;metrics.rightArmMaxReach=armTargets.r.maxReach;
if(trunkHingeDeg<7||trunkHingeDeg>15)failures.push('trunk-hinge-envelope');
const report={sourceRig:rp,sourceSolve:sp,pelvisLocalTranslation:localT[pelvisI],pelvisParentWorld:pelvisParent===null?null:N[pelvisParent].worldRotation,metrics,gate:{pass:!failures.length,failures},localRotations:Object.fromEntries([...Object.keys(desired),'foot_l','foot_r','spine_01','spine_02','spine_03'].map(n=>[n,localQ[by[n]]])),worldPoints:{pelvis:A(gp('pelvis')),kneeL:A(gp('calf_l')),kneeR:A(gp('calf_r')),footL:A(gp('foot_l')),footR:A(gp('foot_r')),elbowL:A(gp('lowerarm_l')),elbowR:A(gp('lowerarm_r')),handL:A(gp('hand_l')),handR:A(gp('hand_r'))}};
fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
