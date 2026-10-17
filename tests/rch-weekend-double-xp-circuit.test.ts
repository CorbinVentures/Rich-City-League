import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=read('supabase/migrations/20261017180000_rch_weekend_double_xp_circuit.sql');
const arena=read('src/app/runs/page.tsx');
const room=read('src/app/runs/[id]/page.tsx');

describe('Weekend Double XP Circuit',()=>{
  it('cycles exactly four parks per eligible city using a stable alternating weekend anchor',()=>{
    expect(migration).toContain('slot between 1 and 4');
    expect(migration).toContain('count(*)=4 and count(distinct c.court_slug)=4');
    expect(migration).toContain("date '2026-10-24'");
    expect(migration).toContain('then v_day+1 else v_day+3');
    expect(migration).toContain("time '11:00'");
    expect(migration).toContain("time '15:00'");
    expect(migration).toContain("at time zone 'America/New_York'");
    expect(migration).toContain('unique(city,weekend_start,slot)');
  });
  it('never manufactures venue reservation, a physical host, or verified attendance',()=>{
    expect(migration).toContain('not a reserved court');
    expect(migration).toContain('not a reserved court or a guaranteed RCH-staffed session');
    expect(migration).toContain("l.access_type='public'");
    expect(migration).toContain("l.verification_status in ('official','provider')");
    expect(migration).not.toContain("insert into public.run_checkins");
    expect(migration).not.toContain("insert into public.run_ranked_matches");
    expect(migration).not.toContain("insert into public.xp_transactions");
  });
  it('keeps 2x rewards server-side for verified games and independently reviewed stats only',()=>{
    expect(migration).toContain('before insert on public.rch_run_rep_events');
    expect(migration).toContain('before insert on public.rch_run_stat_rewards');
    expect(migration).toContain('rch_is_weekend_bonus_eligible(v_run)');
    expect(migration).toContain('new.rep:=new.rep*2');
    expect(migration).toContain('new.rep_bonus:=new.rep_bonus*2');
    expect(migration).toContain('r.location_slug=e.court_slug and r.starts_at=e.starts_at');
    expect(migration).not.toContain("grant insert on public.rch_weekend_circuit_events to authenticated");
    expect(migration).toContain('revoke all on function public.rch_generate_weekend_circuit(integer)');
  });
  it('auto-maintains an eight-week schedule and advertises its real eligibility requirements',()=>{
    expect(migration).toContain("cron.schedule('rch-weekend-double-xp-circuit'");
    expect(migration).toContain('rch_generate_weekend_circuit(8)');
    expect(arena).toContain("rch_weekend_circuit_events");
    expect(arena).toContain('DOUBLE RUNS REP EVERY WEEKEND');
    expect(arena).toContain('player-created Runs remain standard');
    expect(room).toContain('Double rewards apply to independently confirmed ranked games');
  });
});
