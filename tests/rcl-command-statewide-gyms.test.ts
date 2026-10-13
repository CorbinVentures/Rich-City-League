import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
const src=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');

describe('RCL Command statewide gym intelligence',()=>{
 const component=src('src/components/command/CommandVenueDirectory.tsx');
 const dashboard=src('src/components/command/CommandDashboard.tsx');
 const migration=src('supabase/migrations/20261013220748_rcl_command_statewide_gyms.sql');
 const seed=src('supabase/seeds/20261013_rcl_virginia_gym_directory.sql');

 it('keeps gym research behind the existing admin-only Command app',()=>{
  expect(dashboard).toContain('<CommandVenueDirectory/>');
  expect(migration).toContain('alter table public.rcl_command_venues');
  expect(component).toContain("db.from('rcl_command_venues')");
  expect(component).not.toContain('service_role');
 });

 it('stores immutable source keys, provenance and rate evidence without fabricated availability',()=>{
  expect(migration).toContain('source_key');
  expect(migration).toContain('source_url');
  expect(migration).toContain('rate_basis');
  expect(migration).toContain('availability_status');
  expect(migration).toContain('rcl_command_venues_source_key_unique');
  expect(seed).toContain('on conflict do nothing');
  expect(seed).toContain('venue_type in (\'indoor\',\'mixed\')');
  expect(seed).not.toContain("'booked'");
 });

 it('honors the maximum $75 base-rental objective without claiming resident rates for outsiders',()=>{
  expect(seed).toContain('nonresident');
  expect(seed).toContain('conditional');
  expect(component).toContain('within_limit');
  expect(component).toContain('over_limit');
  expect(component).toContain('not_rentable');
  expect(dashboard).toContain('POTENTIAL ≤ $75/HR');
 });

 it('distinguishes live bookings from rental windows and lets admins contact source facilities',()=>{
  expect(component).toContain("availabilityInfo");
  expect(component.toLowerCase()).toContain('not confirmed exclusive rental availability');
  expect(component).toContain('tel:');
  expect(component).toContain('mailto:');
  expect(component).toContain('noopener noreferrer');
  expect(component).toContain('.range(page*PAGE_SIZE');
  expect(component).toContain('source_verification');
 });
});
