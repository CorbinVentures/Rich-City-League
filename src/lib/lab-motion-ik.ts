export type V3={x:number;y:number;z:number};
export type TwoBoneResult={joint:V3;end:V3;reachable:boolean};

const add=(a:V3,b:V3):V3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:V3,b:V3):V3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:V3,s:number):V3=>({x:a.x*s,y:a.y*s,z:a.z*s});
const dot=(a:V3,b:V3)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a:V3,b:V3):V3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const len=(a:V3)=>Math.hypot(a.x,a.y,a.z);
const norm=(a:V3):V3=>{const l=len(a);return l<1e-9?{x:0,y:0,z:0}:mul(a,1/l);};

/**
 * Deterministic analytic two-bone IK in task space.
 * The pole chooses the bend plane (knees forward, elbows outward/forward).
 * It returns positions only; the offline baker converts solved directions through
 * each target bone's actual bind basis before writing local quaternions.
 */
export function solveTwoBone(root:V3,target:V3,pole:V3,l1:number,l2:number):TwoBoneResult{
  const toTarget=sub(target,root),rawD=len(toTarget);
  const minD=Math.abs(l1-l2)+1e-6,maxD=l1+l2-1e-6;
  const d=Math.max(minD,Math.min(maxD,rawD));
  const x=norm(toTarget);
  let poleDelta=sub(pole,root);
  poleDelta=sub(poleDelta,mul(x,dot(poleDelta,x)));
  if(len(poleDelta)<1e-7){
    const fallback=Math.abs(x.y)<.95?{x:0,y:1,z:0}:{x:1,y:0,z:0};
    poleDelta=cross(x,fallback);
  }
  const y=norm(poleDelta);
  const along=(l1*l1-l2*l2+d*d)/(2*d);
  const height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const joint=add(root,add(mul(x,along),mul(y,height)));
  const end=add(root,mul(x,d));
  return {joint,end,reachable:rawD>=minD&&rawD<=maxD};
}

export function quatContinuous(prev:[number,number,number,number],q:[number,number,number,number]){
  const d=prev[0]*q[0]+prev[1]*q[1]+prev[2]*q[2]+prev[3]*q[3];
  const s=d<0?-1:1;
  const n=Math.hypot(q[0],q[1],q[2],q[3])||1;
  return [q[0]*s/n,q[1]*s/n,q[2]*s/n,q[3]*s/n] as [number,number,number,number];
}
