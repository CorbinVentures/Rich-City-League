import type {V3} from './lab-motion-ik';

export type Q=[number,number,number,number];
export type BindJoint={name:string,parent:string|null,localPosition:V3,localRotation:Q,primaryAxis:V3};
export type WorldJoint={position:V3,rotation:Q};

const add=(a:V3,b:V3):V3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:V3,b:V3):V3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a:V3,b:V3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:V3,b:V3):V3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const len=(v:V3)=>Math.hypot(v.x,v.y,v.z);
const norm=(v:V3):V3=>{const n=len(v)||1;return{x:v.x/n,y:v.y/n,z:v.z/n}};
export const qNorm=(q:Q):Q=>{const n=Math.hypot(...q)||1;return q.map(v=>v/n) as Q};
export const qConj=(q:Q):Q=>[-q[0],-q[1],-q[2],q[3]];
export const qMul=(a:Q,b:Q):Q=>qNorm([
 a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
 a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
 a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
 a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
]);
export const rotate=(q:Q,v:V3):V3=>{
 const u={x:q[0],y:q[1],z:q[2]},s=q[3];
 const uv=cross(u,v),uuv=cross(u,uv);
 return add(v,{x:2*(s*uv.x+uuv.x),y:2*(s*uv.y+uuv.y),z:2*(s*uv.z+uuv.z)});
};

/** Minimal rotation mapping one unit direction onto another. */
export function quatFromTo(from:V3,to:V3):Q{
 const a=norm(from),b=norm(to),d=Math.max(-1,Math.min(1,dot(a,b)));
 if(d>0.999999)return[0,0,0,1];
 if(d<-0.999999){const seed=Math.abs(a.x)<.8?{x:1,y:0,z:0}:{x:0,y:1,z:0};const ax=norm(cross(a,seed));return[ax.x,ax.y,ax.z,0];}
 const c=cross(a,b),s=Math.sqrt((1+d)*2),inv=1/s;
 return qNorm([c.x*inv,c.y*inv,c.z*inv,s*.5]);
}

/**
 * Convert a desired WORLD-space child direction to a LOCAL joint quaternion.
 * This is the key correction missing from the old browser experiments: the target
 * athlete's real rest/bind orientation and parent world orientation are respected.
 */
export function localRotationForDirection(bind:BindJoint,parentWorldRotation:Q,desiredWorldDirection:V3):Q{
 const bindWorldAxis=rotate(qMul(parentWorldRotation,bind.localRotation),bind.primaryAxis);
 const worldDelta=quatFromTo(bindWorldAxis,desiredWorldDirection);
 const desiredWorld=qMul(worldDelta,qMul(parentWorldRotation,bind.localRotation));
 return qMul(qConj(parentWorldRotation),desiredWorld);
}

export function inferPrimaryAxis(jointWorld:V3,childWorld:V3):V3{return norm(sub(childWorld,jointWorld));}
