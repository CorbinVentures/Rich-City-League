import {describe,expect,it} from 'vitest';
import {calculateMemberActivation,type CohortAction,type CohortMember} from '../src/lib/rch-member-activation';

const day=86_400_000;
const now=Date.parse('2026-10-31T12:00:00Z');
const joined=(id:string,ageDays:number,system=false):CohortMember=>({
 id,created_at:new Date(now-ageDays*day).toISOString(),is_system_account:system,
});
const acted=(profile_id:string,daysAgo:number,type:CohortAction['type']='post'):CohortAction=>({
 profile_id,created_at:new Date(now-daysAgo*day).toISOString(),type,
});
describe('authoritative RCH activation metrics',()=>{
 it('excludes system accounts, unknown accounts, future actions and pre-signup rows',()=>{
  const result=calculateMemberActivation([joined('real',80),joined('bot',80,true)],
   [acted('real',79),acted('real',70,'follow'),acted('bot',79),acted('other',70),acted('real',90)],now);
  expect(result.members).toBe(1);
  expect(result.activated7d).toEqual({eligible:1,returned:1,rate:100});
  expect(result.activeHumanContributors7d).toBe(0);
 });
 it('only counts matured cohorts for days 7-14 and 30-60',()=>{
  const members=[joined('old',80),joined('young',5)];
  const actions=[acted('old',79),acted('old',70,'follow'),acted('old',35),acted('young',2)];
  const result=calculateMemberActivation(members,actions,now);
  expect(result.activated7d).toEqual({eligible:1,returned:1,rate:100});
  expect(result.repeat7d).toEqual({eligible:1,returned:1,rate:100});
  expect(result.repeat30d).toEqual({eligible:1,returned:1,rate:100});
 });
 it('does not infer a retention percentage when no one has matured',()=>{
  const result=calculateMemberActivation([joined('new',1)],[acted('new',0)],now);
  expect(result.repeat7d).toEqual({eligible:0,returned:0,rate:null});
  expect(result.repeat30d).toEqual({eligible:0,returned:0,rate:null});
 });
 it('counts distinct human post contributors separately from follow/check-in actions',()=>{
  const members=[joined('one',70),joined('two',70)];
  const actions=[acted('one',2),acted('one',1),acted('two',1,'follow')];
  expect(calculateMemberActivation(members,actions,now).activeHumanContributors7d).toBe(1);
 });
});
