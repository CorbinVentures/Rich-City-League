begin;
select no_plan();
set role postgres;

-- All fixtures are rolled back. No real users or their factors are read.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values
 ('a2200000-0000-0000-0000-000000000001','authenticated','authenticated','mfa-admin@example.test','{"date_of_birth":"1990-01-01"}'),
 ('a2200000-0000-0000-0000-000000000002','authenticated','authenticated','mfa-member@example.test','{"date_of_birth":"1990-01-01"}');
delete from public.profiles where id in
 ('a2200000-0000-0000-0000-000000000001','a2200000-0000-0000-0000-000000000002');
insert into public.profiles(id,role,is_active)
values
 ('a2200000-0000-0000-0000-000000000001','admin',true),
 ('a2200000-0000-0000-0000-000000000002','fan',true);

set role authenticated;
select set_config('request.jwt.claim.sub','a2200000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a2200000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);

select lives_ok($$update public.profiles set display_name='Blocked admin change'
 where id='a2200000-0000-0000-0000-000000000002'$,'RLS safely filters unauthorized profile update');
select ok((select display_name from public.profiles
 where id='a2200000-0000-0000-0000-000000000002') is distinct from 'Blocked admin change',
 'AAL1 admin cannot modify a different profile directly');
select throws_ok($$
  insert into public.profile_roles(profile_id,role,status)
  values ('a2200000-0000-0000-0000-000000000002','staff','active')
$$,'42501',null,'AAL1 admin cannot grant a privileged role');
select throws_ok($$
  insert into public.staff(profile_id,title)
  values ('a2200000-0000-0000-0000-000000000002','Unauthorized role')
$$,'42501',null,'AAL1 admin cannot create staff records');
select throws_ok($$
  insert into public.site_settings(key,value)
  values ('mfa-qa-setting','{}'::jsonb)
$$,'42501',null,'AAL1 admin cannot change platform settings');

select set_config('request.jwt.claims','{"sub":"a2200000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
select lives_ok($$update public.profiles set display_name='Approved admin change'
 where id='a2200000-0000-0000-0000-000000000002'$,'AAL2 admin update is permitted');
select is((select display_name from public.profiles
 where id='a2200000-0000-0000-0000-000000000002'),'Approved admin change',
 'AAL2 admin actually updates the target');
select lives_ok($$
  insert into public.profile_roles(profile_id,role,status)
  values ('a2200000-0000-0000-0000-000000000002','staff','active')
$$,'AAL2 admin can grant a staff role');
select lives_ok($$
  insert into public.staff(profile_id,title)
  values ('a2200000-0000-0000-0000-000000000002','Test staff record')
$$,'AAL2 admin can assign staff');
select lives_ok($$
  insert into public.site_settings(key,value)
  values ('mfa-qa-setting','{}'::jsonb)
$$,'AAL2 admin can change platform settings');

select set_config('request.jwt.claim.sub','a2200000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a2200000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select lives_ok($$update public.profiles set bio='Normal profile edit'
 where id='a2200000-0000-0000-0000-000000000002'$,'regular member can edit profile at AAL1');
select is((select bio from public.profiles where id=auth.uid()),'Normal profile edit','member profile self-service persists without MFA');
select lives_ok($$
  insert into public.profile_roles(profile_id,role,status)
  values ('a2200000-0000-0000-0000-000000000002','coach','pending')
$$,'member can request own pending role without enrolling MFA');

-- Once a member opts in, AAL1 must not be enough for direct Data API reads.
set role postgres;
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
values ('a2200000-0000-0000-0000-0000000000f2',
        'a2200000-0000-0000-0000-000000000002',
        'totp','verified',now(),now());
set role authenticated;
select set_config('request.jwt.claim.sub','a2200000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a2200000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',true);
select ok(not private.member_mfa_session_authorized(),'opted-in user has no access with password-only session');
select is((select count(*)::integer from public.profiles where id=auth.uid()),0,'opted-in AAL1 session cannot fetch its own private profile directly');
select is((select count(*)::integer from public.get_my_private_profile()),0,'owner-only contact RPC refuses opted-in AAL1 session');
select ok(not public.is_my_profile_adult(),'adult eligibility RPC rejects opted-in AAL1 session');
select set_config('request.jwt.claims','{"sub":"a2200000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}',true);
select ok(private.member_mfa_session_authorized(),'opted-in user permitted with verified AAL2 session');
select is((select count(*)::integer from public.profiles where id=auth.uid()),1,'opted-in AAL2 session can read own profile');

select * from finish();
rollback;
