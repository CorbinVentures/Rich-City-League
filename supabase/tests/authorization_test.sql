begin;

select plan(46);

set role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'player@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'coach@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'staff@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'admin@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb)
on conflict (id) do nothing;

delete from public.profiles where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

insert into public.profiles (id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'player'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'coach'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'staff'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin')
on conflict (id) do nothing;

insert into public.seasons (id, league_id, name, slug, start_date, end_date, status, registration_open)
values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Open Test Season', 'open-test', '2026-09-01', '2026-12-31', 'registration', true),
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'Other Test Season', 'other-test', '2027-01-01', '2027-03-31', 'registration', true)
on conflict (id) do nothing;

insert into public.divisions (id, season_id, name)
values
  ('99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777', 'Test Open'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '88888888-8888-8888-8888-888888888888', 'Other Open')
on conflict (id) do nothing;

insert into public.team_coaches (team_id, profile_id)
values ('51111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict (team_id, profile_id) do nothing;

insert into public.players (id, profile_id, first_name, last_name)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test', 'Player')
on conflict (id) do nothing;

insert into public.rosters (team_season_id, player_id)
select ts.id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'
from public.team_seasons ts
where ts.team_id = '51111111-1111-1111-1111-111111111111'
  and ts.season_id = '22222222-2222-2222-2222-222222222222'
on conflict (team_season_id, player_id) do nothing;

insert into public.registrations
  (id, season_id, division_id, applicant_id, first_name, last_name, email)
values
  ('11111111-aaaa-aaaa-aaaa-111111111111', '77777777-7777-7777-7777-777777777777',
   '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Coach', 'Applicant', 'coach@example.test')
on conflict (id) do nothing;

set role anon;
select throws_ok($$select * from public.players$$, '42501', null,
  'anonymous access to private player data is denied');
select is((select count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'public_players'), 9::bigint,
  'public_players exposes exactly the intended number of fields');
select throws_ok($$
  insert into public.registrations (season_id, division_id, applicant_id, first_name, last_name, email)
  values ('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999',
          null, 'Anonymous', 'Applicant', 'anonymous@example.test')
$$, '42501', null, 'anonymous users cannot create registrations');

select throws_ok($rolecheck$select * from public.rcl_staff_applications$rolecheck$,'42501',null,
  'anonymous visitors cannot inspect staff applications');

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($rolecheck$
  insert into public.rcl_staff_applications (profile_id,role_code,team_id,motivation)
  values(auth.uid(),'franchise_owner','51111111-1111-1111-1111-111111111111','Test interest in franchise')
$rolecheck$,'members can request a franchise without acquiring permission');
select is((select count(*) from public.rcl_staff_applications where profile_id=auth.uid()),1::bigint,
 'members can read their own pending role application');
select throws_ok($rolecheck$
  select public.rcl_review_staff_application(
   (select id from public.rcl_staff_applications where profile_id=auth.uid() and role_code='franchise_owner'),
   'approved','not authorized')
$rolecheck$,'P0001','Administrator approval required',
 'members cannot approve their own franchise applications');
select throws_ok($rolecheck$
  insert into public.rcl_staff_assignments(profile_id,role_code,team_id,approved_by)
  values(auth.uid(),'franchise_owner','51111111-1111-1111-1111-111111111111',auth.uid())
$rolecheck$,'42501',null,'ordinary members cannot self-assign franchise ownership');
select is(public.rcl_has_staff_assignment('franchise_owner','51111111-1111-1111-1111-111111111111'::uuid),false,
 'an unapproved franchise application has zero owner access');
select is(public.rcl_has_staff_assignment('franchise_owner'),false,
 'teamless franchise ownership checks are never authorized');
select throws_ok($$
  update public.profiles set is_system_account=true where id=auth.uid()
$$, '42501', 'Only staff can change system-account identity',
  'ordinary members cannot impersonate an official system account');
select throws_ok($$
  update public.profiles set system_account_key='fake-rch' where id=auth.uid()
$$, '42501', 'Only staff can change system-account identity',
  'ordinary members cannot claim official account keys');
select throws_ok($$
  update public.profiles set qualified_referral_count=100 where id=auth.uid()
$$, '42501', 'Referral totals are computed by the server',
  'ordinary members cannot inflate earned referral counts');
select lives_ok($$
  update public.profiles set bio='Basketball member' where id=auth.uid()
$$, 'ordinary members may still edit normal profile fields');
select lives_ok($$
  insert into public.registrations
    (id, season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('22222222-aaaa-aaaa-aaaa-222222222222', '77777777-7777-7777-7777-777777777777',
     '99999999-9999-9999-9999-999999999999', auth.uid(), 'Test', 'Player', 'player@example.test')
$$, 'authenticated users can create their own valid registration');
select throws_ok($$
  insert into public.registrations
    (season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other', 'Applicant', 'other@example.test')
$$, '42501', null, 'registration ownership is enforced');
update public.registrations set notes = 'tampered'
where id = '11111111-aaaa-aaaa-aaaa-111111111111';
select is((select notes from public.registrations where id = '11111111-aaaa-aaaa-aaaa-111111111111'),
  null::text, 'users cannot modify another users registration');
select throws_ok($$
  insert into public.registrations
    (season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
     auth.uid(), 'Closed', 'Season', 'closed@example.test')
$$, '42501', null, 'closed-season registration is denied');
select throws_ok($$
  insert into public.registrations
    (season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('77777777-7777-7777-7777-777777777777', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
     auth.uid(), 'Wrong', 'Division', 'wrong@example.test')
$$, 'P0001', 'Registration division must belong to its season',
  'invalid season and division combinations are denied');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
update public.rosters r set is_captain = true
from public.team_seasons ts
where r.team_season_id = ts.id
  and ts.team_id = '51111111-1111-1111-1111-111111111111';
select is((select r.is_captain from public.rosters r join public.team_seasons ts on ts.id = r.team_season_id
  where ts.team_id = '51111111-1111-1111-1111-111111111111' limit 1), true,
  'authorized coach access remains functional');
update public.games set notes = 'unauthorized'
where id = '66666666-6666-6666-6666-666666666666';
select is((select notes from public.games where id = '66666666-6666-6666-6666-666666666666'),
  null::text, 'coaches cannot manage games outside staff authorization');

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok($$
  select public.configure_system_account(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,'test-official','RCH Official Test')
$$, 'authorized staff can still configure an official system account');
select is((select system_account_key from public.profiles
  where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),'test-official'::text,
  'official account key is updated only through the authorized staff flow');
select throws_ok($$
  update public.profiles set qualified_referral_count=20 where id=auth.uid()
$$, '42501', 'Referral totals are computed by the server',
  'staff cannot directly fabricate referral totals');
select lives_ok($$
  insert into public.registrations
    (id, season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('33333333-aaaa-aaaa-aaaa-333333333333', '22222222-2222-2222-2222-222222222222',
     null, null, 'Staff', 'Managed', 'staff-managed@example.test')
$$, 'authorized staff access remains functional');
update public.registrations set status = 'approved'
where id = '22222222-aaaa-aaaa-aaaa-222222222222';
select is((select status from public.registrations where id = '22222222-aaaa-aaaa-aaaa-222222222222'),
  'approved'::public.registration_status, 'staff can manage another users registration');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select lives_ok($$
  update public.profiles set qualified_referral_count=2
    where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
$$, 'authorized administrators can correct referral totals');
select lives_ok($$
  update public.seasons
  set name = 'Admin Test Season'
  where id = '77777777-7777-7777-7777-777777777777'
$$, 'authorized admin access remains functional');
select lives_ok($$
  update public.profiles set role = 'coach'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
$$, 'administrators can assign profile roles');

select lives_ok($rolecheck$
  select public.rcl_review_staff_application(
   (select id from public.rcl_staff_applications where profile_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and role_code='franchise_owner' and status='pending'),
   'approved','Team approved')
$rolecheck$,'administrators can activate a specific franchise assignment');
select is((select count(*) from public.rcl_staff_assignments where profile_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and role_code='franchise_owner' and active),1::bigint,
 'an approved franchise creates one active scoped owner assignment');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is(public.rcl_has_staff_assignment('franchise_owner','51111111-1111-1111-1111-111111111111'::uuid),true,
 'approved owner access is scoped to their exact team');
select is(public.rcl_has_staff_assignment('franchise_owner'),false,
 'approved owner still has no global owner permission');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select lives_ok($rolecheck$
 select public.rcl_revoke_staff_assignment(
  (select id from public.rcl_staff_assignments where profile_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and role_code='franchise_owner' and active)
 )
$rolecheck$,'administrator can revoke an approved franchise role');

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is(public.rcl_has_staff_assignment('franchise_owner','51111111-1111-1111-1111-111111111111'::uuid),false,
 'revocation immediately removes approved franchise access');

-- Direct administrator assignment to an existing member (no application).
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok($directrole$
 select public.rcl_admin_assign_staff_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,'accountant',null)
$directrole$,'P0001','Administrator authorization required',
 'ordinary members cannot directly grant accounting roles');

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok($directrole$
 select public.rcl_admin_assign_staff_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,'accountant',null)
$directrole$,'P0001','Administrator authorization required',
 'non-admin staff cannot directly assign accountant roles');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok($directrole$
 insert into public.rcl_staff_applications(profile_id,role_code,motivation)
 values(auth.uid(),'accountant','Ready to help reconcile')
$directrole$,'a member can have a pending accountant request');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select lives_ok($directrole$
 select public.rcl_admin_assign_staff_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,'accountant',null)
$directrole$,'admin directly assigns accountant to an existing RCH member');

select is((select count(*) from public.rcl_staff_assignments
 where profile_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and role_code='accountant' and active),1::bigint,
 'direct assignment creates exactly one active role');
select is((select status from public.rcl_staff_applications
 where profile_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and role_code='accountant'), 'approved'::text,
 'direct assignment resolves a preexisting matching application');
select is((select role::text from public.profiles
 where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'coach',
 'accounting staff assignment does not change the normal member profile role');
select throws_ok($directrole$
 select public.rcl_admin_assign_staff_role('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,'accountant',null)
$directrole$,'P0001','Member already holds this active assignment',
 'admin cannot assign the same active role twice');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is(public.rcl_has_staff_assignment('accountant'),true,
 'member sees approved accounting assignment');
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select lives_ok($directrole$
 select public.rcl_revoke_staff_assignment((select id from public.rcl_staff_assignments
 where profile_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and role_code='accountant' and active))
$directrole$,'admin can revoke a directly assigned accounting role');
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is(public.rcl_has_staff_assignment('accountant'),false,
 'direct assignment revocation immediately removes accounting access');

select * from finish();
rollback;
