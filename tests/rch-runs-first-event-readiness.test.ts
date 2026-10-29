import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const sql=read('supabase/migrations/20261029190000_rch_runs_first_event_attendance_guard.sql');
const room=read('src/app/runs/[id]/page.tsx');
const list=read('src/app/runs/page.tsx');
const media=read('src/app/runs/[id]/highlight/page.tsx');

describe('RUNS Richmond first-event readiness',()=>{
 it('makes attendance depend on signed-in roster + host-issued in-person code',()=>{
  expect(sql).toContain('create or replace function public.rch_issue_run_checkin_code(p_run uuid)');
  expect(sql).toContain('create or replace function public.rch_check_in_with_code(p_run uuid,p_code text)');
  expect(sql).toContain('from public.run_players p where p.run_id=p_run and p.profile_id=v_actor');
  expect(sql).toContain("v_run.starts_at-interval '2 hours'");
  expect(sql).toContain('code_hash');
  expect(sql).toContain('pg_catalog.sha256');
  expect(sql).toContain('rch_weekend_circuit_events e where e.run_id=p_run');
  expect(sql).toContain('revoke all on function public.check_in_to_run(uuid) from public,anon,authenticated;');
  expect(sql).toContain('grant execute on function public.rch_issue_run_checkin_code(uuid)');
 });
 it('prevents reward claims by unconfirmed or absent players',()=>{
  expect(sql).toContain('rch_claim_checked_in_run_highlight');
  expect(sql).toContain('from public.run_checkins c where c.run_id=p_run and c.profile_id=v_actor');
  expect(sql).toContain('revoke all on function public.claim_latest_run_highlight(uuid) from public,anon,authenticated;');
  expect(media).toContain("db.rpc('rch_claim_checked_in_run_highlight'");
  expect(room).toContain("db.rpc('rch_claim_checked_in_run_highlight'");
  expect(room).toContain('Claim +35 XP');
  expect(media).toContain('+35 XP');
 });
 it('never exposes old attendance earning calls in any mobile entry point',()=>{
  expect(room).toContain("db.rpc('rch_check_in_with_code'");
  expect(room).toContain("db.rpc('rch_issue_run_checkin_code'");
  expect(room).toContain('IN-PERSON COURT CHECK-IN · +15 XP');
  expect(list).not.toContain("db.rpc('check_in_to_run'");
  expect(room).not.toContain("db.rpc('check_in_to_run'");
  expect(media).not.toContain("db.rpc('claim_latest_run_highlight'");
  expect(list).not.toContain("db.rpc('claim_latest_run_highlight'");
 });
 it('prevents fabricated completed games and locked-score mutation',()=>{
  expect(sql).toContain('rch_guard_first_event_game_record');
  expect(sql).toContain('m.status in (\'pending\',\'verified\')');
  expect(sql).toContain('Cannot record completed games on suggested open courts');
  expect(sql).toContain('Select two different teams registered for this Run');
  expect(room).toContain('Record an unverified score');
  expect(room).toContain('!suggestedCourt&&!listingStatusUnknown');
 });
});
