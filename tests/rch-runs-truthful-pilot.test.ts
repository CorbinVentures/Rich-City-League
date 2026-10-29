import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RUNS truthful-pilot gating',()=>{
 const list=read('src/app/runs/page.tsx');
 const world=read('src/components/runs/RunsWorldGame.tsx');
 const home=read('src/components/runs/RunsCinematicHome.tsx');
 const room=read('src/app/runs/[id]/page.tsx');
 const migration=read('supabase/migrations/20261029170000_rch_runs_truthful_pilot.sql');
 it('keeps automated weekend court suggestions separate from player-hosted discovery',()=>{
  expect(list).toContain('isSuggestedCourt:suggestedCourtIds.has(run.id)');
  expect(list).toContain('if(run.isSuggestedCourt||Date.parse(run.starts_at)<=Date.now())return false;');
  expect(list).toContain('title="Player-hosted Runs"');
  expect(list).toContain('not confirmed games');
  expect(world).toContain('!suggestedIds.has(r.id)');
  expect(home).toContain('candidates.filter(run=>!suggested.has(run.id))');
 });
 it('shows truthful RSVP, host and expired-run states on direct deep links',()=>{
  expect(room).toContain('SUGGESTED OPEN COURT · NOT A CONFIRMED GAME');
  expect(room).toContain('REGISTER INTEREST');
  expect(room).toContain("isPastRun=startMs<=Date.now()");
  expect(room).toContain('!suggestedCourt && now >= startMs');
  expect(room).toContain('Court suggestion');
 });
 it('archives only unstaffed, participant-free stale listings and preserves real records',()=>{
  expect(migration).toContain("e.city <> 'Richmond'");
  expect(migration).toContain("not exists(select 1 from public.run_players");
  expect(migration).toContain("not exists(select 1 from public.run_checkins");
  expect(migration).toContain("not exists(select 1 from public.run_ranked_matches");
  expect(migration).toContain("not exists(select 1 from public.run_games");
  expect(migration).toContain("status='cancelled'");
  expect(migration).toContain('rch_expire_abandoned_circuit_runs');
  expect(migration).toContain("Weekend Court Suggestion");
 });
});
