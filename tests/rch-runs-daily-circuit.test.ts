import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildDailyCircuitPicks,dailyRunEligible,dailyRunJoinable,getDailyPlaybook,rankDailyRuns,scoreDailyRun,virginiaCircuitDay,type DailyCircuitCandidate} from '../src/lib/run-daily-circuit';

const now=Date.parse('2026-10-17T01:00:00Z');
function candidate(partial:Partial<DailyCircuitCandidate>={}):DailyCircuitCandidate{
 return {id:'run-a',host_id:'host-a',title:'Saturday Runs',location:'Richmond, VA',location_slug:'richmond-court',city:'Richmond',starts_at:new Date(now+24*3600000).toISOString(),run_type:'competitive',game_format:'1v1',status:'open',max_players:12,player_count:4,...partial};
}
const src=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('RCH Runs daily opportunity and competitive integrity',()=>{
 it('rotates on Virginia local midnight, not UTC midnight, and remains deterministic',()=>{
  expect(virginiaCircuitDay(Date.parse('2026-10-17T02:00:00Z'))).toBe('2026-10-16');
  expect(virginiaCircuitDay(Date.parse('2026-10-17T04:00:00Z'))).toBe('2026-10-17');
  const a=candidate();
  expect(scoreDailyRun(a,{now,userId:'user-1'})).toEqual(scoreDailyRun(a,{now,userId:'user-1'}));
  expect(rankDailyRuns([a],{now,userId:'user-1'})).toEqual([a]);
 });
 it('never picks cancelled, finished, stale, impossibly distant, or full Runs as actionable',()=>{
  const scenarios=[
   candidate({status:'cancelled'}),candidate({status:'completed'}),
   candidate({starts_at:new Date(now-300000).toISOString()}),
   candidate({starts_at:new Date(now+60*86400000).toISOString()}),
  ];
  scenarios.forEach(run=>expect(scoreDailyRun(run,{now}).value).toBe(-1));
  expect(dailyRunJoinable(candidate({status:'full'}),now)).toBe(false);
  expect(dailyRunJoinable(candidate({player_count:12}),now)).toBe(false);
  expect(dailyRunEligible(candidate({player_count:12}),now)).toBe(false);
  expect(buildDailyCircuitPicks([candidate({player_count:12})],{now}).next).toBe(null);
 });
 it('prioritizes playable matches above more popular full events',()=>{
  const joined=candidate({id:'open',host_id:'one',max_players:10,player_count:2});
  const full=candidate({id:'full',host_id:'two',max_players:10,player_count:10,independently_verified:true,joined:true});
  expect(rankDailyRuns([full,joined],{now})[0].id).toBe('open');
 });
 it('boosts explicit formats, court watch and real near-term relevance rather than social popularity',()=>{
  const watched=candidate({id:'watched',starts_at:new Date(now+12*3600000).toISOString()});
  const unrelated=candidate({id:'unrelated',host_id:'other',location_slug:'other-court',city:'Roanoke',location:'Roanoke, VA',game_format:'5v5',starts_at:new Date(now+10*86400000).toISOString()});
  const ctx={now,preferredFormat:'1v1' as const,cityId:'richmond',watchedCourts:['richmond-court'],userId:'me'};
  expect(scoreDailyRun(watched,ctx).value).toBeGreaterThan(scoreDailyRun(unrelated,ctx).value);
  expect(scoreDailyRun(watched,ctx).reasons).toContain('At a court you watch');
  expect(scoreDailyRun(watched,ctx).reasons).toContain('1v1 fits your game');
 });
 it('diversifies discovery across different hosts and locations when alternatives exist',()=>{
  const runs=[
   candidate({id:'a1',host_id:'A',location_slug:'c1'}),
   candidate({id:'a2',host_id:'A',location_slug:'c1'}),
   candidate({id:'a3',host_id:'A',location_slug:'c1'}),
   candidate({id:'b1',host_id:'B',location_slug:'c2'}),
  ];
  const result=rankDailyRuns(runs,{now});
  expect(result.slice(0,3).map(x=>x.host_id)).toContain('B');
  const picks=buildDailyCircuitPicks(runs,{now});
  expect(picks.next?.id).not.toBe(picks.explore?.id);
  expect(picks.explore?.host_id).not.toBe(picks.next?.host_id);
 });
 it('offers real-world daily playbooks without creating fake results or false REP',()=>{
  expect(getDailyPlaybook(Date.parse('2026-10-19T17:00:00Z')).headline).toBe('KINGMAKER MONDAY');
  expect(getDailyPlaybook(Date.parse('2026-10-20T17:00:00Z')).format).toBe('3v3');
  expect(getDailyPlaybook(Date.parse('2026-10-23T17:00:00Z')).format).toBe('5v5');
  const board=src('src/components/runs/RunDailyCircuit.tsx');
  expect(board).toContain('TODAY&apos;S PLAYBOOK');
  expect(board).toContain('not a scheduled game, automatic reward or verified victory');
  expect(board).toContain('/runs?create=1&format=');
 });
 it('keeps private preferences RLS-only and server validated without inventing score/REP',()=>{
  const migration=src('supabase/migrations/20261017020000_rch_runs_daily_circuit_preferences.sql');
  const board=src('src/components/runs/RunDailyCircuit.tsx');
  const runs=src('src/app/runs/page.tsx');
  for(const signal of [
   'enable row level security',
   'profile_id=(select auth.uid())',
   'cardinality(watched_courts)<=12',
   'is_system_account',
   'p_court is not null and not exists',
   'revoke all on public.rch_run_daily_preferences',
  ])expect(migration).toContain(signal);
  expect(migration).not.toContain('grant update on public.rch_run_daily_preferences');
  expect(board).toContain('rch_set_run_daily_preferences');
  expect(board).toContain('run_competitive_ratings');
  expect(board).toContain('rch_court_master_titles');
  expect(runs).toContain('RunDailyCircuit');
  expect(runs).toContain('rankDailyRuns');
  expect(runs).toContain('rch_run_verifications');
  expect(migration).not.toContain('rch_rep_wallets');
  expect(migration).not.toContain('run_competitive_ratings set');
 });
});
