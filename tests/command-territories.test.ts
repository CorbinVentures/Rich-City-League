import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const migration=file('supabase/migrations/20261014052000_command_franchise_territories.sql');
const component=file('src/components/command/CommandTerritories.tsx');
const records=[...migration.matchAll(/\('(?<fips>51\d{3})','(?<name>[^']+)','(?<type>county|city)','(?<scope>core|development)','(?<team>[^']+)'\)/g)]
 .map(match=>match.groups!);

describe('RCL Commonwealth territory system',()=>{
 it('covers all Virginia county equivalents exactly once',()=>{
  expect(records).toHaveLength(133);
  expect(records.filter(r=>r.type==='county')).toHaveLength(95);
  expect(records.filter(r=>r.type==='city')).toHaveLength(38);
  expect(new Set(records.map(r=>r.fips)).size).toBe(133);
 });
 it('has 12 active franchise identities and regional divisions',()=>{
  const names=new Set(records.map(r=>r.team));
  expect(names.size).toBe(12);
  for(const name of ['Charlottesville Summit','Norfolk Destroyers','Winchester Phantoms','River City Renegades'])
   expect(names.has(name)).toBe(true);
  for(const division of ['Northern','Central','Western','Coastal & South'])
   expect(migration).toContain(division);
  for(const name of names){
   expect(records.filter(r=>r.team===name&&r.scope==='core').length).toBeGreaterThan(0);
  }
 });
 it('prevents overlaps and restricts territory writes to league administrators',()=>{
  expect(migration).toContain('fips text not null unique');
  expect(migration).toContain('team_id uuid not null unique');
  expect(migration).toContain('enable row level security');
  expect(migration).toContain('revoke all on public.rcl_command_territories,public.rcl_command_territory_localities from anon');
  expect(migration).toContain('public.rcl_command_is_admin()');
  expect(migration).toContain('command_audit_rcl_command_territories');
  expect(migration).toContain('command_audit_rcl_command_territory_localities');
 });
 it('keeps legal protection separate from an approved planning home market',()=>{
  expect(migration).toContain("status text not null default 'approved_market'");
  expect(migration).toContain('signed_agreement_reference');
  expect(migration).toContain('protection_effective_on');
  expect(migration).toContain("status <> 'protected'");
  expect(component).toContain('I verified the signed agreement and league approval');
  expect(component).toContain('not contract-protected');
 });
 it('provides administrator map navigation and audited jurisdiction transfers',()=>{
  expect(file('src/components/command/CommandFranchiseHQ.tsx')).toContain('<CommandTerritories selectedTeamId={selected} onSelectTeam={setSelected}/>');
  expect(component).toContain('virginia-world-fallback.svg');
  expect(component).toContain(".eq('fips',l.fips)");
  expect(component).toContain("updateLocality(l,{territory_id:e.target.value})");
  expect(component).toContain("updateLocality(l,{scope:e.target.value as Locality['scope']})");
 });
});
