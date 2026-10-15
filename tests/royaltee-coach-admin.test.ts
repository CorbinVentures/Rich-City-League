import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const migration=readFileSync(join(process.cwd(),'supabase/migrations/20261014183500_royaltee_scoped_event_admin_registrations.sql'),'utf8');
const manager=readFileSync(join(process.cwd(),'src/components/RoyalteeManager.tsx'),'utf8');
const operations=readFileSync(join(process.cwd(),'src/components/RoyalteeOperations.tsx'),'utf8');
const signup=readFileSync(join(process.cwd(),'src/components/RoyalteeEventRegistration.tsx'),'utf8');
const publicPage=readFileSync(join(process.cwd(),'src/app/league/royaltee/page.tsx'),'utf8');

describe('Royaltee coach-scoped administration',()=>{
 it('retains the historical migration without granting global roles',()=>{
  expect(migration).toContain("s.role_code = 'cheerleading_coach'");
  expect(migration).toContain('s.active = true and s.revoked_at is null');
  expect(migration).toContain('s.approved_by is not null');
  expect(migration).toContain("o.slug = 'royaltee-steppas'");
  expect(migration).not.toMatch(/update\s+public\.profiles\s+set\s+role/i);
 });
 it('grants rights only to Royaltee tables and validates adult event registration',()=>{
  expect(migration).toContain('rcl_royaltee_event_registrations');
  expect(migration).toContain('event_id=p_event_id');
  expect(migration).toContain("p.date_of_birth <= (current_date - interval '18 years')::date");
  expect(migration).toContain('for update');
  expect(migration).toContain('v_count >= v_event.capacity');
  expect(migration).toContain('fee_cents_snapshot');
  expect(migration).toContain('revoke all on public.rcl_royaltee_event_registrations from anon, authenticated');
  expect(migration).not.toMatch(/grant\s+all\s+on\s+public\.(profiles|registrations|games)/i);
 });
 it('offers an independent Royaltee HQ without global administrator navigation',()=>{
  expect(manager).toContain('<RoyalteeOperations />');
  expect(manager).toContain("rpc('can_manage_royaltee')");
  expect(operations).toContain('get_royaltee_event_registration_roster');
  expect(operations).toContain("from('rcl_royaltee_events')");
  expect(operations).toContain('registration_fee_cents');
  expect(operations).toContain('payment_status');
  expect(operations).toContain('checked_in_at');
 });
 it('lets adults register from Royaltee event cards via protected RPCs',()=>{
  expect(publicPage).toContain('<RoyalteeEventRegistration event={event}/>');
  expect(signup).toContain('register_royaltee_event');
  expect(signup).toContain('withdraw_royaltee_event');
 });
});
