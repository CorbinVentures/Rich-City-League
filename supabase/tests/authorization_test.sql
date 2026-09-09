begin;

select plan(16);

-- Fixtures are created as the database owner, then every assertion runs through
-- the same roles used by Supabase RLS.
set role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'player@example.test', 'not-used', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'coach@example.test', 'not-used', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'staff@example.test', 'not-used', now())
on conflict (id) do nothing;

update public.profiles set role = 'coach' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set role = 'staff' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

insert into public.seasons (id, league_id, name, slug, start_date, end_date, status, registration_open)
values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111',
   'Open Test Season', 'open-test', '2026-09-01', '2026-12-31', 'registration', true),
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111',
   'Other Test Season', 'other-test', '2027-01-01', '2027-03-31', 'registration', true)
on conflict (id) do nothing;

insert into public.divisions (id, season_id, name)
values
  ('99999999-9999-9999-9999-999999999999', '77777777-7777-7777-7777-777777777777', 'Test Open'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'Other Open')
on conflict (id) do nothing;

insert into public.team_coaches (team_id, profile_id)
values ('51111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
on conflict (team_id, profile_id) do nothing;

insert into public.players (id, profile_id, first_name, last_name)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test', 'Player')
on conflict (id) do nothing;

insert into public.rosters (team_season_id, player_id)
select ts.id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
from public.team_seasons ts
where ts.team_id = '51111111-1111-1111-1111-111111111111'
  and ts.season_id = '22222222-2222-2222-2222-222222222222'
on conflict (team_season_id, player_id) do nothing;

set role anon;
select is((select count(*) from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint,
  'anonymous users cannot read private player profile fields');
select throws_ok($$
  insert into public.registrations (season_id, division_id, applicant_id, first_name, last_name, email)
  values ('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999',
          null, 'Anonymous', 'Applicant', 'anonymous@example.test')
$$, '42501', null, 'anonymous users cannot create registrations');

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok($$
  insert into public.registrations
    (id, season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777',
     '99999999-9999-9999-9999-999999999999', auth.uid(), 'Test', 'Player', 'player@example.test')
$$, 'authenticated users can create their own valid registration');
select throws_ok($$
  insert into public.registrations
    (season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('77777777-7777-7777-7777-777777777777', '99999999-9999-9999-9999-999999999999',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other', 'Applicant', 'other@example.test')
$$, '42501', null, 'users cannot create another user registration');
select is((with changed as (
  update public.registrations set notes = 'tampered'
  where id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'
  returning id
) select count(*) from changed), 0::bigint,
  'users cannot modify registrations through another-user management paths');
select throws_ok($$
  insert into public.registrations
    (season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
     auth.uid(), 'Closed', 'Season', 'closed@example.test')
$$, '42501', null, 'registrations for closed seasons are rejected');
select throws_ok($$
  insert into public.registrations
    (season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('77777777-7777-7777-7777-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     auth.uid(), 'Wrong', 'Division', 'wrong@example.test')
$$, 'P0001', 'Registration division must belong to its season',
  'registrations with a division from another season are rejected');

set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((with changed as (
  update public.rosters r set is_captain = true
  from public.team_seasons ts
  where r.team_season_id = ts.id
    and ts.team_id = '51111111-1111-1111-1111-111111111111'
  returning r.id
) select count(*) from changed), 1::bigint, 'coaches can manage their assigned roster');
select is((with changed as (
  update public.rosters r set is_captain = true
  from public.team_seasons ts
  where r.team_season_id = ts.id
    and ts.team_id = '52222222-2222-2222-2222-222222222222'
  returning r.id
) select count(*) from changed), 0::bigint, 'coaches cannot manage another team roster');
select is((with changed as (
  update public.team_seasons set division_id = null
  where team_id = '52222222-2222-2222-2222-222222222222'
  returning id
) select count(*) from changed), 0::bigint, 'coaches cannot modify another team season');
select is((with changed as (
  update public.games set notes = 'unauthorized'
  where id = '66666666-6666-6666-6666-666666666666'
  returning id
) select count(*) from changed), 0::bigint, 'coaches cannot manage games outside staff authorization');

set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok($$
  insert into public.registrations
    (id, season_id, division_id, applicant_id, first_name, last_name, email)
  values
    ('cccccccc-1111-1111-1111-cccccccccccc', '22222222-2222-2222-2222-222222222222',
     null, 'Staff', 'Managed', 'staff-managed@example.test')
$$, 'staff can create an authorized registration');
select is((with changed as (
  update public.registrations set status = 'approved'
  where id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'
  returning id
) select count(*) from changed), 1::bigint, 'staff can manage another users registration');

select * from finish();
rollback;
