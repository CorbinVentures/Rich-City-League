import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
 budgetTemplates,incomeTemplates,expenseTemplates,gameIncomeTemplates,
 gameExpenseTemplates,labelFor,gameTaskRules
} from '../src/lib/command/templates';
import {verifiedPublicProductPrice,allowedSupplierUrl} from '../src/lib/command/pricing';

const file=(p:string)=>readFileSync(join(process.cwd(),p),'utf8');
describe('RCL Command basketball operating playbooks',()=>{
 it('uses stable, non-overlapping income/expense ledger categories',()=>{
  for(const group of [budgetTemplates,incomeTemplates,expenseTemplates]){
   expect(group.length).toBeGreaterThan(10);
   expect(new Set(group.map(t=>t.code)).size).toBe(group.length);
   expect(group.every(t=>t.label.length>4&&t.group.length>2)).toBe(true);
  }
  expect(gameIncomeTemplates.every(t=>incomeTemplates.some(x=>x.code===t.code))).toBe(true);
  expect(gameExpenseTemplates.every(t=>expenseTemplates.some(x=>x.code===t.code))).toBe(true);
  expect(gameIncomeTemplates.some(t=>t.code.startsWith('concession'))).toBe(false);
  expect(labelFor('uniforms_jerseys')).toContain('jersey');
 });
 it('keeps attendance separate from box-office receipts and franchise assumptions',()=>{
  const migration=file('supabase/migrations/20261013223803_command_front_office_v2.sql');
  const quantities=file('supabase/migrations/20261013225310_command_budget_unit_calculations.sql');
  expect(quantities).toContain('planned_amount = round(units * unit_price,2)');
  expect(file('src/components/command/CommandDashboard.tsx')).toContain('cmd-budget-auto-preview');
  expect(migration).toContain('rcl_command_game_reports');
  expect(migration).toContain('paid_attendance');
  expect(migration).toContain('tickets_sold');
  expect(migration).toContain('attendance_source');
  expect(migration).toContain('rcl_command_franchise_models');
  expect(migration).toContain('annual_revenue_multiple');
  expect(migration).toContain('rcl_command_game_checks');
  expect(migration).toContain('rcl_command_is_admin()');
  expect(migration).toContain('rcl_command_price_history');
  const component=file('src/components/command/CommandFranchiseHQ.tsx');
  expect(component).toContain('INSUFFICIENT DATA');
  expect(component).toContain('NOT A MARKET APPRAISAL');
  expect(component).toContain('directTeamRevenue');
 });
 it('shows real supplier prices as references and quote-only data as unknown',()=>{
  const seed=file('supabase/seeds/20261013_command_concession_wholesale.sql');
  expect(seed).toContain('2026-10-13');
  expect(seed).toContain('Restaurant Depot');
  expect(seed).toContain("CHEF'STORE");
  expect(seed).toContain('pack_price is not null');
  expect(seed).toContain('quote_required');
  const catalog=file('src/components/command/CommandConcessionCatalog.tsx');
  expect(catalog).toContain('Actual invoice cost PER UNIT');
  expect(catalog).toContain('price_observed_at');
  expect(catalog).toContain('operator_verified');
  expect(catalog).toContain('This form does not create a purchase');
 });
 it('does not use fake or unrelated prices for automated product refreshing',()=>{
  const trusted='https://www.samsclub.com/ip/Member-s-Mark-Purified-Water-16-9-fl-oz-40-pk/7874202847';
  expect(allowedSupplierUrl(trusted,"Sam's Club")).not.toBeNull();
  expect(allowedSupplierUrl('https://evil.example.com/ip/free',"Sam's Club")).toBeNull();
  expect(allowedSupplierUrl('https://www.samsclub.com/c/kp/water',"Sam's Club")).toBeNull();
  expect(allowedSupplierUrl(trusted,'Restaurant Depot')).toBeNull();
  const good='<script type="application/ld+json">'+JSON.stringify({
    '@type':'Product',name:"Member's Mark Purified Water 40 pk",offers:{price:'4.28',priceCurrency:'USD'}
  })+'</script>';
  expect(verifiedPublicProductPrice(good,"Bottled water — Member's Mark 16.9oz",40)).toBe(4.28);
  expect(verifiedPublicProductPrice(good,"Bottled water — Member's Mark 16.9oz",35)).toBeNull();
  const misleading='<script type="application/ld+json">'+JSON.stringify({
    '@type':'Product',name:'Unrelated popcorn 50ct',offers:{price:'4.28',priceCurrency:'USD'}
  })+'</script>';
  expect(verifiedPublicProductPrice(misleading,"Bottled water — Member's Mark 16.9oz")).toBeNull();
  expect(verifiedPublicProductPrice('not a product page','Snickers')).toBeNull();
  const cron=file('src/app/api/cron/command-prices/route.ts');
  expect(cron).toContain('CRON_SECRET');
  expect(cron).toContain("source_status','published_reference");
  expect(cron).toContain("refresh_status:'needs_review'");
 });
 it('derives operations from schedule and actual evidence, never claiming staffing auto-confirmed',()=>{
  const byKey=new Map(gameTaskRules.map(t=>[t.key,t]));
  expect(byKey.get('confirm_venue')?.type).toBe('auto');
  expect(byKey.get('assign_opponent')?.type).toBe('auto');
  expect(byKey.get('officials_confirmed')?.type).toBe('manual');
  expect(byKey.get('financial_settlement')?.type).toBe('manual');
  const ops=file('src/components/command/CommandSmartOperations.tsx');
  expect(ops).toContain("status==='confirmed'");
  expect(ops).toContain("game_id,check_key");
  expect(ops).toContain('stage');
  expect(ops).toContain('attendanceVerified');
  const dashboard=file('src/components/command/CommandDashboard.tsx');
  for(const tag of ['<CommandGameRevenue/>','<CommandFranchiseHQ/>','<CommandSmartOperations/>','<CommandConcessionCatalog']){
   expect(dashboard).toContain(tag);
  }
 });
});
