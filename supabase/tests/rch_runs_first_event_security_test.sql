begin;
select no_plan();
set role postgres;

select ok(not has_function_privilege('anon','public.check_in_to_run(uuid)','EXECUTE'),
 'Guest cannot call legacy attendance reward');
select ok(not has_function_privilege('authenticated','public.check_in_to_run(uuid)','EXECUTE'),
 'Authenticated members cannot bypass host-issued code');
select ok(not has_function_privilege('authenticated','public.claim_latest_run_highlight(uuid)','EXECUTE'),
 'Members cannot bypass checked-in highlight rewards');
select ok(has_function_privilege('authenticated','public.rch_check_in_with_code(uuid,text)','EXECUTE'),
 'Members can use code-gated attendance');
select ok(not has_table_privilege('authenticated','public.rch_run_checkin_codes','SELECT'),
 'Shared court codes are not readable as table rows');

insert into auth.users(id,aud,role,email,raw_user_meta_data)
values
 ('ae210000-0000-4000-8000-000000000001','authenticated','authenticated','run-host@example.test','{}'::jsonb),
 ('ae210000-0000-4000-8000-000000000002','authenticated','authenticated','run-player@example.test','{}'::jsonb),
 ('ae210000-0000-4000-8000-000000000003','authenticated','authenticated','run-outsider@example.test','{}'::jsonb);
-- auth.users signup trigger may create profiles automatically in the local harness.
delete from public.profiles where id in (
 'ae210000-0000-4000-8000-000000000001',
 'ae210000-0000-4000-8000-000000000002',
 'ae210000-0000-4000-8000-000000000003'
);
insert into public.profiles(id,role,is_active)
values
 ('ae210000-0000-4000-8000-000000000001','player',true),
 ('ae210000-0000-4000-8000-000000000002','player',true),
 ('ae210000-0000-4000-8000-000000000003','player',true);
insert into public.runs(id,host_id,title,location,starts_at,run_type,skill_level,game_format,max_players,capacity,status)
values ('ae220000-0000-4000-8000-000000000001',
 'ae210000-0000-4000-8000-000000000001','Isolated test pickup',
 'Local test outdoor court',now()+interval '15 minutes','competitive','all','1v1',2,2,'open');
insert into public.run_players(run_id,profile_id)
values
 ('ae220000-0000-4000-8000-000000000001','ae210000-0000-4000-8000-000000000001'),
 ('ae220000-0000-4000-8000-000000000001','ae210000-0000-4000-8000-000000000002');

set role authenticated;
select set_config('request.jwt.claim.sub','ae210000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.rch_issue_run_checkin_code('ae220000-0000-4000-8000-000000000001')$$,
 'P0001','Only the host or RCH staff may issue a court check-in code','Other members cannot issue a host code');

select set_config('request.jwt.claim.sub','ae210000-0000-4000-8000-000000000001',true);
select is(length(public.rch_issue_run_checkin_code('ae220000-0000-4000-8000-000000000001')),12,
 'Host receives a 12-character code');
select set_config('rch.test_code',public.rch_issue_run_checkin_code('ae220000-0000-4000-8000-000000000001'),true);

select set_config('request.jwt.claim.sub','ae210000-0000-4000-8000-000000000003',true);
select throws_ok(format('select public.rch_check_in_with_code(%L,%L)',
 'ae220000-0000-4000-8000-000000000001',current_setting('rch.test_code')),
 'P0001','Register for this Run before checking in','Unregistered member cannot claim attendance');

select set_config('request.jwt.claim.sub','ae210000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.rch_check_in_with_code('ae220000-0000-4000-8000-000000000001','000000000000')$$,
 'P0001','Invalid or expired court code. Ask the host for the current code','Invalid court code rejected');
select is(public.rch_check_in_with_code('ae220000-0000-4000-8000-000000000001',current_setting('rch.test_code')),15,
 'First in-person participant check-in gives expected legacy XP');
select is(public.rch_check_in_with_code('ae220000-0000-4000-8000-000000000001',current_setting('rch.test_code')),0,
 'Repeated same check-in cannot mint additional XP');
select is((select count(*)::integer from public.run_checkins where run_id='ae220000-0000-4000-8000-000000000001'
 and profile_id='ae210000-0000-4000-8000-000000000002'),1,
 'Only one attendance record exists for player');

select set_config('request.jwt.claim.sub','ae210000-0000-4000-8000-000000000001',true);
select set_config('rch.test_new_code',public.rch_issue_run_checkin_code('ae220000-0000-4000-8000-000000000001'),true);
select set_config('request.jwt.claim.sub','ae210000-0000-4000-8000-000000000002',true);
select throws_ok(format('select public.rch_check_in_with_code(%L,%L)',
 'ae220000-0000-4000-8000-000000000001',current_setting('rch.test_code')),
 'P0001','Invalid or expired court code. Ask the host for the current code','Rotating the event code invalidates the old one');
select lives_ok(format('select public.rch_check_in_with_code(%L,%L)',
 'ae220000-0000-4000-8000-000000000001',current_setting('rch.test_new_code')),
 'Current rotated code remains valid but does not duplicate attendance');

select * from finish();
rollback;
