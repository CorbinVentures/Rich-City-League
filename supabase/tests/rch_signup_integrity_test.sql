-- Local CI database only. Each fixture is rolled back.
begin;
select no_plan();
set role postgres;

-- Email/password player onboarding remains complete when DOB and legal proof exist.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values (
 'e55d0000-0000-4000-8000-000000000001','authenticated','authenticated',
 'rch-signup-player@example.test',
 jsonb_build_object('requested_profile_type','player','username','rch_test_handle',
 'first_name','Test','last_name','Player','date_of_birth','1998-01-01',
 'legal_terms_accepted_at',now()::text,'privacy_policy_acknowledged_at',now()::text)
);
select is((select role::text from public.profiles where id='e55d0000-0000-4000-8000-000000000001'),
'player','Requested player account receives non-privileged player role');
select is((select onboarding_complete from public.profiles where id='e55d0000-0000-4000-8000-000000000001'),
true,'Complete legal and age metadata create a complete player profile');

-- Signup is not lost if chosen username is taken, including citext collisions.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values (
 'e55d0000-0000-4000-8000-000000000002','authenticated','authenticated',
 'rch-signup-collision@example.test',
 jsonb_build_object('requested_profile_type','player','username','RCH_TEST_HANDLE',
 'date_of_birth','1998-01-01','legal_terms_accepted_at',now()::text,
 'privacy_policy_acknowledged_at',now()::text)
);
select is((select count(*) from auth.users where id='e55d0000-0000-4000-8000-000000000002'),
1::bigint,'Username collision does not fail Auth user creation');
select is((select username::text from public.profiles where id='e55d0000-0000-4000-8000-000000000002'),
null::text,'Conflicting username stays unclaimed for post-signup selection');

-- Apple/Google identities without DOB/legal metadata must finish safe onboarding.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values (
 'e55d0000-0000-4000-8000-000000000003','authenticated','authenticated',
 'rch-signup-social@example.test',
 '{"provider":"google","name":"Social Member"}'::jsonb
);
select is((select onboarding_complete from public.profiles where id='e55d0000-0000-4000-8000-000000000003'),
false,'Social signup without age/legal proof is preserved as incomplete');
select is((select count(*) from public.fan_profiles where profile_id='e55d0000-0000-4000-8000-000000000003'),
0::bigint,'Incomplete social signup receives no completed fan identity');

-- Self-selected coach is not granted coach permissions.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values (
 'e55d0000-0000-4000-8000-000000000004','authenticated','authenticated',
 'rch-signup-coach@example.test',
 jsonb_build_object('requested_profile_type','coach','username','rch_test_coach',
 'date_of_birth','1998-01-01','legal_terms_accepted_at',now()::text,
 'privacy_policy_acknowledged_at',now()::text)
);
select is((select role::text from public.profiles where id='e55d0000-0000-4000-8000-000000000004'),
'player','Self-selected coach stays non-privileged');
select is((select status from public.profile_roles where profile_id='e55d0000-0000-4000-8000-000000000004' and role='coach'),
'pending','Coach privilege requires review');

set role anon;
select is(public.rch_username_available('rch_test_handle'),false,'Public username preflight sees taken handles');
select is(public.rch_username_available('rch_fresh_unique_20261031'),true,'Public username preflight accepts valid unused handles');
select is(public.rch_username_available('bad-handle'),false,'Public username preflight rejects invalid syntax');

set role postgres;
select * from finish();
rollback;
