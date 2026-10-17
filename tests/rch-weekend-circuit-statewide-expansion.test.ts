import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const sql=read('supabase/migrations/20261017183000_rch_weekend_circuit_statewide_targets.sql');
const world=read('src/lib/virginia-world.ts');
const page=read('src/app/admin/runs/weekend-circuit/page.tsx');
const runs=read('src/app/runs/page.tsx');

describe('Runs Weekend Double REP statewide expansion',()=>{
 it('registers ALL existing Virginia World city targets plus North Chesterfield',()=>{
  const names=[...world.matchAll(/\\{id:'([^']+)',name:'([^']+)',lat:/g)].map(match=>match[1]);
  expect(names.length).toBe(30);
  for(const id of names)expect(sql).toContain("('"+id+"',");
  expect(sql).toContain("('north-chesterfield','North Chesterfield',false)");
  expect(sql).toContain('primary key');
 });
 it('never upgrades community-mapped OSM courts to public approved facilities',()=>{
  expect(sql).toContain("l.verification_status in ('official','provider')");
  expect(sql).toContain("l.access_type='public'");
  expect(sql).toContain("l.venue_type='outdoor'");
  expect(sql).toContain("count(distinct lower(trim(l.name)))");
  expect(sql).toContain("l.verification_status='community'");
  expect(sql).not.toContain("update public.basketball_locations set verification_status");
 });
 it('reports blocked and scheduled cities honestly',()=>{
  for(const state of ['scheduled','ready_to_generate','needs_court_assignment','needs_venue_verification']){
   expect(sql).toContain("'"+state+"'");
   expect(page).toContain(state);
  }
  expect(page).toContain('upcoming_featured_runs');
  expect(page).toContain('qualified_slots');
  expect(page).toContain('is_staff_or_admin');
  expect(page).toContain("onConflict:'city,slot'");
 });
 it('provides an admin entry point while leaving public run creation 1x',()=>{
  expect(runs).toContain('/admin/runs/weekend-circuit');
  expect(page).toContain('Player-created Runs remain 1×');
  expect(page).toContain('Changing a slot does not change existing RSVP locations');
 });
});
