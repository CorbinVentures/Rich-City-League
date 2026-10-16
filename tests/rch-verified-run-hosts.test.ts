import {describe,expect,it} from 'vitest';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
const src=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const sql=src('supabase/migrations/20261017003000_rch_verified_run_host_network.sql');
const host=src('src/app/runs/hosts/page.tsx');
const badge=src('src/components/runs/RunVerifiedSignal.tsx');
const room=src('src/app/runs/[id]/page.tsx');
const hub=src('src/app/runs/page.tsx');

describe('RCH Verified Runs network',()=>{
 it('requires human, independent approval of organizers and individual event quality',()=>{
  expect(sql).toContain('Staff cannot approve their own host credential');
  expect(sql).toContain('An independent RCH staff member must certify your Run');
  expect(sql).toContain('rch_apply_verified_run_host');
  expect(sql).toContain('rch_review_verified_run_host');
  expect(sql).toContain('rch_certify_verified_run');
  expect(sql).toContain("l.verification_status in ('official','provider')");
  expect(sql).toContain("'venue_confirmed','rules_briefed','safety_reviewed'");
  expect(sql).toContain('rch_suspend_verified_run_host');
  expect(sql).toContain('rch_revoke_modified_verified_run');
  expect(sql).not.toMatch(/grant insert on public.rch_run_verifications/i);
 });
 it('makes only actual RCH reviewed events display the badge',()=>{
  expect(room).toContain('<RunVerifiedSignal runId={run.id} />');
  expect(badge).toContain("rch_is_verified_run");
  const accreditation=src('supabase/migrations/20261017003010_rch_verified_run_expiration_guard.sql');
  expect(accreditation).toContain("h.expires_at>now()");
  expect(accreditation).toContain("s.expires_at>now()");
  expect(host).toContain('Verified Runs Network');
  expect(host).toContain('RCH Staff · Verification Desk');
  expect(hub).toContain('href="/runs/hosts"');
 });
 it('activates real-time queue updates without bypassing RLS',()=>{
  expect(sql).toContain('alter publication supabase_realtime add table public.rch_run_queue');
  expect(sql).toContain('enable row level security');
  expect(sql).toContain('grant select on public.rch_verified_run_hosts');
 });
});
