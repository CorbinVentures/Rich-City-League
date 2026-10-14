import {describe,expect,it} from 'vitest';
import {COACH_LEVELS,COACH_SPECIALTIES,coachMilestones,emptyCoachIdentity} from '../src/lib/rch-coach-identity';
import {isBrowserPublicRoute} from '../src/lib/rch-mobile-experience';

describe('RCH coach identities are part of normal member profiles',()=>{
 it('is opt-in by default and has no invented official credentials',()=>{
  expect(emptyCoachIdentity.published).toBe(false);
  expect(emptyCoachIdentity.availability).toBe('not_listed');
  expect(COACH_LEVELS).toContain('Youth / Recreation');
  expect(COACH_SPECIALTIES).toContain('Player development');
 });
 it('awards coach profile milestones only for actual entered fields',()=>{
  expect(coachMilestones(emptyCoachIdentity).map(x=>x.id)).toEqual(['coach-network']);
  const populated={...emptyCoachIdentity,headline:'Youth skills coach',city:'Richmond',specialties:['Defense','Player development'],published:true};
  expect(coachMilestones(populated).map(x=>x.id)).toEqual(['coach-network','identity','playbook','discovery']);
  expect(coachMilestones({...populated,published:false}).some(x=>x.id==='discovery')).toBe(false);
 });
 it('offers coach directory as public basketball info but not member profile pages',()=>{
  expect(isBrowserPublicRoute('/coaches')).toBe(true);
  expect(isBrowserPublicRoute('/coaches/join')).toBe(false);
  expect(isBrowserPublicRoute('/social/profile/me')).toBe(false);
  expect(isBrowserPublicRoute('/profile')).toBe(false);
 });
});
