import {describe,expect,it} from 'vitest';
import {groupSharedCities} from './intelligence-market';

describe('coarse analytics city privacy',()=>{
  const profiles=new Set(['1','2','3','4','5','6']);
  it('suppresses locations with fewer than 3 distinct consenting members',()=>{
    const result=groupSharedCities([
      {profile_id:'1',city_id:'richmond'}, {profile_id:'2',city_id:'richmond'},
      {profile_id:'3',city_id:'norfolk'}, {profile_id:'4',city_id:'norfolk'},
      {profile_id:'5',city_id:'norfolk'},
    ],profiles);
    expect(result.visible).toEqual([{cityId:'norfolk',city:'Norfolk',members:3}]);
    expect(result.hiddenGroupCount).toBe(1);
  });
  it('excludes non-members and unexpected city slugs',()=>{
    const result=groupSharedCities([
      {profile_id:'1',city_id:'richmond'}, {profile_id:'2',city_id:'richmond'},
      {profile_id:'7',city_id:'richmond'}, {profile_id:'3',city_id:'random-place'},
    ],profiles);
    expect(result.visible).toEqual([]);
  });
});
