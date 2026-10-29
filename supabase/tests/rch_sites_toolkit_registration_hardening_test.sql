begin;
select no_plan();
set role postgres;
insert into public.network_organizations
 (id,slug,name,organization_type,is_claimed,is_verified,status)
values ('f2900000-0000-4000-8000-000000000001','toolkit-rate-fixture',
  'Toolkit Rate Fixture','training',true,true,'active');
insert into public.rch_site_toolkit(organization_id)
values ('f2900000-0000-4000-8000-000000000001');

select has_table('public','rch_site_toolkit_registration_rate',
 'Private per-visitor attempt ledger exists');
select is((select relrowsecurity from pg_class
 where oid='public.rch_site_toolkit_registration_rate'::regclass),true,
 'Attempt ledger has RLS enabled');
select is((select count(*) from cron.job where jobname='rch-site-toolkit-privacy-cleanup')::integer,
 1,'Automated private contact deletion is scheduled');

set role anon;
select throws_ok('select * from public.rch_site_toolkit_registration_rate',
 '42501',null,'Anonymous users cannot read visitor rate fingerprints');
select throws_ok($$select public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64))$$,
 '42501',null,'Anonymous users cannot invoke the claim function');

set role authenticated;
select throws_ok($$select public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64))$$,
 '42501',null,'Signed-in site visitors cannot bypass the server');
set role service_role;
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64)),true,'First request permitted');
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64)),true,'Second request permitted');
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64)),true,'Third request permitted');
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64)),true,'Fourth request permitted');
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64)),true,'Fifth request permitted');
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('a',64)),false,
 'Sixth visitor attempt in an hour is rejected');
select is(public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001',repeat('b',64)),true,
 'Independent fingerprint has a separate rate allowance');
select throws_ok($$select public.rch_site_toolkit_claim_registration_attempt(
 'f2900000-0000-4000-8000-000000000001','raw IP')$$,
 '22023',null,'Raw IPs are rejected instead of being stored');

set role postgres;
insert into public.rch_site_toolkit_registrations(organization_id,name,email,created_at)
values ('f2900000-0000-4000-8000-000000000001',
  'Expired Adult','expired@example.test',now()-interval '91 days');
insert into public.rch_site_toolkit_registration_rate
 (organization_id,visitor_fingerprint,period,window_start,attempts)
values ('f2900000-0000-4000-8000-000000000001',
  repeat('c',64),'hour',date_trunc('hour',now()-interval '100 hours'),1);
select public.rch_site_toolkit_privacy_cleanup();
select is((select count(*) from public.rch_site_toolkit_registrations
 where email='expired@example.test')::integer,0,'Interest contacts expire after 90 days');
select is((select count(*) from public.rch_site_toolkit_registration_rate
 where visitor_fingerprint=repeat('c',64))::integer,0,
 'Old rate fingerprints expire after 72 hours');
select * from finish();
rollback;
