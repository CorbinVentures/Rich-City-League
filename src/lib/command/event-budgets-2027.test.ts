import { describe,expect,it } from 'vitest';
import { INITIAL_EVENT_BUDGETS,calculateEventBudget } from './event-budgets-2027';

describe('RCH 2027 event budget figures',()=>{
 const byKey=(key:string)=>INITIAL_EVENT_BUDGETS.find(x=>x.event_key===key)!;
 it.each([
  ['bmf',2680,2515.8,164.2],
  ['cup',16550,7881.9,8668.1],
  ['tryouts',1500,1310,190],
  ['shootout',14600,9953,4647],
  ['full_team',10600,6091.9,4508.1]
 ])('%s matches the approved Excel assumptions', (key,gross,expenses,profit)=>{
  const result=calculateEventBudget(byKey(key));
  expect(result.revenue).toBeCloseTo(gross,2);
  expect(result.expenses).toBeCloseTo(expenses,2);
  expect(result.prePrizeProfit).toBeCloseTo(profit,2);
 });
 it('preserves all-in jersey and belt totals',()=>{
  const cup=calculateEventBudget(byKey('cup'));
  const shootout=calculateEventBudget(byKey('shootout'));
  expect(cup.jerseys).toBe(1440);
  expect(shootout.jerseys).toBe(1296);
  expect(cup.belts).toBe(299);
  expect(shootout.belts).toBe(299);
 });
 it('never treats an unapproved Shootout prize as approved profit',()=>{
  const shootout=calculateEventBudget(byKey('shootout'));
  expect(shootout.netProfit).toBeNull();
  expect(shootout.prePrizeProfit).toBe(4647);
 });
 it('rolls up to $41,151.40 profit before the prize',()=>{
  const total=INITIAL_EVENT_BUDGETS.reduce((sum,p)=>sum+calculateEventBudget(p).annualProfitBeforePrize,0);
  expect(total).toBeCloseTo(41151.4,2);
 });
});
