export type V3={x:number;y:number;z:number}; export type Q=[number,number,number,number];
export type RigNode={name:string;parent:number|null;translation:V3;rotation:Q;children:number[]};
export type RigAnalysis={nodes:RigNode[];byName:Record<string,number>;worldPosition:V3[];worldRotation:Q[];primaryAxis:Record<string,V3>};
const qn=(q:Q):Q=>{const n=Math.hypot(...q)||1;return q.map(v=>v/n) as Q};
const qm=(a:Q,b:Q):Q=>qn([a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]);
const qr=(q:Q,v:V3):V3=>{const p:Q=[v.x,v.y,v.z,0],c:Q=[-q[0],-q[1],-q[2],q[3]],r=qmRaw(qmRaw(q,p),c);return{x:r[0],y:r[1],z:r[2]}}; const qmRaw=(a:Q,b:Q):Q=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const add=(a:V3,b:V3):V3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}); const norm=(v:V3):V3=>{const n=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/n,y:v.y/n,z:v.z/n}};
export function analyzeRig(raw:Array<{name?:string;children?:number[];translation?:number[];rotation?:number[]}>):RigAnalysis{
 const parent:(number|null)[]=raw.map(()=>null);raw.forEach((n,i)=>(n.children||[]).forEach(c=>parent[c]=i));
 const nodes:RigNode[]=raw.map((n,i)=>({name:n.name||`node_${i}`,parent:parent[i],children:n.children||[],translation:{x:n.translation?.[0]||0,y:n.translation?.[1]||0,z:n.translation?.[2]||0},rotation:qn((n.rotation||[0,0,0,1]) as Q)}));
 const wp:V3[]=[],wq:Q[]=[];const solve=(i:number):void=>{if(wp[i])return;const n=nodes[i];if(n.parent===null){wp[i]=n.translation;wq[i]=n.rotation;return}solve(n.parent);wq[i]=qm(wq[n.parent],n.rotation);wp[i]=add(wp[n.parent],qr(wq[n.parent],n.translation))};nodes.forEach((_,i)=>solve(i));
 const byName=Object.fromEntries(nodes.map((n,i)=>[n.name,i]));const primaryAxis:Record<string,V3>={};nodes.forEach((n,i)=>{const c=n.children.find(x=>nodes[x].name.length>0);if(c!==undefined)primaryAxis[n.name]=norm({x:wp[c].x-wp[i].x,y:wp[c].y-wp[i].y,z:wp[c].z-wp[i].z})});
 return{nodes,byName,worldPosition:wp,worldRotation:wq,primaryAxis};
}
