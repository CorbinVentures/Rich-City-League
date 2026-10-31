import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {verifiedCompetitionHistory,type CompetitiveReceipt} from '../src/lib/runs-competitive-season';
import {worldQuestProgress,type WorldJourney} from '../src/lib/runs-world-progression';
const read=(name:string)=>readFileSync(join(process.cwd(),name),'utf8');
const receipt=(id:string,format:string,won:boolean,when='2026-10-29T19:00:00Z'):CompetitiveReceipt=>({
 id,run_id:'real-'+id,court_slug:'pine-camp',court_name:'Pine Camp',verified_at:when,
 game_format:format,won,xp:120,rep:20
});
describe('Phase 4: Verified Competitive Circuit',()=>{
 it('deduplicates receipts and ignores non-verified/invalid input without awarding progress',()=>{
  const history=verifiedCompetitionHistory([receipt('a','3v3',true),receipt('a','3v3',true),
   {...receipt('bad','1v1',true),verified_at:'invalid'},
   {...receipt('missing','3v3',true),run_id:''},
   receipt('b','3v3',false,'2026-10-27T19:00:00Z')]);
  expect(history.games).toBe(2);
  expect(history.wins).toBe(1);
  expect(history.courts).toBe(1);
  expect(history.formats).toEqual([{format:'3v3',games:2,wins:1,losses:1}]);
  expect(history.latest?.id).toBe('a');
 });
 it('sorts verified game receipts and keeps distinct competitive formats separate',()=>{
  const result=verifiedCompetitionHistory([receipt('x','1v1',true,'2026-10-01T10:00:00Z'),
   receipt('y','5v5',false,'2026-10-29T09:00:00Z'),receipt('z','2v2',true,'2026-10-20T09:00:00Z')]);
  expect(result.receipts.map(x=>x.id)).toEqual(['y','z','x']);
  expect(result.formats.map(x=>x.format)).toEqual(['1v1','2v2','5v5']);
  expect(result.wins).toBe(2);
  expect(verifiedCompetitionHistory(null).games).toBe(0);
 });
 it('does not change weekly missions from local screen activity',()=>{
  const journey={scouted_today:0,joined_upcoming_runs:0,weekly_verified_games:0,weekly_verified_wins:0} as WorldJourney;
  expect(worldQuestProgress(journey,'compete')).toBe(0);
  expect(worldQuestProgress(journey,'win')).toBe(0);
  expect(worldQuestProgress(journey,'unknown')).toBe(0);
 });
 it('offers verified ranked, real crew battle, weekly and Cup panels from one deep-linkable World mode',()=>{
  const world=read('src/components/runs/RunsWorldGame.tsx');
  const hub=read('src/components/runs/RunsCompetitiveCircuit.tsx');
  expect(world).toContain("'battle'|'season'|'missions'");
  expect(world).toContain("<RunsCompetitiveCircuit journey={journey}");
  expect(world).toContain("'battle','season','missions'");
  expect(hub).toContain('<RunRankedLadder/>');
  expect(hub).toContain('<WorldBattleScene cityName={cityName}');
  expect(hub).toContain("weeklyQuestCatalog.filter");
  expect(hub).toContain('QUALIFICATION IS NOT AUTOMATIC');
  expect(hub).toContain('November 2027');
  expect(hub).toContain('get_rch_world_expansion');
  expect(hub).toContain('Verified game history unavailable');
  expect(hub).not.toContain("db.from('run_ranked_matches').insert");
  expect(hub).not.toContain('award_rch_rep');
 });
 it('connects MyPLAYER, Crew HQ, court arenas and home game guide to the new competitive hub',()=>{
  for(const path of [
   'src/components/runs/RunsMyCareerStage.tsx','src/components/runs/CrewGameCommandBoard.tsx',
   'src/components/runs/CourtArenaGameGate.tsx','src/components/runs/RunsJourneyHub.tsx'
  ])expect(read(path)).toContain('mode=season');
 });
 it('keeps original four-button home navigation and responsive accessible reduced-motion design',()=>{
  const world=read('src/components/runs/RunsWorldGame.tsx');
  expect(world).toContain("{id:'player',title:'My Player'");
  expect(world).not.toContain("id:'season',title:");
  const css=read('src/components/runs/runs-competitive-circuit.css');
  expect(css).toContain('@media(max-width:390px)');
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  expect(css).toContain(':focus-visible');
 });
});
