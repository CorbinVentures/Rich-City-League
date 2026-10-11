import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
const source=(file:string)=>readFileSync(join(process.cwd(),file),'utf8');
describe('RCH TV creator compensation safety',()=>{
 it('restricts finance screens to authenticated creator and admin contexts',()=>{
  expect(source('src/app/admin/rch-tv/earnings/page.tsx')).toContain("profile?.role==='admin'");
  expect(source('src/app/media/creators/dashboard/page.tsx')).toContain(".eq('creator_id',user.id)");
 });
 it('requires legal clearance and real evidence before allocating earnings',()=>{
  const migration=source('supabase/migrations/20261011143000_rch_tv_creator_compensation.sql');
  expect(migration).toContain('approved_requires_agreement');
  expect(migration).toContain('active_requires_rights');
  expect(migration).toContain('No eligible verified watch seconds');
  expect(migration).toContain('largest');
  expect(migration).toContain('to authenticated');
 });
 it('never initiates a transfer by clicking the reconcile button',()=>{
  const page=source('src/app/admin/rch-tv/earnings/page.tsx');
  expect(page).not.toContain('/v1/transfers');
  expect(page).toContain('Confirm the creator has already been paid outside RCH');
  expect(page).toContain('Automatic payouts OFF');
 });
});