import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const file=(name:string)=>readFileSync(join(process.cwd(),name),'utf8');
const db=file('supabase/migrations/20261017015000_rch_runs_partner_hq.sql');
const discover=file('src/app/runs/partners/page.tsx');
const publicPage=file('src/app/runs/partners/[slug]/page.tsx');
const hq=file('src/app/runs/partners/[slug]/hq/page.tsx');
const review=file('src/app/runs/partners/review/page.tsx');
const runs=file('src/app/runs/page.tsx');

describe('RCH verified Runs Partner HQ',()=>{
 it('uses an independent application review with active verified host requirement',()=>{
  expect(db).toContain('create table public.rch_runs_partners');
  expect(db).toContain("status in ('pending','approved','declined','suspended')");
  expect(db).toContain('rch_review_runs_partner');
  expect(db).toContain('public.is_staff_or_admin()');
  expect(db).toContain("p.owner_id=a then raise exception 'You cannot approve your own organization'");
  expect(db).toContain("h.verification_status='approved' and h.expires_at>now()");
  expect(discover).toContain('rch_apply_runs_partner');
  expect(review).toContain('rch_review_runs_partner');
 });
 it('keeps organizations, sessions and members under least-privilege RLS',()=>{
  for(const table of ['rch_runs_partners','rch_runs_partner_members','rch_runs_partner_sessions']){
   expect(db).toContain('alter table public.'+table+' enable row level security');
  }
  expect(db).toContain('revoke all on public.rch_runs_partners');
  expect(db).toContain('grant select on public.rch_runs_partner_members to authenticated');
  expect(db).toContain('Only the approved partner owner may appoint staff');
  expect(db).toContain("m.role='manager'");
  expect(db).not.toContain('grant insert on public.rch_runs_partner_sessions');
 });
 it('creates standard Runs atomically with existing competition and queue infrastructure',()=>{
  expect(db).toContain('public.runs(host_id,title,description,run_type,skill_level,court_name');
  expect(db).toContain('public.rch_runs_partner_sessions(run_id,partner_id,experience,price_cents,created_by)');
  expect(db).toContain("values(v_run,p_partner,p_experience,p_price_cents,a)");
  expect(db).toContain("values(v_run,a,'cohost',p.owner_id)");
  expect(db).not.toContain('rch_rep_credit_internal');
  expect(db).not.toContain('run_ranked_matches set status');
  expect(hq).toContain('rch_create_runs_partner_session');
  expect(hq).toContain('RunVenuePicker');
 });
 it('provides a public directory and branded schedule, plus private real aggregates',()=>{
  expect(discover).toContain('Approved Runs partners');
  expect(publicPage).toContain("'/runs/'+s.run_id");
  expect(hq).toContain('rch_partner_hq_metrics');
  expect(db).toContain('count(distinct c.profile_id)');
  expect(db).toContain("m.status='verified'");
  expect(hq).toContain('advertised fees are not revenue');
  expect(runs).toContain('Runs Partner Network');
  expect(runs).toContain('run.partner.experience');
 });
});
