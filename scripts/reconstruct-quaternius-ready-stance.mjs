#!/usr/bin/env node
import fs from 'node:fs';
const rp=process.argv[2]||'public/lab3d/motion/quaternius-rig-analysis.json',sp=process.argv[3]||'public/lab3d/motion/quaternius-ready-solve.json',out=process.argv[4]||'public/lab3d/motion/quaternius-ready-reconstruction.json';
const r=JSON.parse(fs.readFileSync(rp,'utf8')),s=JSON.parse(fs.readFileSync(sp,'utf8'));if(!r.allNodes)throw new Error('Rig report missing allNodes');
const N=r.allNodes,by=Object.fromEntries(N.map((n,i)=>[n.name,i])),P=s.points;
const V=a=>Array.isArray(a)?{x:a[0],y:a[1],z:a[2]}:a,A=a=>[a.x,a.y,a.z],sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),len=a=>Math.hypot(a.x,a.y,a.z),norm=a=>{const l=len(a)||1;return{x:a.x/l,y:a.y/l,z:a.z/l}},dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const qn=q=>{const n=Math.hypot(...q)||1;return q.map(x=>x/n)},qm=(a,b)=>qn([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]),qc=q=>[-q[0],-q[1],-q[2],q[3]];
const rot=(q,v)=>{const [x,y,z,w]=q,tx=2*(y*v.z-z*v.y),ty=2*(z*v.x-x*v.z),tz=2*(x*v.y-y*v.x);return{x:v.x+w*tx+(y*tz-z*ty),y:v.y+w*ty+(z*tx-x*tz),z:v.z+w*tz+(x*ty-y*tx)}};
function qFromTo(a,b){const u=norm(a),v=norm(b),d=Math.max(-1,Math.min(1,dot(u,v)));if(d>.999999)return[0,0,0,1];if(d<-.999999){let ax=norm(cross(u,Math.abs(u.x)<.8?{x:1,y:0,z:0}:{x:0,y:1,z:0}));return[ax.x,ax.y,ax.z,0]}const c=cross(u,v),ss=Math.sqrt((1+d)*2);return qn([c.x/ss,c.y/ss,c.z/ss,ss/2])}
const localQ=N.map(n=>n.localRotation||[0,0,0,1]),localT=N.map(n=>n.localTranslation||[0,0,0]),worldQ=[],worldP=[];
const desired={thigh_l:sub(P.kneeL,P.hipL),calf_l:sub(P.footL,P.kneeL),thigh_r:sub(P.kneeR,P.hipR),calf_r:sub(P.footR,P.kneeR),upperarm_l:sub(P.elbowL,P.shoulderL),lowerarm_l:sub(P.handL,P.elbowL),upperarm_r:sub(P.elbowR,P.shoulderR),lowerarm_r:sub(P.handR,P.elbowR)};
const bind=Object.fromEntries(r.joints.filter(j=>!j.missing).map(j=>[j.name,j]));
function solve(i){const n=N[i],pi=n.parentIndex;if(pi!==null)solve(pi);const parentQ=pi===null?[0,0,0,1]:worldQ[pi],parentP=pi===null?{x:0,y:0,z:0}:worldP[pi];
 if(desired[n.name]){const b=bind[n.name];const swing=qFromTo(V(b.primaryWorldAxis),norm(desired[n.name]));const desiredWorld=qm(swing,b.worldRotation);localQ[i]=qm(qc(parentQ),desiredWorld)}
 worldQ[i]=qm(parentQ,localQ[i]);const t=V(localT[i]);worldP[i]=pi===null?t:{x:parentP.x+rot(parentQ,t).x,y:parentP.y+rot(parentQ,t).y,z:parentP.z+rot(parentQ,t).z};
}
const pelvisI=by.pelvis,delta=sub(P.pelvis,V(N[pelvisI].worldPosition));localT[pelvisI]=[localT[pelvisI][0]+delta.x,localT[pelvisI][1]+delta.y,localT[pelvisI][2]+delta.z];for(let i=0;i<N.length;i++)solve(i);
const gp=n=>worldP[by[n]],dist=(a,b)=>len(sub(a,b)),floor=Math.min(P.footL.y,P.footR.y);
const metrics={leftHandError:dist(gp('hand_l'),P.handL),rightHandError:dist(gp('hand_r'),P.handR),leftFootError:dist(gp('foot_l'),P.footL),rightFootError:dist(gp('foot_r'),P.footR),leftKneeError:dist(gp('calf_l'),P.kneeL),rightKneeError:dist(gp('calf_r'),P.kneeR),leftElbowError:dist(gp('lowerarm_l'),P.elbowL),rightElbowError:dist(gp('lowerarm_r'),P.elbowR),leftKneeClearance:gp('calf_l').y-floor,rightKneeClearance:gp('calf_r').y-floor};
const failures=[];if(Math.max(metrics.leftHandError,metrics.rightHandError)>.04)failures.push('reconstructed-hand-error');if(Math.max(metrics.leftFootError,metrics.rightFootError)>.04)failures.push('reconstructed-foot-error');if(Math.min(metrics.leftKneeClearance,metrics.rightKneeClearance)<.18)failures.push('reconstructed-knee-floor');
const report={sourceRig:rp,sourceSolve:sp,metrics,gate:{pass:!failures.length,failures},localRotations:Object.fromEntries(Object.keys(desired).map(n=>[n,localQ[by[n]]])),worldPoints:{pelvis:A(gp('pelvis')),kneeL:A(gp('calf_l')),kneeR:A(gp('calf_r')),footL:A(gp('foot_l')),footR:A(gp('foot_r')),elbowL:A(gp('lowerarm_l')),elbowR:A(gp('lowerarm_r')),handL:A(gp('hand_l')),handR:A(gp('hand_r'))}};
fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(failures.length)process.exit(1);
