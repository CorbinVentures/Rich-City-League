import {describe,it,expect} from 'vitest';
import {profilePresentation,profileSections} from '../src/lib/profile-presentation';
import {RCL_MEMBER_PRIMARY_NAV,RCL_MEMBER_NAV_GROUPS,isMemberNavigationActive} from '../src/lib/member-navigation';

describe('Role-specific public profiles',()=>{
  it('recognizes players before they have an official roster record',()=>{
    expect(profilePresentation('player',false,false)).toBe('player');
    expect(profilePresentation('fan',true,false)).toBe('player');
  });
  it('uses published coach identity without needing a privileged role',()=>{
    expect(profilePresentation('fan',false,true)).toBe('coach');
    expect(profilePresentation('coach',false,false)).toBe('coach');
    expect(profilePresentation('cheerleading_coach',false,false)).toBe('coach');
    expect(profilePresentation('fan',false,false)).toBe('fan');
    expect(profilePresentation('admin',false,false)).toBe('fan');
  });
  it('keeps fan profiles social and preserves dual-role player history',()=>{
    expect(profileSections('fan',false)).toEqual(['wall','posts','media','badges']);
    expect(profileSections('coach',false)).not.toContain('stats');
    expect(profileSections('coach',true)).toEqual(expect.arrayContaining(['coach','stats','career','highlights','wall']));
    expect(profileSections('player',false)[0]).toBe('highlights');
  });
  it('offers a persistent profile destination and retains fantasy in the menu',()=>{
    expect(RCL_MEMBER_PRIMARY_NAV).toHaveLength(5);
    expect(RCL_MEMBER_PRIMARY_NAV.some(x=>x.href==='/social/profile/me')).toBe(true);
    expect(RCL_MEMBER_NAV_GROUPS.some(g=>g.items.some(x=>x.href==='/fantasy'))).toBe(true);
    expect(isMemberNavigationActive('/social/profile/member-id','/social/profile/me')).toBe(true);
    expect(isMemberNavigationActive('/social/profile/member-id','/social')).toBe(false);
  });
});
