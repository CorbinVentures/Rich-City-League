begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('a5150000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
 'authenticated','authenticated','neighborhood-test-'||n||'@example.test','{"date_of_birth":"1990-01-01"}'::jsonb
from generate_series(1,35) n;
delete from public.profiles where id::text like 'a5150000-%';
insert into public.profiles(id,role,is_active,onboarding_complete,profile_visibility,is_system_account,created_at)
select id,case when id='a5150000-0000-0000-0000-000000000035' then 'admin'::public.app_role else 'fan'::public.app_role end,true,true,'public',false,now()+interval '1 day'
from auth.users where id::text like 'a5150000-%';
select set_config('request.jwt.claim.sub','a5150000-0000-0000-0000-000000000035',true);
update public.profiles set profile_visibility='private' where id='a5150000-0000-0000-0000-000000000003';
update public.profiles set profile_visibility='friends' where id='a5150000-0000-0000-0000-000000000004';
update public.profiles set is_active=false where id='a5150000-0000-0000-0000-000000000005';
update public.profiles set is_system_account=true where id='a5150000-0000-0000-0000-000000000006';
insert into public.follows(follower_id,following_id) values ('a5150000-0000-0000-0000-000000000001','a5150000-0000-0000-0000-000000000007');
insert into public.blocks(blocker_id,blocked_id) values
 ('a5150000-0000-0000-0000-000000000001','a5150000-0000-0000-0000-000000000008'),
 ('a5150000-0000-0000-0000-000000000009','a5150000-0000-0000-0000-000000000001');
set role anon;
select throws_ok($$select * from public.get_neighborhood_profiles()$$,'42501',null,'anonymous suggestions denied');
select throws_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000002')$$,'42501',null,'anonymous follows denied');
set role authenticated;
select set_config('request.jwt.claim.sub','a5150000-0000-0000-0000-000000000001',true);
select is((select count(*)::int from public.get_neighborhood_profiles()),12,'default card pool bounded');
select is((select count(*)::int from public.get_neighborhood_profiles(999)),24,'large limits clamped');
select is((select count(*)::int from public.get_neighborhood_profiles(-1)),1,'negative limit safe');
select is((select count(*)::int from public.get_neighborhood_profiles(null)),12,'null limit uses default');
select ok(exists(select 1 from public.get_neighborhood_profiles() where id='a5150000-0000-0000-0000-000000000002'),'eligible public member appears');
select ok(not exists(select 1 from public.get_neighborhood_profiles(24) where id='a5150000-0000-0000-0000-000000000001'),'self excluded');
select ok(not exists(select 1 from public.get_neighborhood_profiles(24) where id in ('a5150000-0000-0000-0000-000000000003','a5150000-0000-0000-0000-000000000004')),'private and friends-only excluded');
select ok(not exists(select 1 from public.get_neighborhood_profiles(24) where id in ('a5150000-0000-0000-0000-000000000005','a5150000-0000-0000-0000-000000000006')),'inactive and system accounts excluded');
select ok(not exists(select 1 from public.get_neighborhood_profiles(24) where id='a5150000-0000-0000-0000-000000000007'),'already followed excluded');
select ok(not exists(select 1 from public.get_neighborhood_profiles(24) where id in ('a5150000-0000-0000-0000-000000000008','a5150000-0000-0000-0000-000000000009')),'both directions of blocks excluded');
select throws_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000009')$$,'42501',null,'blocked follow rejected');
select throws_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000003')$$,'42501',null,'private profile follow rejected');
select throws_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000001')$$,'42501',null,'self follow rejected');
select throws_ok($$insert into public.follows(follower_id,following_id) values ('a5150000-0000-0000-0000-000000000002','a5150000-0000-0000-0000-000000000010')$$,'42501',null,'cannot follow on behalf of another member');
select lives_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000002')$$,'eligible follow succeeds');
select lives_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000002')$$,'repeat follow idempotent');
select is((select count(*)::int from public.follows where follower_id='a5150000-0000-0000-0000-000000000001' and following_id='a5150000-0000-0000-0000-000000000002'),1,'one relationship persisted');
select ok(not exists(select 1 from public.get_neighborhood_profiles(24) where id='a5150000-0000-0000-0000-000000000002'),'followed suggestion disappears');
set role postgres;
select set_config('request.jwt.claim.sub','a5150000-0000-0000-0000-000000000035',true);
update public.profiles set is_active=false where id='a5150000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','a5150000-0000-0000-0000-000000000001',true);
select is((select count(*)::int from public.get_neighborhood_profiles()),0,'inactive viewer gets no suggestions');
select throws_ok($$select public.follow_neighborhood_profile('a5150000-0000-0000-0000-000000000010')$$,'42501',null,'inactive viewer cannot follow');
select * from finish();
rollback;
