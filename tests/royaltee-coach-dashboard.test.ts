import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const admin=read('src/components/RoyalteeCoachDashboard.tsx');
const signup=read('src/components/RoyalteeEventRegistration.tsx');
const publicSite=read('src/app/league/royaltee/page.tsx');
const authority=read('supabase/migrations/20261014224102_royaltee_scoped_event_admin_registrations.sql');
const writeRpc=read('supabase/migrations/20261015000000_royaltee_registration_management_rpc.sql');
const staffTools=read('src/lib/rcl-staff-admin-tools.ts');
const staffRoles=read('src/lib/rcl-staff-roles.ts');
const scope=read('supabase/migrations/20261015001000_royaltee_partner_admin_scope.sql');

describe('Royaltee 18+ coach dashboard',()=>{
 it('requires explicitly approved Royaltee organization management, not a global cheerleading role',()=>{
  expect(scope).toContain("o.slug = 'royaltee-steppas'");
  expect(scope).toContain("m.member_role in ('owner','manager')");
  expect(scope).not.toContain("s.role_code='cheerleading_coach'");
  expect(authority).not.toContain("s.role_code='cheerleading_coach'");
  expect(authority).toContain("m.member_role in ('owner','manager')");
  expect(authority).not.toMatch(/update\s+public\.profiles\s+set\s+role/i);
  expect(admin).toContain("db.rpc('can_manage_royaltee')");
  expect(admin).toContain('if (data === true) await refresh()');
 });
 it('manages adult Royaltee events, fee snapshots, capacity and private registrations',()=>{
  expect(admin).toContain("from('rcl_royaltee_events')");
  expect(admin).toContain('min_age:18');
  expect(admin).toContain('registration_fee_cents:Math.round(dollars*100)');
  expect(admin).toContain("db.rpc('get_royaltee_event_registration_roster'");
  expect(writeRpc).toContain('public.can_manage_royaltee()');
  expect(writeRpc).toContain("p_payment_status not in ('unpaid','paid','waived')");
  expect(writeRpc).toContain("p_status not in ('registered','checked_in','cancelled')");
 });
 it('provides adults a real registration action without collecting payments or importing youth programs',()=>{
  expect(authority).toContain("interval '18 years'");
  expect(authority).toContain("v_event.status<>'published'");
  expect(authority).toContain('v_event.capacity');
  expect(signup).toContain("db.rpc('register_royaltee_event'");
  expect(signup).toContain('No payment is collected on this site.');
  expect(publicSite).toContain('<RoyalteeEventRegistration');
  expect(staffTools).toContain("href:'/league/royaltee/dashboard'");
  expect(staffRoles).toContain("href:'/league/royaltee/dashboard'");
  expect(admin).not.toContain('/admin/league-setup');
 });
});
