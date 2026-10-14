import {describe,expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {RCL_STAFF_ROLES,roleInfo} from '../src/lib/rcl-staff-roles';
import {ADMIN_STAFF_TOOLS,staffDeskHref} from '../src/lib/rcl-staff-admin-tools';
const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
describe('RCL administrator cross-role access',()=>{
 it('offers an administrator entrance to every real staff role',()=>{
  expect(Object.keys(ADMIN_STAFF_TOOLS).sort()).toEqual(RCL_STAFF_ROLES.map(r=>r.id).sort());
  for(const info of RCL_STAFF_ROLES){
   const href=staffDeskHref(info.id);
   expect(href).toBe('/staff/desk/'+info.id);
   expect(ADMIN_STAFF_TOOLS[info.id].length).toBeGreaterThanOrEqual(3);
   for(const action of ADMIN_STAFF_TOOLS[info.id]){
    expect(action.href.startsWith('/')).toBe(true);
    const pathname=action.href.split('#')[0].split('?')[0];
    expect(existsSync(join(process.cwd(),'src/app',pathname,'page.tsx'))).toBe(true);
   }
  }
  expect(staffDeskHref('franchise_owner','test team')).toBe('/staff/desk/franchise_owner?team=test%20team');
  expect(roleInfo('franchise_owner')?.teamRequired).toBe(true);
 });
 it('verifies real auth and individual assignments before opening a role desk',()=>{
  const code=file('src/app/staff/desk/[role]/page.tsx');
  expect(code).toContain('await db.auth.getUser()');
  expect(code).toContain("profile.role==='admin'");
  expect(code).toContain("eq('active',true)");
  expect(code).toContain("if(!admin&&!(assignments?.length))");
  expect(code).toContain("availableTeams.find(t=>t.id===requested)");
  expect(code).not.toContain('update public.profiles');
  expect(code).not.toContain("db.from('rcl_staff_assignments').insert");
 });
 it('guards administrator switchboard with server-side role authorization',()=>{
  const code=file('src/app/admin/staff/workspaces/page.tsx');
  expect(code).toContain('await db.auth.getUser()');
  expect(code).toContain("profile?.role!=='admin'");
  expect(code).toContain("!profile.is_active");
  expect(code).toContain("staffDeskHref(r.id)");
 });
 it('verifies franchise admin privilege against database and never fabricates ownership',()=>{
  const code=file('src/components/StaffFranchiseOffice.tsx');
  expect(code).toContain("db.rpc('is_admin')");
  expect(code).toContain("db.rpc('rcl_has_staff_assignment'");
  expect(code).toContain("adminTeams");
  expect(code).toContain("ADMINISTRATOR INSPECTION");
  expect(code).not.toContain("from('rcl_staff_assignments').insert");
 });
 it('keeps ordinary franchise applications and staff approvals separate from admin entry',()=>{
  const code=file('src/components/StaffRolePortal.tsx');
  expect(code).toContain('Administrator staff role switcher');
  expect(code).toContain('{!isAdmin&&(');
  expect(code).toContain('staffDeskHref(a.role_code');
  expect(file('src/components/AdminWorkspace.tsx')).toContain("href: '/admin/staff/workspaces'");
 });
});
