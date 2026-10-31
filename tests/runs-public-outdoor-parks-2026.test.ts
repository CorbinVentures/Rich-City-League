import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildCourtMapPins,playableCourt,type WorldCourt} from '../src/lib/runs-world-game';
const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const sql=read('supabase/migrations/20261026071000_runs_public_outdoor_park_courts.sql');

const court=(overrides:Partial<WorldCourt>={}):WorldCourt=>({
 slug:'lucks-field',name:'Lucks Field Park',address:'1926 T Street',locality:'Richmond',
 latitude:37.54,longitude:-77.43,venue_type:'outdoor',access_type:'public',
 verification_status:'official',source_label:'City of Richmond PRCF',
 source_url:'https://rva.gov/parks-recreation/about-department',hours_text:null,...overrides
});

describe('Runs: public outdoor municipal park courts only',()=>{
 it('keeps public parks and removes indoor gyms, membership facilities and unverified map leads',()=>{
  expect(playableCourt(court())).toBe(true);
  expect(playableCourt(court({slug:'rockwood-park',name:'Rockwood Park',source_label:'Chesterfield County Parks & Recreation'}))).toBe(true);
  expect(playableCourt(court({slug:'pine-camp',name:'Pine Camp Arts & Community Center'}))).toBe(true);
  for(const bad of [
    {venue_type:'indoor'}, {venue_type:'mixed'}, {access_type:'membership'},
    {access_type:'varies'}, {verification_status:'community'}, {source_label:'Private School'}
  ] as Partial<WorldCourt>[]){
    expect(playableCourt(court(bad))).toBe(false);
    expect(buildCourtMapPins([court(bad)],[])).toEqual([]);
  }
 });
 it('centralizes approved locations in an invoker-rights view rather than deleting records',()=>{
  expect(sql).toContain('create or replace view public.rch_runs_outdoor_courts');
  expect(sql).toContain('security_invoker=true');
  for(const fragment of ["b.venue_type='outdoor'","b.access_type='public'","b.verification_status in ('official','provider')","b.source_url like 'https://%'","b.source_label ~*"]){
   expect(sql).toContain(fragment);
  }
  expect(sql).toContain("b.name ~* '^ES[-_]'");
  expect(sql).toContain("no court|hoop structure only");
  expect(sql).toContain('from public.rch_runs_outdoor_courts b');
  expect(sql).not.toContain('delete from public.basketball_locations');
  expect(sql).not.toContain('delete from public.runs');
  expect(sql).toContain('before insert or update of location_slug on public.runs');
 });
 it('uses the same allowed set for autocomplete, World, legacy Runs, Court Dominion and court arena',()=>{
  const world=read('src/components/runs/RunsWorldGame.tsx');
  const classic=read('src/app/runs/page.tsx');
  const picker=read('src/components/runs/RunVenuePicker.tsx');
  const dominion=read('src/components/runs/CourtDominion.tsx');
  const arena=read('src/app/runs/courts/[slug]/page.tsx');
  const discover=read('src/components/discover/VirginiaWorld.tsx');
  expect(world).toContain("db.from('rch_runs_outdoor_courts')");
  expect(world).not.toContain('leads={communityLeads}');
  expect(world).toContain('filter(playableCourt)');
  expect(classic).toContain("db.from('rch_runs_outdoor_courts')");
  expect(classic).not.toContain('Custom location</span>');
  expect(picker).toContain("db.rpc('search_run_venues'");
  expect(picker).not.toContain('Use my own address or an unlisted court');
  expect(dominion).toContain("db.from('rch_runs_outdoor_courts')");
  expect(arena).toContain("db.from('rch_runs_outdoor_courts')");
  expect(discover).toContain("db.rpc('search_rch_outdoor_park_courts'");
 });
});
