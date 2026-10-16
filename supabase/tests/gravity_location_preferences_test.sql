begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values
 ('c1810000-0000-0000-0000-000000000001','authenticated','authenticated','gravity-a@example.test','{"date_of_birth":"1990-01-01"}'::jsonb),
 ('c1810000-0000-0000-0000-000000000002','authenticated','authenticated','gravity-b@example.test','{"date_of_birth":"1990-01-01"}'::jsonb);
set role anon;
select ok(not has_table_privilege('anon','public.gravity_member_location_preferences','select'),'anonymous cannot read synced discovery city');
select throws_ok($$select * from public.gravity_member_location_preferences$$,'42501',null,'anonymous query denied');
set role authenticated;
select set_config('request.jwt.claim.sub','c1810000-0000-0000-0000-000000000001',true);
select lives_ok($$insert into public.gravity_member_location_preferences(profile_id,city_id,radius_miles)
 values ('c1810000-0000-0000-0000-000000000001','richmond',50)$$,'owner can opt in');
select throws_ok($$insert into public.gravity_member_location_preferences(profile_id,city_id,radius_miles)
 values ('c1810000-0000-0000-0000-000000000002','norfolk',50)$$,'42501',null,'cannot create other member preferences');
select throws_ok($$update public.gravity_member_location_preferences set radius_miles=3
 where profile_id='c1810000-0000-0000-0000-000000000001'$$,'23514',null,'invalid distance rejected');
select throws_ok($$update public.gravity_member_location_preferences set city_id='2803 PINE STREET' 
 where profile_id='c1810000-0000-0000-0000-000000000001'$$,'23514',null,'street address rejected');
select is((select count(*)::integer from public.gravity_member_location_preferences),1,'owner sees one own preference');
set role postgres;
insert into public.gravity_member_location_preferences(profile_id,city_id,radius_miles)
values ('c1810000-0000-0000-0000-000000000002','norfolk',25);
set role authenticated;
select set_config('request.jwt.claim.sub','c1810000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.gravity_member_location_preferences),1,'other account preference hidden');
select is((select count(*)::integer from public.gravity_member_location_preferences 
 where profile_id='c1810000-0000-0000-0000-000000000002'),0,'other member is invisible');
select is((select count(*)::integer from public.gravity_member_location_preferences
 where city_id='norfolk'),0,'cannot infer other member city');
update public.gravity_member_location_preferences set city_id='chesterfield' 
 where profile_id='c1810000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.gravity_member_location_preferences
 where profile_id='c1810000-0000-0000-0000-000000000001' and city_id='richmond'),1,'cannot modify another member row');
delete from public.gravity_member_location_preferences
 where profile_id='c1810000-0000-0000-0000-000000000002';
set role postgres;
select is((select city_id from public.gravity_member_location_preferences
 where profile_id='c1810000-0000-0000-0000-000000000002'),'norfolk','other member retained after foreign delete');
set role authenticated;
select set_config('request.jwt.claim.sub','c1810000-0000-0000-0000-000000000001',true);
select lives_ok($$delete from public.gravity_member_location_preferences
 where profile_id='c1810000-0000-0000-0000-000000000001'$$,'owner can disable and remove synced city');
select is((select count(*)::integer from public.gravity_member_location_preferences),0,'opt out leaves no owner row');
select * from finish();
rollback;
