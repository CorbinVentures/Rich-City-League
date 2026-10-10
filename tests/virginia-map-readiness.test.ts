import { describe, expect, it } from 'vitest';
import { isVirginiaBasemapRenderable } from '../src/lib/virginia-map-readiness';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const style={layers:[
  {id:'background',type:'background'},
  {id:'water',type:'fill',source:'openmaptiles'},
  {id:'roads',type:'line',source:'openmaptiles'},
]};
const map=(changes:Record<string,unknown>={})=>({
  isStyleLoaded:()=>true,
  isSourceLoaded:()=>true,
  getStyle:()=>style,
  queryRenderedFeatures:(_:unknown,options:{layers:string[]})=>options.layers.includes('water')?[{id:1}]:[],
  ...changes
});
describe('Virginia 3D map never hides the Atlas for a blank street map',()=>{
  it('waits for the style to load',()=>expect(isVirginiaBasemapRenderable(map({isStyleLoaded:()=>false}))).toBe(false));
  it('waits for the OpenStreetMap tile source',()=>expect(isVirginiaBasemapRenderable(map({isSourceLoaded:()=>false}))).toBe(false));
  it('does not mistake an empty but loaded source for rendered geography',()=>expect(isVirginiaBasemapRenderable(map({queryRenderedFeatures:()=>[]}))).toBe(false));
  it('requires painted vector layers, not just background',()=>expect(isVirginiaBasemapRenderable(map({getStyle:()=>({layers:[{id:'background',type:'background'}]})}))).toBe(false));
  it('rejects map-query errors safely',()=>expect(isVirginiaBasemapRenderable(map({queryRenderedFeatures:()=>{throw Error('context lost')}}))).toBe(false));
  it('reveals MapLibre only after visible geography is present',()=>expect(isVirginiaBasemapRenderable(map())).toBe(true));
  it('always renders the local Atlas behind the optional 3D canvas',()=>{
    const source=readFileSync(join(process.cwd(),'src/components/discover/VirginiaWorld.tsx'),'utf8');
    expect(source).toContain("rch-world-atlas'+(mapMode==='3d'");
    expect(source).not.toContain("!mapShown&&<div className=\"rch-world-atlas\"");
  });
});
