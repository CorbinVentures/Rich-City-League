import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {RCL_MEMBER_PRIMARY_NAV,RCL_GUEST_MOBILE_NAV,isMemberNavigationActive} from '../src/lib/member-navigation';
import {RCL_PRIMARY_NAV_ITEMS,isPrimaryNavigationActive} from '../src/lib/rcl-navigation';
const file=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');

describe('RCH basketball world journey',()=>{
 it('makes the four core experiences reachable from one mobile tap',()=>{
  expect(RCL_MEMBER_PRIMARY_NAV.map(item=>item.href)).toEqual(['/social','/runs','/league','/draft','/fantasy']);
  expect(RCL_GUEST_MOBILE_NAV.map(item=>item.href)).toEqual(['/','/runs','/league','/draft','/fantasy']);
  expect(RCL_PRIMARY_NAV_ITEMS.map(item=>item.href)).toEqual(['/social','/runs','/league','/draft','/fantasy']);
 });
 it('does not highlight League when Draft or Fantasy is active',()=>{
  for(const route of ['/draft','/draft/board','/fantasy','/fantasy/leagues/x']){
   const selected=RCL_MEMBER_PRIMARY_NAV.filter(item=>isMemberNavigationActive(route,item.href));
   expect(selected.map(item=>item.label)).toEqual([route.startsWith('/draft')?'Draft':'Fantasy']);
   expect(isPrimaryNavigationActive(route,'/league')).toBe(false);
  }
  expect(isMemberNavigationActive('/league/join','/league')).toBe(true);
 });
 it('has direct, honest registration guidance without invented eligibility or REP',()=>{
  const journey=file('src/app/league/join/page.tsx');
  for(const route of ['/register','/runs','/draft','/fantasy','/badges','/crews'])expect(journey).toContain(route);
  expect(journey).toContain('does not guarantee a tryout');
  expect(journey).toContain('verify open dates');
 });
 it('integrates Runs and League directly into the journey',()=>{
  const league=file('src/components/LeagueCenterExperience.tsx');
  const runs=file('src/app/runs/page.tsx');
  expect(league).toContain('Join Rich City League');
  expect(league).toContain('href="/league/join"');
  expect(runs).toContain('href="/league/join"');
  expect(runs).toContain('Join Rich City League');
  expect(league).toContain('XP {state.rep.xp.toLocaleString()}');
  expect(league).not.toContain('REP <strong className="ml-1 text-rcl-blue">{state.rep.xp');
 });
 it('connects Draft to Fantasy while keeping Home social',()=>{
  const draft=file('src/app/draft/page.tsx');
  const fantasy=file('src/app/fantasy/page.tsx');
  const home=file('src/components/social/NetworkHome.tsx');
  expect(draft).toContain('href="/league/join"');
  expect(draft).toContain('href="/fantasy"');
  expect(fantasy).toContain('href="/draft"');
  expect(home).toContain('rch-timeline-home');
 });
});
