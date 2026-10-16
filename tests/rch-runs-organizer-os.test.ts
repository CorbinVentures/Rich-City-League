import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20261016235900_rch_runs_verified_officials_and_ops.sql');
const ops=read('src/components/runs/RunOperationsHQ.tsx');
const room=read('src/app/runs/[id]/page.tsx');

describe('RCH Runs organizer and official competition integrity',()=>{
  it('preserves match evidence and requires independent certification for takeover matches',()=>{
    expect(migration).toContain('rch_guard_verified_title_integrity');
    expect(migration).toContain('rch_before_verified_title_integrity');
    expect(migration).toContain("new.status='verified'");
    expect(migration).toContain('rch_run_title_attestations');
    expect(migration).toContain('new.submitted_at');
    expect(migration).toContain('c.accepted_at');
    expect(migration).toContain('rch_certify_ranked_title_match');
    expect(migration).toContain('v_actor=m.submitted_by');
    expect(migration).toContain('public.commonwealth_crew_members');
    expect(migration).toContain('v_actor=any(m.home_roster)');
  });
  it('denies arbitrary member writes or self-awarded results',()=>{
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.rch_run_operators');
    expect(migration).toContain('Only the run host or RCH staff can appoint officials');
    expect(migration).not.toMatch(/grant (insert|update|delete) on public.rch_run_title_attestations/i);
    expect(migration).toContain('Repeated match limit');
    expect(migration).toContain("old.status='rejected'");
  });
  it('makes scoped organizer operations reachable within existing Run Rooms',()=>{
    expect(room).toContain('<RunOperationsHQ runId={run.id} hostId={run.host_id} />');
    expect(room).toContain('<RunRankedMatchControl');
    expect(ops).toContain('Game Day Readiness');
    expect(ops).toContain('Independent Takeover Certification');
    expect(ops).toContain("rch_manage_run_operator");
    expect(ops).toContain("rch_set_run_operation");
    expect(ops).toContain("rch_certify_ranked_title_match");
    expect(ops).toContain('official_assigned');
    expect(ops).toContain("profile_id',user.id");
  });
});
