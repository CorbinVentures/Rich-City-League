import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ATLAS_OVERVIEW, ATLAS_MAX_ZOOM, atlasCityCamera, atlasVenueCamera, atlasXY, clampAtlasZoom } from '../src/lib/virginia-atlas-camera';
import { VIRGINIA_CITIES } from '../src/lib/virginia-world';

describe('interactive Virginia atlas camera',()=>{
  const richmond=VIRGINIA_CITIES.find(city=>city.id==='richmond')!;
  it('opens statewide instead of zoomed into a random town',()=>{
    expect(ATLAS_OVERVIEW).toMatchObject({focusX:0.5,focusY:0.5,zoom:1,panX:0,panY:0});
  });
  it('focuses Richmond when a city marker is selected',()=>{
    const camera=atlasCityCamera(richmond);
    expect(camera.zoom).toBeGreaterThan(1);
    expect(camera.focusX).toBeCloseTo(atlasXY(richmond).x,6);
    expect(camera.focusY).toBeCloseTo(atlasXY(richmond).y,6);
    expect(camera.panX).toBe(0);
  });
  it('focuses a court more closely than its city',()=>{
    const court={lat:37.50,lon:-77.50};
    expect(atlasVenueCamera(court).zoom).toBeGreaterThan(atlasCityCamera(richmond).zoom);
    expect(atlasVenueCamera(court).focusX).toBeCloseTo(atlasXY(court).x);
  });
  it('clamps pinch and wheel zoom rather than allowing invisible levels',()=>{
    expect(clampAtlasZoom(-2)).toBe(1);
    expect(clampAtlasZoom(Number.NaN)).toBe(1);
    expect(clampAtlasZoom(999)).toBe(ATLAS_MAX_ZOOM);
    expect(clampAtlasZoom(3)).toBe(3);
  });
  it('projects Virginia coordinates within the geographic illustration',()=>{
    for(const city of VIRGINIA_CITIES){
      const {x,y}=atlasXY(city);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
  it('connects actual map controls and selected location detail affordances',()=>{
    const component=readFileSync(join(process.cwd(),'src/components/discover/VirginiaInteractiveAtlas.tsx'),'utf8');
    expect(component).toContain('onPointerDown={onPointerDown}');
    expect(component).toContain('onPointerMove={onPointerMove}');
    expect(component).toContain('onWheel={onWheel}');
    expect(component).toContain('onClick={()=>selectCity(item)}');
    expect(component).toContain('onClick={()=>onPlaceSelect(point.id)}');
    expect(component).toContain('<Link href={selected.href}>View details');
    expect(component).toContain('aria-label="Zoom in"');
    expect(component).toContain('aria-label="Zoom out"');
  });
});
