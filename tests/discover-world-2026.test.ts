import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('Discover Court Radar uses actual Virginia geography',()=>{
 const world=read('src/components/discover/VirginiaWorld.tsx');
 const worldCss=read('src/components/discover/virginia-world-v2.css');
 it('opens immediately on the real georeferenced MapLibre map',()=>{
  expect(world).toContain("const [mapMode]=useState<'3d'>('3d')");
  expect(world).toContain('isVirginiaBasemapRenderable(map)');
  expect(world).not.toContain('<VirginiaInteractiveAtlas');
  expect(world).toContain("data:'/api/geo/virginia?layer=state'");
 });
 it('keeps 2D and 3D the same geographic map, not invented artwork',()=>{
  expect(world).toContain("changePerspective('flat')");
  expect(world).toContain("changePerspective('tilted')");
  expect(world).toContain("mapRef.current?.easeTo({pitch:");
  expect(worldCss).toContain('rch-world-verified-map-placeholder');
 });
 it('retains court searching, selection and expanded map navigation',()=>{
  expect(world).toContain('search_basketball_locations');
  expect(world).toContain('setIsExpanded(v=>!v)');
  expect(world).toContain('document.body.style.overflow=previous');
  expect(world).toContain('mapRef.current?.resize()');
 });
 it('does not automatically watch user GPS just because permission was previously granted',()=>{
  expect(world).not.toContain("navigator.permissions.query({name:'geolocation'})");
  expect(world).toContain('geolocation.watchPosition');
 });
});
