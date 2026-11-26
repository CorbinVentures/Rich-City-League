import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildCrewTerritoryMapPins,buildCrewTerritoryLeaderboard,type WorldCourt,type CrewTerritoryMapPin} from '../src/lib/runs-world-game';

const court=(overrides:Partial<WorldCourt>={}):WorldCourt=>({
 slug:'bellmeade-park',name:'Bellemeade Park',address:'Richmond, VA',
 locality:'Richmond',latitude:37.51,longitude:-77.43,
 verification_status:'official',access_type:'public',venue_type:'outdoor',
 source_label:'City Parks and Recreation',source_url:'https://example.gov/parks',
 hours_text:null,...overrides
});

describe('RCH Crews Territory map model',()=>{
 it('maps only verified public playable courts with exact Virginia coordinates',()=>{
  const pins=buildCrewTerritoryMapPins([
   {court_slug:'bellmeade-park',crew_id:'804',successful_defenses:3},
   {court_slug:'unverified',crew_id:'804',successful_defenses:9},
   {court_slug:'private-gym',crew_id:'other',successful_defenses:1},
   {court_slug:'no-coordinate',crew_id:'804',successful_defenses:0},
   {court_slug:'outside-va',crew_id:'804',successful_defenses:1}
  ],[
   court(),
   court({slug:'unverified',verification_status:'community'}),
   court({slug:'private-gym',access_type:'private'}),
   court({slug:'no-coordinate',latitude:null,longitude:null}),
   court({slug:'outside-va',latitude:40.01,longitude:-77.43})
  ],{804:'804 Ballers',other:'RVA Elite'});
  expect(pins).toEqual([{
   slug:'bellmeade-park',name:'Bellemeade Park',locality:'Richmond',crewId:'804',
   crewName:'804 Ballers',defenses:3,latitude:37.51,longitude:-77.43
  }]);
 });
 it('uses a safe display fallback when the crew name is not loaded',()=>{
  const pins=buildCrewTerritoryMapPins([
   {court_slug:'bellmeade-park',crew_id:'missing-crew',successful_defenses:0}
  ],[court()],{});
  expect(pins[0].crewName).toBe('Controlling Crew');
 });
 it('never renders a negative defense count',()=>{
  const pins=buildCrewTerritoryMapPins([
   {court_slug:'bellmeade-park',crew_id:'804',successful_defenses:-1}
  ],[court()],{804:'804 Ballers'});
  expect(pins).toHaveLength(0);
 });
 it('ranks crews by controlled courts, then verified defenses, and aggregates their localities',()=>{
  const pins: CrewTerritoryMapPin[]=[
   {slug:'a',name:'Court A',locality:'Richmond',crewId:'804',crewName:'804 Ballers',defenses:2,latitude:37.5,longitude:-77.4},
   {slug:'b',name:'Court B',locality:'Henrico',crewId:'804',crewName:'804 Ballers',defenses:1,latitude:37.6,longitude:-77.4},
   {slug:'c',name:'Court C',locality:'Norfolk',crewId:'757',crewName:'757 Hoopers',defenses:5,latitude:36.8,longitude:-76.2},
  ];
  expect(buildCrewTerritoryLeaderboard(pins)).toEqual([
   {crewId:'804',crewName:'804 Ballers',courtsHeld:2,successfulDefenses:3,localities:['Henrico','Richmond']},
   {crewId:'757',crewName:'757 Hoopers',courtsHeld:1,successfulDefenses:5,localities:['Norfolk']},
  ]);
 });
 it('mounts the interactive and filterable territory layer with truthful map labeling',()=>{
  const map=readFileSync(join(process.cwd(),'src/components/runs/AccurateVirginiaMap.tsx'),'utf8');
  const world=readFileSync(join(process.cwd(),'src/components/runs/RunsWorldGame.tsx'),'utf8');
  expect(map).toContain("id:'rch-crew-territory-glow'");
  expect(map).toContain("map.on('click','rch-crew-territory-glow'");
  expect(map).toContain("layer==='territory'");
  expect(world).toContain('statewideTerritoryPins');
  expect(world).toContain('not neighborhood boundaries');
 });
});
