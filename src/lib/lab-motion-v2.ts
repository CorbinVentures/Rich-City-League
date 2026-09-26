import type {RigAnalysis,V3,Q} from './lab-rig-analysis';
const sub=(a:V3,b:V3):V3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});const add=(a:V3,b:V3):V3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});const mul=(a:V3,s:number):V3=>({x:a.x*s,y:a.y*s,z:a.z*s});const dot=(a:V3,b:V3)=>a.x*b.x+a.y*b.y+a.z*b.z;const cross=(a:V3,b:V3):V3=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});const len=(a:V3)=>Math.hypot(a.x,a.y,a.z);const norm=(a:V3):V3=>{const n=len(a)||1;return mul(a,1/n)};
export type LimbSolve={joint:V3;end:V3;reachable:boolean;bendNormal:V3};
export function solveLimb(root:V3,target:V3,pole:V3,l1:number,l2:number):LimbSolve{
 const rt=sub(target,root),d0=len(rt),eps=1e-6,d=Math.min(Math.max(d0,Math.abs(l1-l2)+eps),l1+l2-eps),x=norm(rt);
 let pv=sub(pole,root),z=norm(cross(x,pv));if(len(z)<.5)z=norm(cross(x,Math.abs(x.y)<.9?{x:0,y:1,z:0}:{x:1,y:0,z:0}));const y=norm(cross(z,x));
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));const joint=add(root,add(mul(x,along),mul(y,height)));
 return{joint,end:add(root,mul(x,d)),reachable:d0<=l1+l2+eps&&d0>=Math.abs(l1-l2)-eps,bendNormal:z};
}
export type ReadyStance={pelvis:V3;leftFoot:V3;rightFoot:V3;leftKneePole:V3;rightKneePole:V3;leftHand:V3;rightHand:V3;leftElbowPole:V3;rightElbowPole:V3};
export function basketballReadyStance(rig:RigAnalysis):ReadyStance{
 const at=(n:string)=>rig.worldPosition[rig.byName[n]], pelvis=at('pelvis'),lf=at('foot_l'),rf=at('foot_r');if(!pelvis||!lf||!rf)throw new Error('Required pelvis/feet missing');
 const floor=Math.min(lf.y,rf.y),height=Math.max(.001,pelvis.y-floor),stance=Math.max(Math.abs(lf.x-rf.x)*1.18,height*.48),py=floor+height*.82,pz=pelvis.z+height*.05;
 return{pelvis:{x:pelvis.x,y:py,z:pz},leftFoot:{x:pelvis.x-stance/2,y:lf.y,z:lf.z},rightFoot:{x:pelvis.x+stance/2,y:rf.y,z:rf.z},leftKneePole:{x:pelvis.x-stance*.42,y:floor+height*.42,z:pz+height*.32},rightKneePole:{x:pelvis.x+stance*.42,y:floor+height*.42,z:pz+height*.32},leftHand:{x:pelvis.x-stance*.58,y:floor+height*.62,z:pz+height*.24},rightHand:{x:pelvis.x+stance*.58,y:floor+height*.62,z:pz+height*.24},leftElbowPole:{x:pelvis.x-stance*.9,y:floor+height*.86,z:pz+height*.22},rightElbowPole:{x:pelvis.x+stance*.9,y:floor+height*.86,z:pz+height*.22}};
}
export function validateReadyStance(s:ReadyStance){const width=Math.abs(s.rightFoot.x-s.leftFoot.x),handWidth=Math.abs(s.rightHand.x-s.leftHand.x);return{stanceWidth:width,handsInsideTpose:handWidth<width*1.6,kneesForward:s.leftKneePole.z>s.pelvis.z&&s.rightKneePole.z>s.pelvis.z,pelvisLoaded:s.pelvis.y>Math.min(s.leftFoot.y,s.rightFoot.y)}}
