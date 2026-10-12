import { atlasXY } from './virginia-atlas-camera';

export type AtlasGeoPoint={id:string;lat:number;lon:number;kind:'court'|'run'|'event'};

/** Groups only *loaded* mapped places. A group count is never an estimate of all Virginia courts. */
export type AtlasCluster<T extends AtlasGeoPoint>={
  key:string;x:number;y:number;count:number;
  kind:'court'|'run'|'event';items:T[];
  point:T|null;
};
export function clusterAtlasPoints<T extends AtlasGeoPoint>(
  points:readonly T[],zoom:number,selectedId:string|null
):AtlasCluster<T>[] {
  const cell=zoom>=9?0.0085:zoom>=6?0.014:zoom>=3?0.022:0.038;
  const groups=new Map<string,{items:T[];x:number;y:number}>();
  for(const item of points){
    if(!Number.isFinite(item.lat)||!Number.isFinite(item.lon))continue;
    const {x,y}=atlasXY(item);
    const key=item.id===selectedId?'selected:'+item.id:'cell:'+Math.floor(x/cell)+':'+Math.floor(y/cell);
    const group=groups.get(key);
    if(group){group.items.push(item);group.x+=x;group.y+=y;}
    else groups.set(key,{items:[item],x,y});
  }
  return [...groups].map(([key,group])=>{
    const count=group.items.length;
    const run=group.items.find(item=>item.kind==='run');
    const event=group.items.find(item=>item.kind==='event');
    return {key,x:group.x/count,y:group.y/count,count,
      kind:run?'run':event?'event':'court',
      items:group.items,
      point:count===1?group.items[0]:null
    };
  });
}
