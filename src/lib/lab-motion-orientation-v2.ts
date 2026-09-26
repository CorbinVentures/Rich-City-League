import type {V3,Q,RigAnalysis} from './lab-rig-analysis';
const qn=(q:Q):Q=>{const n=Math.hypot(...q)||1;return q.map(v=>v/n) as Q};export const qConj=(q:Q):Q=>[-q[0],-q[1],-q[2],q[3]];
export const qMul=(a:Q,b:Q):Q=>qn([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]);
const dot=(a:V3,b:V3)=>a.x*b.x+a.y*b.y+a.z*b.z,cross=(a:V3,b:V3):V3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}),norm=(v:V3):V3=>{const n=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/n,y:v.y/n,z:v.z/n}};
export function qFromTo(a:V3,b:V3):Q{const u=norm(a),v=norm(b),d=Math.max(-1,Math.min(1,dot(u,v)));if(d>1-1e-8)return[0,0,0,1];if(d<-1+1e-8){let ax=cross(u,Math.abs(u.x)<.8?{x:1,y:0,z:0}:{x:0,y:1,z:0});ax=norm(ax);return[ax.x,ax.y,ax.z,0]}const c=cross(u,v),s=Math.sqrt((1+d)*2);return qn([c.x/s,c.y/s,c.z/s,s/2])}
export function rotate(q:Q,v:V3):V3{const x=q[0],y=q[1],z=q[2],w=q[3],tx=2*(y*v.z-z*v.y),ty=2*(z*v.x-x*v.z),tz=2*(x*v.y-y*v.x);return{x:v.x+w*tx+(y*tz-z*ty),y:v.y+w*ty+(z*tx-x*tz),z:v.z+w*tz+(x*ty-y*tx)}}
export function localFromWorld(parentWorld:Q,desiredWorld:Q):Q{return qMul(qConj(parentWorld),desiredWorld)}
export function aimBoneWorld(bindWorld:Q,bindDirection:V3,desiredDirection:V3,poleNormal?:V3):Q{
 let out=qMul(qFromTo(bindDirection,desiredDirection),bindWorld);
 if(poleNormal){const axis=norm(desiredDirection),ref=norm(cross(axis,rotate(out,{x:0,y:1,z:0}))),want=norm(poleNormal);const s=dot(cross(ref,want),axis),c=Math.max(-1,Math.min(1,dot(ref,want))),ang=Math.atan2(s,c);out=qMul([axis.x*Math.sin(ang/2),axis.y*Math.sin(ang/2),axis.z*Math.sin(ang/2),Math.cos(ang/2)],out)}
 return qn(out);
}
export function solveLocalBoneRotation(rig:RigAnalysis,name:string,desiredDirection:V3,parentTargetWorld:Q,poleNormal?:V3):Q{const i=rig.byName[name];if(i===undefined)throw new Error(`Missing rig node: ${name}`);const bindDir=rig.primaryAxis[name];if(!bindDir)throw new Error(`Missing bind axis: ${name}`);const desiredWorld=aimBoneWorld(rig.worldRotation[i],bindDir,desiredDirection,poleNormal);return localFromWorld(parentTargetWorld,desiredWorld)}
export function continuous(prev:Q,next:Q):Q{let q=qn(next);const d=prev[0]*q[0]+prev[1]*q[1]+prev[2]*q[2]+prev[3]*q[3];if(d<0)q=q.map(v=>-v) as Q;return q}
