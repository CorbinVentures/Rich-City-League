import {describe,it,expect} from 'vitest';
import {clusterAtlasPoints} from './virginia-atlas-clusters';

describe('Virginia illustrated map clustering',()=>{
  const court=(id:string,lat:number,lon:number)=>({id,lat,lon,kind:'court' as const});
  it('combines only close loaded venues at statewide scale',()=>{
    const points=[court('a',37.54,-77.44),court('b',37.541,-77.441),court('c',36.85,-76.28)];
    const markers=clusterAtlasPoints(points,1,null);
    expect(markers).toHaveLength(2);
    expect(markers.map(m=>m.count).sort()).toEqual([1,2]);
  });
  it('leaves a selected place accessible outside its cluster',()=>{
    const points=[court('a',37.54,-77.44),court('b',37.541,-77.441)];
    const markers=clusterAtlasPoints(points,7,'b');
    expect(markers).toHaveLength(2);
    expect(markers.find(m=>m.point?.id==='b')?.count).toBe(1);
  });
  it('shows precise markers as zoom increases without generating bogus courts',()=>{
    const points=[court('a',37.54,-77.44),court('b',37.551,-77.44)];
    expect(clusterAtlasPoints(points,1,null)).toHaveLength(1);
    expect(clusterAtlasPoints(points,9,null)).toHaveLength(2);
    expect(clusterAtlasPoints([],9,null)).toEqual([]);
  });
  it('treats planned runs as higher visual priority and ignores invalid coordinates',()=>{
    const markers=clusterAtlasPoints([
      court('a',37.54,-77.44),
      {id:'r',lat:37.5401,lon:-77.4401,kind:'run' as const},
      court('bad',Number.NaN,-77.44)
    ],3,null);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({count:2,kind:'run'});
  });
});
