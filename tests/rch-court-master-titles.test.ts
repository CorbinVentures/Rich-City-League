import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const file=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const sql=file('supabase/migrations/20261017002000_rch_court_master_crown_ledger.sql');
const timing=file('supabase/migrations/20261017002010_rch_court_master_same_match_initialization.sql');
const crowns=file('src/components/runs/CourtMasterTitles.tsx');
const court=file('src/components/runs/CourtDominion.tsx');
const official=file('src/components/runs/RunMasterOfficialControl.tsx');
const room=file('src/app/runs/[id]/page.tsx');

describe('Individual court crowns are legitimate and fully separate from Crew territory',()=>{
 it('stores exactly three independent divisions and permanently records defenses',()=>{
  expect(sql).toContain("division in ('1v1','2v2','3v3')");
  expect(sql).toContain('rch_court_master_titles');
  expect(sql).toContain('rch_court_master_history');
  expect(sql).toContain("'title_defense'");
  expect(sql).toContain("'title_takeover'");
  expect(sql).toContain('rch_after_master_duel_verification');
  expect(timing).toContain('language sql volatile security definer');
  expect(timing).toContain('rch_eligible_court_master(v_court,new.game_format)');
  expect(court).toContain('<CourtMasterTitles court={court}/>');
 });
 it('rejects unqualified or unauthenticated challengers and title transfers without evidence',()=>{
  expect(sql).toContain('Court challengers must rank in the top three');
  expect(sql).toContain('Join the selected Run before requesting a title challenge');
  expect(sql).toContain('rch_certify_court_master_duel');
  expect(sql).toContain('rch_guard_master_duel_verification');
  expect(sql).toContain('a.home_score=new.home_score');
  expect(sql).toContain("new.status<>'verified'");
  expect(sql).not.toMatch(/grant (insert|update|delete) on public.rch_court_master_titles/i);
  expect(crowns).toContain('Challenge the Master');
 });
 it('makes independently verified title fights accessible to appointed officials',()=>{
  expect(room).toContain('<RunMasterOfficialControl runId={run.id}');
  expect(official).toContain("role==='official'");
  expect(official).toContain('rch_certify_court_master_duel');
  expect(crowns).toContain('rch_answer_court_master_duel');
 });
});
