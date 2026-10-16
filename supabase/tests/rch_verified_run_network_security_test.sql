begin;
select no_plan();
select has_table('public','rch_run_host_applications','Host verification has a private application ledger');
select has_table('public','rch_verified_run_hosts','Hosts receive time-limited operations credentials');
select has_table('public','rch_court_site_reviews','Community court inspections have expiry');
select has_table('public','rch_run_verifications','Individual Run designations are audited');
select has_trigger('public','runs','rch_revoke_modified_verified_run',
  'Material schedule and venue changes revoke existing Run verification');
select ok(not exists(select 1 from pg_catalog.pg_publication where pubname='supabase_realtime')
 or exists(select 1 from pg_catalog.pg_publication_tables
  where pubname='supabase_realtime' and tablename='rch_run_queue' and schemaname='public'),
 'Next Up is published for realtime updates when Supabase Realtime is available');

set role anon;
select throws_ok($$select count(*) from public.rch_run_host_applications$$,
 '42501',null,'Public visitors cannot browse private host applications');
select throws_ok($$select public.rch_certify_verified_run('10000000-0000-4000-8000-000000000001'::uuid,true,'approved venue')$$,
 '42501',null,'Anonymous users cannot give themselves Run verification');
set role authenticated;
select throws_ok($$select public.rch_review_verified_run_host('10000000-0000-4000-8000-000000000001'::uuid,'approved','reviewed evidence')$$,
 'P0001',null,'A member without staff authorization cannot approve hosts');
select throws_ok($$select public.rch_certify_verified_run('10000000-0000-4000-8000-000000000001'::uuid,true,'reviewed evidence')$$,
 'P0001',null,'A member without staff authorization cannot certify Runs');
select throws_ok($$insert into public.rch_verified_run_hosts(profile_id,verification_status,verified_by,expires_at)
 values('10000000-0000-4000-8000-000000000001'::uuid,'approved',
  '10000000-0000-4000-8000-000000000002'::uuid,now()+interval '1 year')$$,
 '42501',null,'The frontend cannot issue a host credential');

select * from finish();
rollback;