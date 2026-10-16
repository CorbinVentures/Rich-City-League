begin;
select no_plan();
set role postgres;

insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('b1710000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'authenticated','authenticated','executive-test-'||n||'@example.test',
  '{"date_of_birth":"1990-01-01"}'::jsonb
from generate_series(1,2) n;
delete from public.profiles where id::text like 'b1710000-%';
insert into public.profiles(id,role,is_active,profile_visibility,is_system_account)
values
 ('b1710000-0000-0000-0000-000000000001','admin',true,'public',false),
 ('b1710000-0000-0000-0000-000000000002','fan',true,'public',false);

set role anon;
select lives_ok(
 $$select public.record_rch_site_visit('b1720000-0000-0000-0000-000000000001','runs')$$,
 'anonymous broad-section visit is supported'
);
select lives_ok(
 $$select public.record_rch_site_visit('b1720000-0000-0000-0000-000000000001','/account/security?token=secret')$$,
 'sensitive URL is rejected without error'
);
select throws_ok($$select count(*) from public.rch_site_section_visits$$,
 '42501',null,'anonymous callers cannot inspect session telemetry');
select throws_ok($$select public.get_rch_executive_analytics(30)$$,
 '42501',null,'anonymous callers cannot see executive report');

set role authenticated;
select set_config('request.jwt.claim.sub','b1710000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"b1710000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}',true);
select throws_ok($$select public.get_rch_executive_analytics(30)$$,
 '42501',null,'nonadministrator denied even with two factors');

select set_config('request.jwt.claim.sub','b1710000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"b1710000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',true);
select throws_ok($$select public.get_rch_executive_analytics(30)$$,
 '42501',null,'administrator must complete MFA');

select set_config('request.jwt.claims','{"sub":"b1710000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',true);
select is(jsonb_array_length(public.get_rch_executive_analytics(7)->'daily'),
  7,'seven-day UTC series includes all dates');
select is((public.get_rch_executive_analytics(30)->'summary'->>'members_total')::integer>=2,
  true,'sitewide report returns existing real accounts');
select throws_ok($$select public.get_rch_executive_analytics(11)$$,
 '22023',null,'unsupported reporting windows denied');
select lives_ok(
 $$select public.record_rch_site_visit('b1720000-0000-0000-0000-000000000001','runs')$$,
 'deduplication allows a repeat with no double count'
);
select throws_ok($$select * from public.rch_site_section_visits$$,
 '42501',null,'raw visit identity remains private to verified DB functions');

select * from finish();
rollback;
