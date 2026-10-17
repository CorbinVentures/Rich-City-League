import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const src=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
const schema=src('supabase/migrations/20261017005000_rch_crew_rep_treasury.sql');
const page=src('src/app/crews/[id]/treasury/page.tsx');
const ops=src('src/app/rep/operations/crews/page.tsx');
const crews=src('src/app/crews/page.tsx');
describe('non-pay-to-win Crew REP treasury',()=>{
 it('debits personal wallet and credits the crew atomically',()=>{
  expect(schema).toContain("kind='contribution'");
  expect(schema).toContain('rch_contribute_crew_rep');
  expect(schema).toContain('rch_rep_transactions');
  expect(schema).toContain('rch_crew_rep_transactions');
  expect(schema).toContain('for update');
  expect(schema).toContain('Insufficient personal REP');
  expect(schema).toContain('Crew contributions are limited to 1500 REP in 24 hours');
  expect(schema).not.toMatch(/grant (insert|update|delete) on public.rch_crew_rep_wallets/i);
 });
 it('mints nontransferable team REP only on independently verified takeover victories',()=>{
  expect(schema).toContain("new.winning_crew_id<>new.challenger_crew_id");
  expect(schema).toContain("m.status='verified'");
  expect(schema).toContain('rch_earn_crew_rep_takeover');
  expect(schema).toContain("'takeover:'||new.id::text");
  expect(schema).toContain('on conflict(source_key) do nothing');
 });
 it('lets captains spend but independent staff review and refund',()=>{
  expect(schema).toContain('Only the crew captain can request treasury rewards');
  expect(schema).toContain('RCH staff cannot self-review their crew');
  expect(schema).toContain('rch_decide_crew_rep_order');
  expect(schema).toContain("'refund:'||o.id::text");
  expect(page).toContain("rch_redeem_crew_rep");
  expect(page).toContain("rch_contribute_crew_rep");
  expect(ops).toContain('rch_decide_crew_rep_order');
  expect(crews).toContain('Crew REP Treasury');
 });
});