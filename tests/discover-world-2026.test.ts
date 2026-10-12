import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('Discover Basketball map upgrade',()=>{
  const world=read('src/components/discover/VirginiaWorld.tsx');
  const atlas=read('src/components/discover/VirginiaInteractiveAtlas.tsx');
  const atlasCss=read('src/components/discover/virginia-interactive-atlas-v2.css');
  const worldCss=read('src/components/discover/virginia-world-v2.css');
  it('actually releases all map pointer events to loaded 3D streets',()=>{
    expect(world).toContain('streetReady={mapShown}');
    expect(atlas).toContain("+(streetReady?' street-ready':'')");
    expect(atlasCss).toContain('.rch-live-atlas-v2.street-ready{opacity:0!important;visibility:hidden!important;pointer-events:none!important}');
  });
  it('keeps matching court searches visible on statewide map',()=>{
    expect(world).toContain('searchActive={query.trim().length>=2}');
    expect(atlas).toContain("if(match)setCamera(atlasVenueCamera(match))");
    expect(atlas).toContain('city?points.filter(point=>milesBetween(point,city)<30):points');
  });
  it('provides usable map controls and a reversible expanded view',()=>{
    expect(world).toContain('setIsExpanded(v=>!v)');
    expect(world).toContain('document.body.style.overflow=previous');
    expect(world).toContain("mapRef.current?.resize()");
    expect(worldCss).toContain('.rch-world-map-shell.rch-world-map-shell-v2.is-expanded');
    expect(world).toContain("aria-pressed={mapMode==='atlas'}");
    expect(world).toContain("aria-pressed={mapMode==='3d'}");
  });
  it('preserves an accessible illustrated fallback and real map references',()=>{
    expect(atlas).toContain('onPointerMove={onPointerMove}');
    expect(atlas).toContain('onClick={()=>onPlaceSelect(point.id)}');
    expect(atlas).toContain('aria-label="Map zoom controls"');
    expect(world).toContain("search_basketball_locations");
    expect(world).toContain('isVirginiaBasemapRenderable(map)');
  });
});
