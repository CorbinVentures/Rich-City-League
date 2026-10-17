import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildCourtMapPins,verifiedParksRecFacility,type WorldCourt} from '../src/lib/runs-world-game';
import {courtMeters,duplicateCourtReviews,normalizedCourtName} from '../src/lib/parks-rec-duplicate-audit';
const read=(name:string)=>readFileSync(join(process.cwd(),name),'utf8');
describe('2026 Virginia city/county Parks & Recreation source audit',()=>{
 const migration=read('supabase/migrations/20261017235500_alexandria_hampton_roanoke_official_facilities.sql');
 it('adds Alexandria official basketball facilities without duplicating two existing circuit locations',()=>{
  expect(migration).toContain('City of Alexandria Recreation, Parks & Cultural Activities');
  expect(migration).toContain("https://www.alexandriava.gov/parks/outdoor-ball-courts");
  expect(migration).toContain('Angel Park');
  expect(migration).toContain('Windmill Hill Park');
  expect(migration).toContain('Four Mile Run Park');
  expect(migration).not.toContain("'alexandria-rpca-helen-miller-bernard-hunter-park'");
  expect(migration).not.toContain("'alexandria-rpca-potomac-yard-park'");
  expect(migration).toContain("on conflict (slug) do nothing");
  expect(migration).toContain("regexp_replace(lower(b.name)");
 });
 it('documents indoor Roanoke gym and indoor/outdoor Hampton basketball amenities without inventing opening hours or precision pins',()=>{
  expect(migration).toContain('Green Ridge Recreation Center');
  expect(migration).toContain('Mary W. Jackson Neighborhood Center');
  expect(migration).toContain("'Roanoke County Parks, Recreation & Tourism'");
  expect(migration).toContain("'City of Hampton Parks & Recreation'");
  expect(migration).toContain("'mixed'");
  expect(migration).toContain("'indoor'");
  expect(migration).toContain('null,null');
  expect(migration).not.toContain("ST_GeomFromText");
  const gym:WorldCourt={slug:'roanoke-county-green-ridge-recreation-center',name:'Green Ridge Recreation Center',
    address:'7415 Wood Haven Rd, Roanoke, VA 24019',locality:'Roanoke',latitude:null,longitude:null,
    venue_type:'indoor',access_type:'varies',verification_status:'official',source_label:'Roanoke County Parks, Recreation & Tourism',
    source_url:'https://www.roanokecountyparks.com/168/Green-Ridge',hours_text:null};
  expect(verifiedParksRecFacility(gym)).toBe(true);
  expect(buildCourtMapPins([gym],[])).toHaveLength(0);
 });
});
describe('Chesapeake and Virginia Beach official basketball court source review',()=>{
 const coastal=read('supabase/migrations/20261017235600_chesapeake_virginia_beach_basketball_sources.sql');
 it('adds only cited government basketball facilities without fabricated geocoordinates',()=>{
  for(const name of ['James W. McNeil Park','Claire R. Askew Western Branch Park','Chesapeake City Park','Indian River Park','Crestwood Park (Park Side)','Campostella Square Park','Dunedin Park','Level Green Park','Bayville Farms Park','Great Neck Park']){
   expect(coastal).toContain(name);
  }
  expect(coastal).toContain("source_rows");
  expect(coastal).toContain('null,null');
  expect(coastal).toContain('on conflict (slug) do nothing');
  expect(coastal).toContain("regexp_replace(lower(b.name)");
  expect(coastal).toContain('NORTH SIDE at 1709 Rokeby Avenue');
  expect(coastal).not.toContain('ST_GeomFromText');
 });
});
describe('Conservative duplicate candidate review',()=>{
 const row=(slug:string,latitude:number|null,longitude:number|null,source:string,verification_status='community')=>({
  slug,name:'Basketball Court',locality:'Roanoke',latitude,longitude,
  verification_status,source_label:source,source_url:'https://example.gov/map'
 });
 it('normalizes superficial name variation without deleting separate physical facilities',()=>{
  expect(normalizedCourtName("Basketball -- Court!")).toBe('basketball court');
  const candidates=duplicateCourtReviews([
   row('court-1',37.275,-79.94,'OSM'),
   row('court-2',37.2751,-79.9401,'City of Roanoke Parks','official'),
   row('court-3',37.34,-79.9,'OSM'),
   {...row('court-4',null,null,'Other'),'name':'Different Gym'}
  ]);
  expect(candidates).toHaveLength(1);
  expect(candidates[0].candidates).toHaveLength(3);
  expect(candidates[0].officialCount).toBe(1);
  expect(candidates[0].communityCount).toBe(2);
  expect(candidates[0].nearestMeters).toBeGreaterThan(0);
  expect(candidates[0].nearestMeters).toBeLessThan(20);
  expect(candidates[0].reviewHint).toContain('review GIS surface IDs');
 });
 it('refuses fabricated distance between missing coordinate records',()=>{
  expect(courtMeters(row('a',null,null,''),row('b',37,-77,''))).toBeNull();
  const groups=duplicateCourtReviews([row('a',null,null,''),row('b',null,null,'')]);
  expect(groups[0].nearestMeters).toBeNull();
  expect(groups[0].reviewHint).toContain('multiple distinct basketball court surfaces');
 });
 it('exposes non-destructive source evidence to staff but no delete or automatic merge',()=>{
  const admin=read('src/app/admin/runs/map-quality/page.tsx');
  expect(admin).toContain('duplicateCourtReviews(regional)');
  expect(admin).toContain('Investigate duplicate court candidates');
  expect(admin).toContain('Multiple court surfaces can share a name');
  expect(admin).not.toContain("db.from('basketball_locations').delete()");
 });
});
