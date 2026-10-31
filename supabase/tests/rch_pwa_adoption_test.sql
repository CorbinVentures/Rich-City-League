begin;
select no_plan();
set role postgres;

insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
 ('eede0000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pwa-one@example.test', '{"date_of_birth":"1990-01-01"}'::jsonb),
 ('eede0000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pwa-two@example.test', '{"date_of_birth":"1990-01-01"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, role, is_active, is_system_account)
values
 ('eede0000-0000-0000-0000-000000000001', 'fan', true, false),
 ('eede0000-0000-0000-0000-000000000002', 'fan', true, false)
on conflict (id) do update set is_active = true, is_system_account = false;

set role anon;
select throws_ok(
 $$select public.record_rch_pwa_launch('eede1000-0000-0000-0000-000000000001', 'ios')$$,
 '42501', null, 'anonymous users cannot write PWA launch signals');
select throws_ok(
 $$select count(*) from public.rch_pwa_installations$$,
 '42501', null, 'anonymous users cannot inspect PWA member identity');

set role authenticated;
select set_config('request.jwt.claim.sub', 'eede0000-0000-0000-0000-000000000001', true);
select lives_ok(
 $$select public.record_rch_pwa_launch('eede1000-0000-0000-0000-000000000001', 'ios')$$,
 'signed-in member can report their own standalone PWA launch');
select lives_ok(
 $$select public.record_rch_pwa_launch('eede1000-0000-0000-0000-000000000001', 'ios')$$,
 'repeat reporting window is accepted');
select throws_ok(
 $$select public.record_rch_pwa_launch('eede1000-0000-0000-0000-000000000002', 'desktop')$$,
 '22023', 'Invalid PWA launch metadata', 'non-mobile platform is rejected');
select throws_ok(
 $$select count(*) from public.rch_pwa_installations$$,
 '42501', null, 'ordinary members cannot inspect the recorded identities');
select throws_ok(
 $$insert into public.rch_pwa_installations (profile_id, installation_id, platform)
 values ('eede0000-0000-0000-0000-000000000002', 'eede1000-0000-0000-0000-000000000002', 'android')$$,
 '42501', null, 'member cannot insert an installation for a different member');

set role postgres;
select is((select count(*) from public.rch_pwa_installations
  where profile_id='eede0000-0000-0000-0000-000000000001'), 1::bigint,
  'launches dedupe into one installation per member');
select is((select launch_count from public.rch_pwa_installations
  where profile_id='eede0000-0000-0000-0000-000000000001'), 1,
  'rapid duplicate signals do not inflate the launch count');
select is((select count(*) from public.rch_pwa_installations
  where profile_id='eede0000-0000-0000-0000-000000000002'), 0::bigint,
  'the second member is not credited with another member launch');

select * from finish();
rollback;