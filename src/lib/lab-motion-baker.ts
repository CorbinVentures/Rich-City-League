import {solveTwoBone,type V3} from './lab-motion-ik';
import {localRotationForDirection,qMul,rotate,type BindJoint,type Q} from './lab-rig-basis';

export type RigMap={
 pelvis:BindJoint;spine01:BindJoint;spine02:BindJoint;spine03:BindJoint;
 thighL:BindJoint;calfL:BindJoint;footL:BindJoint;thighR:BindJoint;calfR:BindJoint;footR:BindJoint;
 upperArmL:BindJoint;lowerArmL:BindJoint;handL:BindJoint;upperArmR:BindJoint;lowerArmR:BindJoint;handR:BindJoint;
};
export type FrameTarget={
 pelvis:V3,leftFoot:V3,rightFoot:V3,leftKneePole:V3,rightKneePole:V3,
 leftHand:V3,rightHand:V3,leftElbowPole:V3,rightElbowPole:V3,headTarget:V3
};
export type SolvedFrame={localRotations:Record<string,Q>;points:Record<string,V3>};

const sub=(a:V3,b:V3):V3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const len=(v:V3)=>Math.hypot(v.x,v.y,v.z);

/**
 * Whole-frame basketball solve. Feet and pelvis establish the lower body first;
 * hands are solved second so the ball-contact chain cannot pull the stance apart.
 * Bind-basis conversion is isolated here so the browser never guesses bone axes.
 */
export function solveBasketballFrame(rig:RigMap,t:FrameTarget,lengths:Record<string,number>):SolvedFrame{
 const out:Record<string,Q>={};const points:Record<string,V3>={pelvis:t.pelvis};
 const hipL={x:t.pelvis.x-.12,y:t.pelvis.y,z:t.pelvis.z},hipR={x:t.pelvis.x+.12,y:t.pelvis.y,z:t.pelvis.z};
 const legL=solveTwoBone(hipL,t.leftFoot,t.leftKneePole,lengths.thighL,lengths.calfL);
 const legR=solveTwoBone(hipR,t.rightFoot,t.rightKneePole,lengths.thighR,lengths.calfR);
 points.kneeL=legL.joint;points.kneeR=legR.joint;points.footL=legL.end;points.footR=legR.end;
 const I:Q=[0,0,0,1];
 out[rig.thighL.name]=localRotationForDirection(rig.thighL,I,sub(legL.joint,hipL));
 out[rig.thighR.name]=localRotationForDirection(rig.thighR,I,sub(legR.joint,hipR));
 const thighLW=qMul(I,out[rig.thighL.name]),thighRW=qMul(I,out[rig.thighR.name]);
 out[rig.calfL.name]=localRotationForDirection(rig.calfL,thighLW,sub(legL.end,legL.joint));
 out[rig.calfR.name]=localRotationForDirection(rig.calfR,thighRW,sub(legR.end,legR.joint));

 const shoulderY=t.pelvis.y+.54,shoulderZ=t.pelvis.z+.03;
 const shoulderL={x:t.pelvis.x-.22,y:shoulderY,z:shoulderZ},shoulderR={x:t.pelvis.x+.22,y:shoulderY,z:shoulderZ};
 const armL=solveTwoBone(shoulderL,t.leftHand,t.leftElbowPole,lengths.upperArmL,lengths.lowerArmL);
 const armR=solveTwoBone(shoulderR,t.rightHand,t.rightElbowPole,lengths.upperArmR,lengths.lowerArmR);
 points.elbowL=armL.joint;points.elbowR=armR.joint;points.handL=armL.end;points.handR=armR.end;
 out[rig.upperArmL.name]=localRotationForDirection(rig.upperArmL,I,sub(armL.joint,shoulderL));
 out[rig.upperArmR.name]=localRotationForDirection(rig.upperArmR,I,sub(armR.joint,shoulderR));
 const armLW=qMul(I,out[rig.upperArmL.name]),armRW=qMul(I,out[rig.upperArmR.name]);
 out[rig.lowerArmL.name]=localRotationForDirection(rig.lowerArmL,armLW,sub(armL.end,armL.joint));
 out[rig.lowerArmR.name]=localRotationForDirection(rig.lowerArmR,armRW,sub(armR.end,armR.joint));

 if(!legL.reachable||!legR.reachable||!armL.reachable||!armR.reachable)points.unreachable={x:1,y:0,z:0};
 if(len(sub(t.leftFoot,legL.end))>.03||len(sub(t.rightFoot,legR.end))>.03)points.footError={x:1,y:0,z:0};
 return {localRotations:out,points};
}
