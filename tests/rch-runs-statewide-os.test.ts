import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const src=(f:string)=>readFileSync(join(process.cwd(),f),'utf8');
const migration=src('supabase/migrations/20261017001000_rch_runs_statewide_operating_system.sql');
const runRoom=src('src/app/runs/[id]/page.tsx');
const runHub=src('src/app/runs/page.tsx');
const nextUp=src('src/components/runs/RunNextUp.tsx');
const appeals=src('src/components/runs/RunResultAppeals.tsx');
const passport=src('src/components/runs/RunPassport.tsx');
const intelligence=src('src/app/runs/intelligence/page.tsx');

describe('Runs Statewide Operating System',()=>{
 it('protects court queues with server-owned entry and state transitions',()=>{
  expect(migration).toContain('create unique index rch_run_queue_one_active_member');
  expect(migration).toContain('rch_join_run_queue');
  expect(migration).toContain('rch_manage_run_queue');
  expect(migration).toContain('Only the Run organizer can advance Next Up');
  expect(migration).toContain("q.status='called'");
  expect(migration).toContain('enable row level security');
  expect(migration).not.toContain('grant insert on public.rch_run_queue');
  expect(runRoom).toContain('<RunNextUp runId={run.id} hostId={run.host_id}');
  expect(nextUp).toContain("rch_join_run_queue");
  expect(nextUp).toContain("rch_leave_run_queue");
 });
 it('logs separate appeals without overwriting verified ratings',()=>{
  expect(migration).toContain('create table public.rch_run_result_cases');
  expect(migration).toContain('rch_cases_one_active_match');
  expect(migration).toContain('rch_file_run_result_case');
  expect(migration).toContain('rch_review_run_result_case');
  expect(migration).toContain("if v_status='verified'");
  expect(migration).toContain('Verified ratings are immutable');
  expect(runRoom).toContain('<RunResultAppeals');
  expect(appeals).toContain('RCH Competition Integrity');
 });
 it('separates the private skill passport from the staff-only aggregates',()=>{
  expect(migration).toContain('get_rch_run_passport()');
  expect(migration).toContain('get_rch_runs_intelligence(p_days integer default 30)');
  expect(migration).toContain('restricted to authorized RCH staff');
  expect(migration).toContain("p_days not in (7,30,90)");
  expect(runHub).toContain('<RunPassport />');
  expect(runHub).toContain('Statewide Intelligence');
  expect(passport).toContain('Your Run Passport');
  expect(intelligence).toContain('Competition Integrity Desk');
 });
});
