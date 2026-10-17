import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const sql=file('supabase/migrations/20261017010000_rch_verified_skill_mastery.sql');
const pins=file('supabase/migrations/20261017010100_rch_badge_showcase_pins.sql');
const ui=file('src/components/rep/SkillMasteryCollection.tsx');
const vault=file('src/components/rep/PlaceBadgeVault.tsx');
const profile=file('src/app/social/profile/[id]/page.tsx');
describe('RCH earned skill mastery & collectible showcase',()=>{
 it('requires independently reviewed completed game stats (no purchased skill)',()=>{
  for(const proof of ["s.review_status='verified'","s.reviewed_by<>s.profile_id",
   "s.reviewed_at is not null","r.run_type='competitive'","r.status='completed'",
   "distinct on (s.run_id,s.profile_id)"])expect(sql).toContain(proof);
  expect(sql).not.toContain('rch_rep_orders');
  expect(sql).not.toContain('xp_transactions');
 });
 it('unlocks five trackable skills with five distinct thresholds',()=>{
  for(const skill of ['certified_bucket','winning_scorer','glass_cleaner','floor_general','double_double'])expect(sql).toContain(skill);
  for(const threshold of ['s.q>=30','s.q>=16','s.q>=8','s.q>=3','s.q>=1'])expect(sql).toContain(threshold);
  expect(ui).toContain("get_rch_skill_mastery");
  expect(ui).toContain('verified competitive Runs');
 });
 it('respects private profile visibility and keeps the read API tightly scoped',()=>{
  expect(sql).toContain("p.id=(select auth.uid())");
  expect(sql).toContain("p.profile_visibility,'public') not in ('private','only_me')");
  expect(sql).toContain('where exists(select 1 from allowed_member)');
  expect(sql).toContain('revoke all on function public.get_rch_skill_mastery');
 });
 it('allows only genuine owner-earned medals in five fixed profile showcase slots',()=>{
  expect(pins).toContain('check(slot between 1 and 5)');
  expect(pins).toContain('unique(profile_id,slot)');
  expect(pins).toContain('a.profile_id=(select auth.uid())');
  expect(pins).toContain('enable row level security');
  expect(vault).toContain("rch_badge_showcase_pins");
  expect(vault).toContain('Pin to Top Five');
  expect(profile).toContain("activeTab==='badges' && <PlaceBadgeVault profileId={id}/>");
 });
});
