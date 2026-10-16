begin;
select no_plan();

select has_table('public','rch_run_operators','Operators are scoped by Run');
select has_table('public','rch_run_operations','Preparation tasks are persisted');
select has_table('public','rch_run_ops_audit','Official actions have an audit trail');
select has_table('public','rch_run_title_attestations','Takeover attestations are persisted');
select has_trigger('public','run_ranked_matches','rch_before_verified_title_integrity',
  'A database trigger protects title transfers even if clients bypass the UI');

set role anon;
select throws_ok(
  $$select count(*) from public.rch_run_ops_audit$$,
  '42501',null,'Anonymous users cannot inspect organizer audit history');
select throws_ok(
  $$select public.rch_certify_ranked_title_match('10000000-0000-4000-8000-000000000001'::uuid,'')$$,
  '42501',null,'Anonymous users cannot certify championship results');

set role authenticated;
select throws_ok(
  $$select public.rch_manage_run_operator('10000000-0000-4000-8000-000000000001'::uuid,
  '10000000-0000-4000-8000-000000000002'::uuid,'official',true)$$,
  'P0001',null,'Signed-out authenticated role cannot appoint a run official');
select throws_ok(
  $$select public.rch_set_run_operation('10000000-0000-4000-8000-000000000001'::uuid,
    'official_assigned',true,'')$$,
  'P0001',null,'Readiness cannot be modified without an authenticated identity');
select throws_ok(
  $$select public.rch_certify_ranked_title_match('10000000-0000-4000-8000-000000000001'::uuid,'')$$,
  'P0001',null,'No identity means no title certification');
select throws_ok(
  $$insert into public.rch_run_title_attestations(match_id,run_id,official_id)
    values('10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003')$$,
  '42501',null,'The browser cannot insert its own signed title proof');

select * from finish();
rollback;
