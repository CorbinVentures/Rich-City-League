import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {censusBoundaryUrl,validVirginiaFeatures} from '../src/lib/virginia-census-boundaries';
import {countyBounds} from '../src/lib/virginia-geographic-bounds';
const text=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');

describe('RCH official 2026 Virginia geographic data',()=>{
 it('uses fixed official Census state/county queries and never accepts external URLs',()=>{
  expect(censusBoundaryUrl('state')).toContain("MapServer/0/query");
  expect(decodeURIComponent(censusBoundaryUrl('state'))).toContain("GEOID='51'");
  expect(censusBoundaryUrl('counties')).toContain("MapServer/1/query");
  expect(decodeURIComponent(censusBoundaryUrl('counties'))).toContain("STATE='51'");
  expect(censusBoundaryUrl('state')).toContain('tigerweb.geo.census.gov');
 });
 it('rejects incorrect and missing state/county polygons instead of faking geometry',()=>{
  const feature=(geoid:string)=>({type:'Feature',properties:{GEOID:geoid},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}});
  expect(validVirginiaFeatures({type:'FeatureCollection',features:[feature('51')]},'state')?.features).toHaveLength(1);
  expect(validVirginiaFeatures({type:'FeatureCollection',features:[feature('51041'),feature('51760')]},'counties')?.features).toHaveLength(2);
  expect(validVirginiaFeatures({type:'FeatureCollection',features:[feature('51'),feature('36')]},'state')).toBeNull();
  expect(validVirginiaFeatures({type:'FeatureCollection',features:[feature('51')]},'counties')).toBeNull();
  expect(validVirginiaFeatures({type:'FeatureCollection',features:[]},'state')).toBeNull();
 });
 it('uses the same verified georeferenced state outline in Runs World and Court Radar',()=>{
  expect(text('src/lib/runs-geography.ts')).toContain('/api/geo/virginia?layer=state');
  expect(text('src/components/discover/VirginiaWorld.tsx')).toContain("data:'/api/geo/virginia?layer=state'");
  expect(text('src/components/runs/AccurateVirginiaMap.tsx')).not.toContain('virginia-world-fallback.svg');
  expect(text('src/components/discover/VirginiaWorld.tsx')).not.toContain('<VirginiaInteractiveAtlas');
 });
 it('retains community leads as a separate lower confidence geographic layer',()=>{
  const map=text('src/components/runs/AccurateVirginiaMap.tsx');
  const runs=text('src/components/runs/RunsWorldGame.tsx');
  expect(map).toContain("'rch-unverified-leads'");
  expect(map).toContain('not a verified court');
  expect(runs).toContain(".eq('verification_status','community')");
  expect(runs).toContain('leads={communityLeads}');
  expect(runs).toContain('not approved courts');
 });
});
describe('Real county polygon camera framing',()=>{
 it('uses the 2026 Chesterfield County geometry including multipart points',()=>{
  const data={features:[{properties:{GEOID:'51041'},geometry:{type:'MultiPolygon',
   coordinates:[[[[-77.8,37.1],[-77.3,37.1],[-77.3,37.5],[-77.8,37.1]]],
                [[[-77.7,37.2],[-77.6,37.2],[-77.7,37.3],[-77.7,37.2]]]]}}]};
  expect(countyBounds(data,'51041')).toEqual([[-77.8,37.1],[-77.3,37.5]]);
  expect(countyBounds(data,'51760')).toBeNull();
 });
});
describe('RCH sourced court-coordinate correction control',()=>{
 it('requires staff and recorded evidence, with RLS, RPC and permanent approval/rejection audit',()=>{
  const sql=text('supabase/migrations/20261017230000_rch_court_coordinate_review.sql');
  expect(sql).toContain('public.is_staff_or_admin()');
  expect(sql).toContain('alter table public.rch_court_coordinate_reviews enable row level security');
  expect(sql).toContain("p_evidence_url !~ '^https://'");
  expect(sql).toContain('rch_guard_court_latlon_change');
  expect(sql).toContain("set_config('rch.coordinate_approval','reviewed',true)");
  expect(sql).toContain('rch_court_coordinate_audit');
  expect(sql).toContain("values(v_review.court_slug");
  expect(sql).not.toContain('rch_rep_wallets');
 });
 it('offers statewide staff queue and reviewer approval without direct table coordinate updates',()=>{
  const qa=text('src/app/admin/runs/map-quality/page.tsx');
  expect(qa).toContain("db.rpc('is_staff_or_admin')");
  expect(qa).toContain("rch_propose_court_coordinates");
  expect(qa).toContain("rch_resolve_court_coordinate_review");
  expect(qa).not.toContain(".update({latitude");
  expect(qa).toContain('Community leads');
 });
});
