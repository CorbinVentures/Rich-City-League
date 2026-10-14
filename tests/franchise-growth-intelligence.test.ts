import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const migration=read('supabase/migrations/20261014072000_franchise_growth_intelligence.sql');
const growth=read('src/components/command/CommandGrowthHQ.tsx');

describe('Franchise Growth Intelligence',()=>{
 it('keeps sponsor CRM and campaigns scoped to team-approved franchise owners',()=>{
  expect(migration).toContain("rcl_has_staff_assignment('franchise_owner',p_team_id)");
  expect(migration).toContain('revoke all on function public.rcl_growth_team_access(uuid) from public');
  expect(migration).toContain('public.rcl_growth_team_access(team_id)');
  expect(migration).toContain('for update to authenticated using(public.rcl_growth_team_access(team_id)) with check(public.rcl_growth_team_access(team_id))');
  expect(migration).toContain('enable row level security');
  expect(migration).toContain('revoke all on public.%I from anon');
 });
 it('allows only staff-reviewed public demographic source entries',()=>{
  expect(migration).toContain('source_url text not null');
  expect(migration).toContain('source_year integer not null');
  expect(migration).toContain('where l.fips=rcl_growth_market_facts.fips');
  expect(migration).toContain('with check(public.rcl_command_is_admin())');
  expect(growth).toContain('Requires complete, same-year population data');
  expect(growth).toContain('County income medians are not averaged');
 });
 it('derives court availability signals without calling them actual customers or rentable gyms',()=>{
  expect(migration).toContain('with (security_invoker=true)');
  expect(migration).toContain('mapped_court_records');
  expect(migration).toContain('b.is_active is true');
  expect(growth).toContain('not independently audited venues');
 });
 it('requires evidence before asserting a sponsorship win or campaign performance',()=>{
  expect(migration).toContain("stage <> 'won'");
  expect(migration).toContain('signed_reference');
  expect(migration).toContain('length(trim(evidence_reference))>=6');
  expect(growth).toContain('not automatically ad metrics');
  expect(growth).toContain('No messages were sent');
 });
 it('embeds growth center into the existing admin and franchise owner workspaces',()=>{
  expect(read('src/components/command/CommandFranchiseHQ.tsx')).toContain('<CommandGrowthHQ teamId={selected} teamName={team.name} isAdmin/>');
  expect(read('src/components/StaffFranchiseOffice.tsx')).toContain('<CommandGrowthHQ teamId={team.id} teamName={team.name} isAdmin={isAdmin}/>');
  expect(growth).toContain('network_acquisition_prospects');
  expect(growth).toContain('sourceCandidates');
  expect(growth).toContain('Broad audience strategy (not individual-level targeting)');
  expect(growth).toContain('Campaign execution studio');
 });
});
