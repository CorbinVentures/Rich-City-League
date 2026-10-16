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

select is((with changed as (
 update public.profiles set display_name='Blocked admin change'
 where id='a2200000-0000-0000-0000-000000000002' returning id
) select count(*)::integer from changed),0,'AAL1 admin cannot modify a different profile directly');
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
select is((with changed as (
 update public.profiles set display_name='Approved admin change'
 where id='a2200000-0000-0000-0000-000000000002' returning id
) select count(*)::integer from changed),1,'AAL2 admin can modify a different profile');
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
select is((with changed as (
 update public.profiles set bio='Normal profile edit'
 where id='a2200000-0000-0000-0000-000000000002' returning id
) select count(*)::integer from changed),1,'regular member can still edit own profile with AAL1');
select lives_ok($$
  insert into public.profile_roles(profile_id,role,status)
  values ('a2200000-0000-0000-0000-000000000002','coach','pending')
$$,'member can request own pending role without enrolling MFA');
select * from finish();
rollback;
