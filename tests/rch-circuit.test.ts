import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {getCircuitClock} from '../src/lib/circuit-calendar';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20261016195000_rch_runs_crews_cup_circuit.sql');
const circuit=read('src/components/circuit/CompetitiveCircuit.tsx');
const linker=read('src/components/runs/RunCrewTeamLinker.tsx');

describe('Commonwealth circuit annual calendar',()=>{
  it('uses Eastern time at the November qualification boundary',()=>{
    expect(getCircuitClock(new Date('2026-11-01T03:59:59Z'))).toMatchObject({cycle:2026,phase:'open',cupYear:2027});
    expect(getCircuitClock(new Date('2026-11-01T04:00:00Z'))).toMatchObject({cycle:2026,phase:'qualifying',cupYear:2027});
  });
  it('locks qualification after December 20 and recognizes January 1 Cup',()=>{
    expect(getCircuitClock(new Date('2026-12-21T04:59:00Z')).phase).toBe('qualifying');
    expect(getCircuitClock(new Date('2026-12-21T05:00:00Z')).phase).toBe('review');
    expect(getCircuitClock(new Date('2027-01-01T05:00:00Z'))).toMatchObject({cycle:2026,phase:'cup',cupYear:2027});
    expect(getCircuitClock(new Date('2027-01-02T05:00:00Z'))).toMatchObject({cycle:2027,phase:'open',cupYear:2028});
  });
});

describe('Verified competition qualification',()=>{
  it('keeps five divisions and verified matches as the source of truth',()=>{
    expect(circuit).toContain("['1v1','2v2','3v3','4v4','5v5']");
    expect(migration).toContain("m.status='verified'");
    expect(migration).toContain("r.run_type='competitive'");
    expect(migration).toContain("m.verified_at<make_timestamptz(p_cycle+1,1,1");
    expect(migration).toContain("make_timestamptz(p_cycle,11,1,0,0,0,'America/New_York')");
    expect(migration).toContain("make_timestamptz(p_cycle,12,21,0,0,0,'America/New_York')");
  });
  it('keeps crew match identity authenticated and bound to full rosters before results',()=>{
    expect(migration).toContain("c.captain_id=v_actor");
    expect(migration).toContain("v_total<>v_size or v_crew_members<>v_size");
    expect(migration).toContain("Crew identity must be confirmed before match results are submitted");
    expect(migration).toContain("count(distinct s.opponent)");
    expect(linker).toContain("rch_assign_run_team_to_crew");
  });
  it('never turns a provisional ranking or fake score into a championship award',()=>{
    expect(migration).toContain("public.is_staff_or_admin()");
    expect(migration).toContain("now()<make_timestamptz(p_cycle+1,1,1");
    expect(migration).toContain("p_evidence");
    expect(circuit).toContain("provisional");
    expect(circuit).toContain("No entry or championship is guaranteed from rank alone");
  });
  it('preserves separate experiences while sharing only verified results and member identity',()=>{
    expect(read('src/app/runs/page.tsx')).toContain('<CourtDominion initialCourt=');
    expect(read('src/app/crews/page.tsx')).toContain('<CrewPowerBoard />');
    expect(read('src/app/crews/page.tsx')).toContain('<CourtDominion showTakeovers />');
    expect(read('src/components/commonwealth/CommonwealthExperience.tsx')).toContain('<CompetitiveCircuit variant="cup" />');
    expect(read('src/app/runs/[id]/page.tsx')).toContain('<RunCrewTeamLinker runId={run.id} />');
  });
});
