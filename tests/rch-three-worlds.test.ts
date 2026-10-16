import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const sql=read('supabase/migrations/20261016235000_rch_court_masters_takeovers.sql');
const cup=read('supabase/migrations/20261016235100_rch_cup_year_round_qualifiers.sql');
const rewards=read('supabase/migrations/20261016235200_rch_verified_run_stat_rewards.sql');
const runs=read('src/app/runs/page.tsx');
const crews=read('src/app/crews/page.tsx');
const masters=read('src/components/runs/CourtDominion.tsx');
const crewBoard=read('src/components/crews/CrewPowerBoard.tsx');

describe('Three separate overlapping RCH competitive worlds',()=>{
 it('makes Runs its own statewide individual REP and three-masters-per-court experience',()=>{
  expect(runs).toContain('<CourtDominion initialCourt=');
  expect(runs).not.toContain('<CompetitiveCircuit variant="runs"');
  for(const division of ['1v1','2v2','3v3'])expect(masters).toContain(division);
  expect(sql).toContain("m.status='verified'");
  expect(sql).toContain("r.location_slug=p_court");
  expect(sql).toContain('get_rch_court_masters');
  expect(sql).toContain('e.played>=3 and e.sessions>=2');
  expect(sql).toContain("s.review_status='verified'");
 });
 it('gives Crews standalone statewide ranks and a local territory stamp',()=>{
  expect(crews).toContain('<CrewPowerBoard />');
  expect(crews).toContain('<CourtDominion showTakeovers />');
  expect(crews).not.toContain('<CompetitiveCircuit variant="crews"');
  expect(crewBoard).toContain("p_cycle:0");
  expect(sql).toContain('rch_court_territories');
  expect(sql).toContain('get_rch_court_crew_standings');
  expect(masters).toContain("owner.crew_name");
  expect(masters).toContain("owner.logo_path");
 });
 it('allows only eligible captains to challenge and defenders to accept',()=>{
  expect(sql).toContain('c.captain_id=v_actor');
  expect(sql).toContain('Only the defending crew captain may answer');
  expect(sql).toContain('Register your crew for the selected Run before challenging');
  expect(sql).toContain('Register the defending crew for the selected Run before accepting');
  expect(sql).toContain("status='accepted'");
  expect(sql).toContain("new.submitted_at>=c.accepted_at");
  expect(sql).toContain("new.status='verified'");
  expect(sql).toContain('rch_one_open_takeover_per_court');
 });
 it('awards exact triple win REP for a successful defense, without self-awarded matches',()=>{
  expect(sql).toContain("when v_reason='takeover_defense' then 90");
  expect(sql).toContain("when v_won then 30 else 10");
  expect(sql).toContain('primary key(match_id,profile_id)');
  expect(sql).toContain('rch_run_badge_awards');
  expect(sql).toContain('run_ranked_matches');
  expect(sql).toContain("after update of status");
  expect(sql).not.toContain('grant insert on public.rch_run_rep_events');
 });
 it('awards capped basketball stat bonuses and scoring, rebounding and assist badges only after independent review',()=>{
  expect(rewards).toContain("new.review_status<>'verified'");
  expect(rewards).toContain('least(30,');
  expect(rewards).toContain("'scorer_20'");
  expect(rewards).toContain("'glass_cleaner'");
  expect(rewards).toContain("'floor_general'");
  expect(rewards).toContain('rch_run_stat_rewards');
  expect(rewards).toContain('rch_run_stat_badges');
  expect(masters).toContain('Your verified Run badges');
 });
 it('keeps exclusive Cup qualification separate but sourced from verified year-round Run performance',()=>{
  expect(cup).toContain("make_timestamptz(p_cycle,1,2,0,0,0,'America/New_York')");
  expect(cup).toContain("make_timestamptz(p_cycle,12,21,0,0,0,'America/New_York')");
  expect(cup).toContain("m.status='verified'");
  expect(read('src/components/circuit/CompetitiveCircuit.tsx')).toContain("const heading='The Commonwealth Cup · Elite Championship'");
  expect(read('src/components/commonwealth/CommonwealthExperience.tsx')).toContain('<CompetitiveCircuit variant="cup" />');
 });
});
