begin;

select plan(15);

set role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'player@example.test', 'not-used', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'coach@example.test', 'not-used', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'staff@example.test', 'not-used', now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'admin@example.test', 'not-used', now())
on conflict (id) do nothing;

update public.profiles set role = 'coach' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
update public.profiles set role = 'staff' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.profiles set role = 'admin' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

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
select throws_ok($$
  select * from public.players
$$, '42501', null, 'anonymous access to private player data is denied');
select results_eq($$
  select column_name::text
  from information_schema.columns
  where table_schema = 'public' and table_name = 'public_players'
  order by ordinal_position
$$, $$ values
  ('id'), ('first_name'), ('last_name'), ('jersey_number'), ('position'),
  ('hometown'), ('photo_url'), ('is_active')
$$, 'public_players exposes only intended fields');
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

set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((with changed as (
  update public.rosters r set is_captain = true
  from public.team_seasons ts
  where r.team_season_id = ts.id
    and ts.team_id = '51111111-1111-1111-1111-111111111111'
  returning r.id
) select count(*) from changed), 1::bigint, 'authorized coach access remains functional');
select is((with changed as (
  update public.rosters r set is_captain = true
  from public.team_seasons ts
  where r.team_season_id = ts.id
    and ts.team_id = '52222222-2222-2222-2222-222222222222'
  returning r.id
) select count(*) from changed), 0::bigint, 'coach access remains scoped to assigned teams');

set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok($$
  insert into public.registrations
    (id, season_id, applicant_id, first_name, last_name, email)
  values
    ('33333333-aaaa-aaaa-aaaa-333333333333', '22222222-2222-2222-2222-222222222222',
     null, 'Staff', 'Managed', 'staff-managed@example.test')
$$, 'authorized staff access remains functional');
select is((with changed as (
  update public.registrations set status = 'approved'
  where id = '22222222-aaaa-aaaa-aaaa-222222222222'
  returning id
) select count(*) from changed), 1::bigint, 'staff can manage another users registration');

set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);
select lives_ok($$
  update public.seasons
  set name = 'Admin Test Season'
  where id = '77777777-7777-7777-7777-777777777777'
$$, 'authorized admin access remains functional');

select * from finish();
rollback;
