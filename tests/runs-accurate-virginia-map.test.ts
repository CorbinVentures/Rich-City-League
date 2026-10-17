import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {courtCoverage,localityNames,matchesRunToCourts,REAL_VIRGINIA_MAP} from '../src/lib/runs-geography';
import {VIRGINIA_CITIES} from '../src/lib/virginia-world';
import type {WorldCourt,WorldRun} from '../src/lib/runs-world-game';

const chesterfield=VIRGINIA_CITIES.find(c=>c.id==='chesterfield')!;
const richmond=VIRGINIA_CITIES.find(c=>c.id==='richmond')!;
const court=(overrides:Partial<WorldCourt>={}):WorldCourt=>({
 slug:'cogbill-park',name:'Cogbill Park',address:'park address',locality:'Chesterfield',
 latitude:null,longitude:null,verification_status:'official',access_type:'public',
 venue_type:'outdoor',source_url:'https://chesterfield.gov',hours_text:null,...overrides
});
const run=(overrides:Partial<WorldRun>={}):WorldRun=>({
 id:'scheduled',title:'Community pickup',location:'Cogbill Park, North Chesterfield',
 location_slug:'cogbill-park',starts_at:'2030-10-17T12:00:00Z',
 status:'open',game_format:'3v3',run_type:'open',...overrides
});
describe('Real Virginia geospatial discovery',()=>{
 it('groups all three Chesterfield postal labels but never merges independent Richmond City',()=>{
  expect(localityNames(chesterfield)).toEqual(['Chesterfield','North Chesterfield','South Chesterfield']);
  expect(localityNames(richmond)).toEqual(['Richmond']);
 });
 it('never invents court coordinates or calls unmapped courts missing',()=>{
  const venues=[court(),court({slug:'chester-2',locality:'North Chesterfield'}),
   court({slug:'verified-rva',locality:'South Chesterfield',latitude:37.4,longitude:-77.5})];
  const pins=[{id:'court:verified-rva'}];
  expect(courtCoverage(venues,[run(),run({id:'bad-location',location_slug:'other'})],pins))
   .toEqual({total:3,mapped:1,needsCoordinates:2,scheduled:1,orphanRuns:1});
 });
 it('matches Run to the permanent physical court identity, never text address substrings',()=>{
  expect(matchesRunToCourts(run(),new Set(['cogbill-park']))).toBe(true);
  expect(matchesRunToCourts(run({location:'Richmond, VA',location_slug:'moved-court'}),new Set(['cogbill-park']))).toBe(false);
  expect(matchesRunToCourts(run({location_slug:null}),new Set(['cogbill-park']))).toBe(false);
 });
 it('uses legitimate geographic sources with real coordinates and no illustrated SVG as Runs map',()=>{
  expect(REAL_VIRGINIA_MAP.stateOutline).toBe('/api/geo/virginia?layer=state');
  expect(REAL_VIRGINIA_MAP.chesterfieldJurisdiction).toBe('/api/geo/virginia?layer=counties');
  expect(REAL_VIRGINIA_MAP.style).toContain('openfreemap.org');
  const root=process.cwd();
  const map=readFileSync(join(root,'src/components/runs/AccurateVirginiaMap.tsx'),'utf8');
  const world=readFileSync(join(root,'src/components/runs/RunsWorldGame.tsx'),'utf8');
  expect(map).toContain("new lib.Map");
  expect(map).toContain('setLngLat([p.lon,p.lat])');
  expect(map).toContain('REAL_VIRGINIA_MAP.stateOutline');
  expect(map).toContain('REAL_VIRGINIA_MAP.chesterfieldJurisdiction');
  expect(map).not.toContain('virginia-world-fallback.svg');
  expect(world).toContain('<AccurateVirginiaMap');
  expect(world).toContain('localityNames(city)');
  expect(world).toContain('matchesRunToCourts(r,citySlugs)');
  expect(world).toContain('coverage.needsCoordinates');
  expect(world).not.toContain('<VirginiaInteractiveAtlas');
 });
 it('keeps boundary GIS hosts in the strict production CSP and offers protected staff QA',()=>{
  const root=process.cwd();
  const config=readFileSync(join(root,'next.config.js'),'utf8');
  expect(config).toContain('https://services.arcgis.com');
  expect(config).toContain('https://services.dwr.virginia.gov');
  const qa=readFileSync(join(root,'src/app/admin/runs/map-quality/page.tsx'),'utf8');
  expect(qa).toContain("db.rpc('is_staff_or_admin')");
  expect(qa).toContain('matchesChesterfield');
  expect(qa).toContain("rch_propose_court_coordinates");
  expect(qa).toContain("rch_resolve_court_coordinate_review");
  expect(qa).not.toContain(".update({latitude");
 });
});
