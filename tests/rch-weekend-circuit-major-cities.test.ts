import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const sql=readFileSync(join(process.cwd(),'supabase/migrations/20261017190000_major_cities_two_park_activation.sql'),'utf8');
const view=readFileSync(join(process.cwd(),'src/app/admin/runs/weekend-circuit/page.tsx'),'utf8');

describe('Official major-city two-park Weekend Circuit',()=>{
 it('seeds two source-cited official public outdoor parks in twelve additional major cities',()=>{
  const names=['Alexandria','Bristol','Charlottesville','Danville','Fairfax','Fredericksburg',
   'Lynchburg','Norfolk','Petersburg','Roanoke','Virginia Beach','Winchester'];
  for(const name of names){
   const needle="'"+name+"',";
   expect(sql.split(needle).length-1).toBeGreaterThanOrEqual(2);
  }
  expect(sql).toContain("on conflict(slug) do nothing");
  expect(sql).toContain("l.verification_status in ('official','provider')");
  expect(sql).toContain("'Official municipal parks directory'");
  expect(sql).toContain("join public.rch_weekend_circuit_city_targets t on t.city_name=x.city and t.is_major");
  expect(sql).not.toContain("update public.basketball_locations set verification_status");
 });
 it('allows exactly two or four distinct city-verified park sites without duplicate same-day listings',()=>{
  expect(sql).toContain('count(*) in (2,4)');
  expect(sql).toContain('count(distinct lower(trim(l.name)))=count(*)');
  expect(sql).toContain("count(*)=max(c.slot) and min(c.slot)=1");
  expect(sql).toContain("count(*)=4 or (t.is_major and count(*)=2)");
  expect(sql).toContain('v_pool_size=2 then v_day+1');
  expect(sql).toContain("and (e.starts_at at time zone 'America/New_York')::date");
  expect(sql).toContain("where e.city=v_city and e.weekend_start=v_saturday+v_offset*7");
 });
 it('preserves verified-only doubled rep and non-public scheduler access',()=>{
  expect(sql).toContain('rch_generate_weekend_circuit(8)');
  expect(sql).toContain('revoke all on function public.rch_generate_weekend_circuit');
  expect(sql).toContain("This is a suggested meetup, not a reserved court");
  expect(sql).toContain("Double Runs REP applies only to independently confirmed competitive game");
 });
 it('communicates two-park onboarding and four-site upgrades to admins',()=>{
  expect(view).toContain('Two parks (Saturday and Sunday) are sufficient');
  expect(view).toContain('With four sites, weekends alternate');
  expect(view).toContain('Player-created Runs remain 1×');
  expect(view).toContain('qualified_slots>=(c.is_major?2:4)');
 });
});
