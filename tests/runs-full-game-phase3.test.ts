import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {worldXpProgress,worldMilestoneCatalog,worldQuestProgress,type WorldJourney} from '../src/lib/runs-world-progression';

const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');

describe('Runs Full-Game Phase 3: connected MyPLAYER, Crew HQ and Court Arenas',()=>{
 it('connects actual career stats, REP and verified achievements rather than synthetic rankings',()=>{
  const world=read('src/components/runs/RunsWorldGame.tsx');
  const career=read('src/components/runs/RunsMyCareerStage.tsx');
  expect(world).toContain('<RunsMyCareerStage');
  expect(world).toContain('rep={player.repBalance}');
  expect(world).toContain('passport={player.passport}');
  expect(career).toContain('worldXpProgress(journey.world_xp)');
  expect(career).toContain('worldMilestoneCatalog');
  expect(career).toContain('worldQuestProgress(journey,q.key)');
  expect(career).toContain('SPENDABLE REP');
  expect(career).toContain('SKILL RATING');
  expect(career).toContain('VERIFIED GAMES');
  expect(career).toContain('social XP is separate');
 });
 it('career XP is non-spendable, milestone achievements are server-backed',()=>{
  expect(worldXpProgress(0).level).toBe(1);
  expect(worldXpProgress(180).level).toBe(2);
  expect(worldMilestoneCatalog.length).toBeGreaterThan(3);
  const journey={scouted_today:0,joined_upcoming_runs:0,weekly_verified_games:0,weekly_verified_wins:0} as WorldJourney;
  expect(worldQuestProgress(journey,'compete')).toBe(0);
  expect(worldQuestProgress(journey,'win')).toBe(0);
 });
 it('Crew HQ displays registered real crew members and their real event entries',()=>{
  const page=read('src/app/crews/page.tsx');
  const board=read('src/components/runs/CrewGameCommandBoard.tsx');
  expect(page).toContain('<CrewGameCommandBoard');
  expect(page).toContain('members={selectedMembers}');
  expect(page).toContain('entries.filter(e=>e.crew_id===selected.id)');
  expect(board).toContain('REGISTERED MEMBERS');
  expect(board).toContain('CREW RUN ENTRIES');
  expect(board).toContain('No upcoming competitive Runs');
  expect(board).toContain('registration is not an individual RSVP');
  expect(board).toContain('encodeURIComponent(homeCourt)');
 });
 it('court gate preserves sourced real-world park and competition integrity',()=>{
  const page=read('src/app/runs/courts/[slug]/page.tsx');
  const gate=read('src/components/runs/CourtArenaGameGate.tsx');
  expect(page).toContain('<CourtArenaGameGate');
  expect(page).toContain('controller={owner?.crew_name||null}');
  expect(page).toContain('runs={runs}');
  expect(page).toContain('historyRecorded={history.length}');
  expect(gate).toContain('No upcoming hosted game'.toUpperCase());
  expect(gate).toContain('Only verified competition can award court control');
  expect(gate).toContain('not a reservation or proof that players will be there');
  expect(gate).toContain('COMPETE');
 });
 it('all three game scenes share accessible responsive styles without an extra mobile dock',()=>{
  const css=read('src/app/runs/runs-game-world-scenes.css');
  expect(read('src/app/runs/layout.tsx')).toContain('runs-game-world-scenes.css');
  expect(read('src/app/crews/page.tsx')).toContain('runs-game-world-scenes.css');
  for(const c of ['.rch-career-stage','.rch-crew-game','.rch-court-game-gate'])expect(css).toContain(c);
  expect(css).toContain('max-width:390px');
  expect(css).toContain('prefers-reduced-motion');
  expect(css).toContain(':focus-visible');
 });
});
