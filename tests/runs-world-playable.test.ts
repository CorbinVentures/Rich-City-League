import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
 buildCourtMapPins,playableCourt,verifiedParksRecFacility,getWorldMissions,recentVerifiedResults,readPagedUpcomingRuns,
 type WorldCourt,type WorldRun
} from '../src/lib/runs-world-game';

const court=(overrides:Partial<WorldCourt>={}):WorldCourt=>({
 slug:'real-park',name:'Real Municipal Park',address:'100 Public St',locality:'Richmond',
 latitude:37.54,longitude:-77.44,verification_status:'official',access_type:'public',
 venue_type:'outdoor',source_label:'City of Richmond PRCF',source_url:'https://example.gov/parks',hours_text:null,...overrides
});
const run=(overrides:Partial<WorldRun>={}):WorldRun=>({
 id:'a',title:'Local Run',location:'Real Park, Richmond, VA',location_slug:'real-park',
 starts_at:'2035-10-20T15:00:00Z',status:'open',game_format:'3v3',run_type:'competitive',...overrides
});

describe('Runs World playable geography and game progression',()=>{
 it('shows precise map pins only with official/provider public court coordinates',()=>{
  expect(playableCourt(court())).toBe(true);
  expect(playableCourt(court({verification_status:'community'}))).toBe(false);
  expect(playableCourt(court({access_type:'membership'}))).toBe(false);
  expect(buildCourtMapPins([
   court(),court({slug:'unmapped',latitude:null,longitude:null}),
   court({slug:'untrusted',verification_status:'community'}),
   court({slug:'private',access_type:'membership',source_label:'YMCA of Greater Richmond'}),
  ],[run()])).toEqual([{
   id:'court:real-park',title:'Real Municipal Park',city:'Richmond',kind:'run',
   lat:37.54,lon:-77.44,href:'/runs/courts/real-park',precision:'venue'
  }]);
 });
 it('verifies both outdoor Parks & Rec basketball courts and indoor gymnasiums, without promising walk-in use',()=>{
  const beulah=court({slug:'beulah-rec',name:'Beulah Recreation Center',locality:'North Chesterfield',
    venue_type:'indoor',access_type:'varies',source_label:'Chesterfield County Parks & Recreation'});
  const deepRun=court({slug:'deep-run-rec',venue_type:'mixed',access_type:'free_pass',
    source_label:'Henrico Recreation & Parks'});
  const cityGym=court({slug:'eastern-henrico-rec',venue_type:'indoor',access_type:'free_pass',
    source_label:'Henrico Recreation & Parks'});
  expect(verifiedParksRecFacility(beulah)).toBe(true);
  expect(verifiedParksRecFacility(deepRun)).toBe(true);
  expect(verifiedParksRecFacility(cityGym)).toBe(true);
  expect(playableCourt(beulah)).toBe(false); // verified gym is not an unscheduled walk-in park
  expect(verifiedParksRecFacility(court({source_label:'YMCA of Greater Richmond',verification_status:'provider'}))).toBe(false);
  expect(verifiedParksRecFacility(court({source_label:null}))).toBe(false);
  expect(verifiedParksRecFacility(court({source_url:null}))).toBe(false);
  expect(verifiedParksRecFacility(court({verification_status:'community'}))).toBe(false);
  const pins=buildCourtMapPins([beulah,deepRun,cityGym],[]);
  expect(pins).toHaveLength(3);
  expect(pins.find(p=>p.id==='court:beulah-rec')?.indoor).toBe(true);
  expect(pins.find(p=>p.id==='court:deep-run-rec')?.indoor).toBeUndefined();
 });
 it('does not fabricate competitive results or award extra REP for tasks',()=>{
  const missions=getWorldMissions({city:'Richmond',scouted:true,upcomingJoined:1,recentVerified:0});
  expect(missions.map(m=>m.complete)).toEqual([true,true,false]);
  expect(missions[2].href).toContain('view=list');
  expect(recentVerifiedResults([{verified_at:'2020-01-01T00:00:00Z'}],Date.parse('2026-10-17T15:00:00Z'))).toBe(0);
  expect(recentVerifiedResults([{verified_at:'2026-10-16T15:00:00Z'}],Date.parse('2026-10-17T15:00:00Z'))).toBe(1);
 });
 it('paginates rather than cutting off the first 100 upcoming Runs',async()=>{
  const all=Array.from({length:421},(_,i)=>({id:i}));
  const result=await readPagedUpcomingRuns<{id:number}>(async(from,to)=>({
   data:all.slice(from,to+1),error:null
  }),200,2000);
  expect(result.data).toHaveLength(421);
  expect(result.truncated).toBe(false);
  const truncated=await readPagedUpcomingRuns<{id:number}>(async(from,to)=>({
   data:all.slice(from,to+1),error:null
  }),100,300);
  expect(truncated.data).toHaveLength(300);
  expect(truncated.truncated).toBe(true);
 });
 it('has a real connected game home, court arena, challenge and player flows',()=>{
  const root=process.cwd();
  const world=readFileSync(join(root,'src/components/runs/RunsWorldGame.tsx'),'utf8');
  const classic=readFileSync(join(root,'src/app/runs/page.tsx'),'utf8');
  const preview=readFileSync(join(root,'src/components/runs/RunsCourtPreview.tsx'),'utf8');
  // A connected World renderer may be wrapped in onboarding UI without changing routing.
  expect(classic).toMatch(/if\s*\(!showLegacyList\)\s*return\s*<>\s*<RunsWorldGame\b/);
  expect(classic).toContain('<RunsRulesIntro open={rulesOpen} onClose={closeRules} />');
  expect(world).toContain('onOpenRules');
  const direct=readFileSync(join(root,'src/app/runs/world/page.tsx'),'utf8');
  const rules=readFileSync(join(root,'src/components/runs/RunsRulesIntro.tsx'),'utf8');
  expect(direct).toContain('<RunsRulesIntro open={rulesOpen} onClose={closeRules}/>');
  expect(rules).toContain('2× VERIFIED REP');
  expect(rules).toContain('independent score or stat verification');
  expect(rules).toContain('aria-modal="true"');
  expect(classic).toContain('readPagedUpcomingRuns<Run>');
  expect(world).toContain('AccurateVirginiaMap');
  expect(world).toContain('localityNames(city)');
  expect(world).toContain('get_rch_court_masters');
  expect(world).toContain('get_rch_court_crew_standings');
  expect(world).toContain('rch_court_territories');
  expect(world).toContain('<CourtDominion');
  expect(world).toContain('<RunPassport');
  expect(world).toContain('No location permission required');
  expect(preview).toContain('not reserved');
  expect(world).toContain('<RunsCourtPreview');
  expect(world).toContain('readPagedUpcomingRuns<WorldRun>');
 });
});
