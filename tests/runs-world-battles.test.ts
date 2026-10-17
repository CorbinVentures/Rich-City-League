import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildBattleDisplays,shortBattleDate,type BattleChallengeRow} from '../src/lib/runs-world-battles';

const challenge=(overrides:Partial<BattleChallengeRow>={}):BattleChallengeRow=>({
 id:'one',court_slug:'court-1',run_id:'run-1',challenger_crew_id:'challenger',
 defender_crew_id:'defender',winning_crew_id:null,status:'requested',
 created_at:'2026-10-17T17:00:00Z',resolved_at:null,...overrides
});
const courtNames={'court-1':'Real Park'};
const crewNames={challenger:'Crew Electric',defender:'Team Crown',challenger2:'Other Crew'};
const runs={'run-1':'2026-10-24T15:00:00Z'};

describe('Runs World cinematic battles',()=>{
 it('renders only recorded eligible challenge states, without inventing wins',()=>{
  const rows=buildBattleDisplays([
   challenge(),
   challenge({id:'other',status:'accepted',challenger_crew_id:'challenger2'}),
   challenge({id:'finished',status:'resolved',winning_crew_id:'defender',resolved_at:'2026-10-18T15:00:00Z'}),
   challenge({id:'declined',status:'declined'})
  ],courtNames,crewNames,runs);
  expect(rows).toHaveLength(3);
  expect(rows.map(r=>r.status)).toEqual(['requested','accepted','resolved']);
  expect(rows[0]).toMatchObject({court:'Real Park',challenger:'Crew Electric',defender:'Team Crown',winner:null});
  expect(rows[2].winner).toBe('Team Crown');
  expect(rows[2].runAt).toBe('2026-10-24T15:00:00Z');
 });
 it('never treats a requested or accepted battle as an official winner',()=>{
  for(const status of ['requested','accepted'] as const){
   const rows=buildBattleDisplays([challenge({status,winning_crew_id:'defender'})],courtNames,crewNames,runs);
   expect(rows[0].winner).toBeNull();
  }
  expect(buildBattleDisplays([challenge({status:'resolved',winning_crew_id:null})],courtNames,crewNames,runs)[0].winner).toBeNull();
 });
 it('handles absent details without fake court locations or schedules',()=>{
  const rows=buildBattleDisplays([challenge()],{}, {}, {});
  expect(rows[0].court).toBe('Virginia Court');
  expect(rows[0].challenger).toBe('Registered challenger');
  expect(rows[0].runAt).toBeNull();
  expect(shortBattleDate(null)).toBe('Schedule pending');
  expect(shortBattleDate('bad')).toBe('Schedule unavailable');
 });
 it('mounts the authentic battleboard and visible player HUD without altering game results',()=>{
  const file=readFileSync(join(process.cwd(),'src/components/runs/RunsWorldGame.tsx'),'utf8');
  const board=readFileSync(join(process.cwd(),'src/components/runs/RunsWorldBattleScene.tsx'),'utf8');
  expect(file).toContain('<WorldBattleScene');
  expect(file).toContain('<WorldPlayerIdentity');
  expect(file).toContain("db.from('profiles').select('display_name,username,avatar_url')");
  expect(file).toContain('courtSlugs={battleCourtSlugs}');
  expect(board).toContain("db.from('rch_court_takeovers')");
  expect(board).toContain("db.from('commonwealth_crews')");
  expect(board).toContain("db.from('runs')");
  expect(board).toContain('No simulated opponents, invented scores');
 });
});
