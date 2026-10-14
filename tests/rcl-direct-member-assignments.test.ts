import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const sql=readFileSync(join(process.cwd(),'supabase/migrations/20261014033500_direct_staff_member_assignment.sql'),'utf8');
const component=readFileSync(join(process.cwd(),'src/components/StaffDirectAssign.tsx'),'utf8');
const approvals=readFileSync(join(process.cwd(),'src/components/StaffApprovalsDesk.tsx'),'utf8');
describe('admin direct member staff assignments',()=>{
 it('verifies administrator privilege in the database, not client role alone',()=>{
  expect(sql).toContain('v_actor is null or not public.is_admin()');
  expect(sql).toContain('p_profile_id=v_actor');
  expect(sql).toContain('p.is_active=true and p.is_system_account=false');
  expect(sql).toContain('approved_by,managed_team_coach');
  expect(sql).toContain('v_actor,v_created_coach');
  expect(sql).not.toMatch(/update\s+public\.profiles\s+set\s+role/i);
 });
 it('prevents invalid, duplicate and unscoped assignments',()=>{
  expect(sql).toContain("'league_coach','accountant','video_staff','cheerleading_coach','referee','franchise_owner'");
  expect(sql).toContain("p_role_code in ('league_coach','franchise_owner') and p_team_id is null");
  expect(sql).toContain('p_team_id is not null and not exists');
  expect(sql).toContain('a.team_id is not distinct from p_team_id and a.active=true');
  expect(sql).toContain('Member already holds this active assignment');
 });
 it('reconciles pending applications and never removes unrelated coaching records',()=>{
  expect(sql).toContain("and team_id is not distinct from p_team_id and status='pending'");
  expect(sql).toContain("review_note='Assigned directly by RCL administration'");
  expect(sql).toContain('on conflict (team_id,profile_id) do nothing');
  expect(sql).toContain('v_created_coach=found');
 });
 it('lets admins find a member, assign accountant or revoke existing roles',()=>{
  expect(component).toContain("useState<RCLStaffRole>('accountant')");
  expect(component).toContain("from('profiles')");
  expect(component).toContain("db.rpc('rcl_admin_assign_staff_role'");
  expect(component).toContain("db.rpc('rcl_revoke_staff_assignment'");
  expect(component).toContain('Current RCL staff roles');
  expect(approvals).toContain('<StaffDirectAssign');
 });
});
