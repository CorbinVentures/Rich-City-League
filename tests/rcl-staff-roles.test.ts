import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RCL_STAFF_ROLES,isRCLStaffRole,roleInfo} from '../src/lib/rcl-staff-roles';

const sql=readFileSync(join(process.cwd(),'supabase/migrations/20261014020745_rcl_staff_assignments.sql'),'utf8');
describe('Rich City League scoped staff roles',()=>{
 it('defines six differentiated roles including approval-required franchise owners',()=>{
  expect(RCL_STAFF_ROLES.map(r=>r.id)).toEqual([
   'league_coach','accountant','video_staff','cheerleading_coach','referee','franchise_owner'
  ]);
  expect(new Set(RCL_STAFF_ROLES.map(r=>r.id)).size).toBe(6);
  expect(roleInfo('franchise_owner')?.teamRequired).toBe(true);
  expect(roleInfo('league_coach')?.teamRequired).toBe(true);
  expect(isRCLStaffRole('admin')).toBe(false);
  expect(RCL_STAFF_ROLES.every(r=>r.actions.every(a=>a.href.startsWith('/')))).toBe(true);
 });
 it('does not turn a staff application into global admin or Command Center authority',()=>{
  expect(sql).toContain('alter table public.rcl_staff_assignments enable row level security');
  expect(sql).toContain('alter table public.rcl_staff_applications enable row level security');
  expect(sql).toContain("status='pending'");
  expect(sql).toContain("if v_actor is null or not public.is_admin()");
  expect(sql).toContain("if v_app.profile_id=v_actor then raise exception 'Self approval is prohibited'");
  expect(sql).toContain("p_decision='approved'");
  expect(sql).toContain("rcl_has_staff_assignment");
  expect(sql).toContain("p_role_code not in ('franchise_owner','league_coach')");
  expect(sql).not.toMatch(/update\s+public\.profiles\s+set\s+role/i);
  expect(sql).not.toMatch(/grant\s+(update|insert)\s+on\s+public\.rcl_staff_assignments\s+to\s+authenticated/i);
 });
 it('revocation disables the assignment and only unlinks coaching records this workflow created',()=>{
  expect(sql).toContain('managed_team_coach boolean not null default false');
  expect(sql).toContain("v_row.role_code='league_coach' and v_row.managed_team_coach");
  expect(sql).toContain('active=false,revoked_at=now(),revoked_by=v_actor');
 });
});
