begin;
select no_plan();
select has_table('public','rch_run_queue','Next Up queue is persisted');
select has_table('public','rch_run_result_cases','Match appeals have an audit ledger');
select has_function('public','rch_join_run_queue',array['uuid'],'Only authenticated players enter Next Up via RPC');
select has_function('public','get_rch_run_passport',array[]::text[],'Player passport is available');
select has_function('public','get_rch_runs_intelligence',array['integer'],'Authorized analytics are available');

set role anon;
select throws_ok($$select public.rch_join_run_queue('10000000-0000-4000-8000-000000000001'::uuid)$$,
 '42501',null,'Anonymous visitors cannot queue at a Run');
select throws_ok($$select public.get_rch_run_passport()$$,
 '42501',null,'Anonymous visitors cannot inspect a personal basketball passport');
select throws_ok($$select public.get_rch_runs_intelligence(30)$$,
 '42501',null,'Anonymous visitors cannot inspect statewide intelligence');

set role authenticated;
select throws_ok($$select public.rch_join_run_queue('10000000-0000-4000-8000-000000000001'::uuid)$$,
 'P0001',null,'A signed-out session cannot join a Run queue');
select throws_ok($$select public.get_rch_runs_intelligence(30)$$,
 'P0001',null,'A member without an identity cannot read command intelligence');
select throws_ok($$select public.rch_review_run_result_case('10000000-0000-4000-8000-000000000001'::uuid,'dismissed','No evidence')$$,
 'P0001',null,'Unprivileged users cannot resolve an integrity case');
select throws_ok($$insert into public.rch_run_queue(run_id,profile_id)
 values('10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid)$$,
 '42501',null,'The client cannot bypass the Next Up ordering RPC');
select throws_ok($$update public.rch_run_result_cases set status='dismissed'$$,
 '42501',null,'The client cannot dismiss integrity cases with direct DML');
select * from finish();
rollback;