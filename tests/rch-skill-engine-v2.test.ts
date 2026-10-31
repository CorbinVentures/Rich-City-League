import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20261031123417_rch_skill_engine_v2.sql');
const ui=read('src/components/rep/SkillMasteryCollection.tsx');
const desk=read('src/components/runs/RunSkillEvidenceDesk.tsx');
const room=read('src/app/runs/[id]/page.tsx');

describe('RCH Skill Engine V2: earned mastery, not participation',()=>{
 it('records one individually verified receipt per completed ranked match',()=>{
  for(const field of [
   'primary key(match_id,profile_id)',
   "m.status<>'verified'",
   "r.status<>'completed'",
   'public.run_ranked_match_players',
   'public.run_checkins',
   "actor=p_player",
   "actor=s.recorded_by or actor=s.profile_id",
   "review_status='verified'",
  ])expect(migration).toContain(field);
  expect(migration).toContain('three_made<=three_attempted');
  expect(migration).toContain('p_points>v_team_score');
 });
 it('permits only authorized officials and uses independent two-person review',()=>{
  expect(migration).toContain('public.is_staff_or_admin()');
  expect(migration).toContain("'scorekeeper','cohost'");
  expect(migration).toContain('Only an authorized event scorekeeper');
  expect(migration).toContain('different independent reviewer');
  expect(migration).toContain('revoke all on public.rch_match_skill_box_scores');
  expect(migration).toContain('enable row level security');
  expect(migration).toContain('rch_skill_stats_owner_read');
  expect(migration).toContain('source_note');
 });
 it('scores nine disciplines and differentiates 1v1 through 5v5',()=>{
  for(const code of ['certified_bucket','winning_scorer','glass_cleaner','floor_general',
   'double_double','sniper','ball_hawk','rim_protector','two_way_threat'])expect(migration).toContain(code);
  for(const format of ["'1v1'","'2v2'","'3v3'","'4v4'","'5v5'"])expect(migration).toContain(format);
  expect(migration).toContain("x.three_made*100>=x.three_attempted*40");
  expect(migration).toContain("e.game_format<>'1v1'");
  expect(migration).toContain('x.good_scoring and x.won');
  expect(migration).toContain('count(distinct q.match_id)');
  expect(migration).toContain('count(distinct q.run_id)');
 });
 it('sets hard multi-session tiers with no XP, REP or purchased mastery shortcut',()=>{
  for(const threshold of ['q>=3 and sessions>=2','q>=8 and sessions>=4',
   'q>=20 and sessions>=8','q>=40 and sessions>=12','q>=75 and sessions>=20'])
   expect(migration).toContain(threshold);
  const skillSource=migration.slice(migration.indexOf('create function public.get_rch_skill_mastery'));
  expect(skillSource).not.toContain('xp_transactions');
  expect(skillSource).not.toContain('rch_rep_orders');
  expect(skillSource).not.toContain('run_competitive_box_scores');
  expect(skillSource).toContain("s.review_status='verified'");
 });
 it('retains historical one-time awards but stops minting new one-game stat badges',()=>{
  const start=migration.indexOf('create or replace function public.rch_reward_verified_run_stats()');
  const end=migration.indexOf('drop function if exists public.get_rch_skill_mastery(uuid);');
  const legacyReward=migration.slice(start,end);
  expect(legacyReward).not.toContain('insert into public.rch_run_stat_badges');
  expect(legacyReward).toContain('rch_run_stat_rewards');
  expect(migration).toContain('rch_skill_evidence_corrections');
  expect(migration).toContain('rch_revoke_match_skill_stats');
 });
 it('connects MyPLAYER progression and the official Runs scorekeeper experience',()=>{
  expect(ui).toContain('get_rch_skill_mastery');
  expect(ui).toContain('qualifying_sessions');
  expect(ui).toContain('Next upgrade');
  expect(desk).toContain('rch_submit_match_skill_stats');
  expect(desk).toContain('rch_review_match_skill_stats');
  expect(desk).toContain("field==='points'");
  expect(room).toContain('<RunSkillEvidenceDesk runId={run.id} />');
 });
});
