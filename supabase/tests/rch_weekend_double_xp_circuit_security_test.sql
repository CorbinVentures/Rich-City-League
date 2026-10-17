begin;
select no_plan();

select has_table('public','rch_weekend_circuit_courts','City four-park rotation has a persistent configuration');
select has_table('public','rch_weekend_circuit_events','Featured weekend events have immutable identities');
select has_trigger('public','rch_run_rep_events','rch_weekend_double_game_before_insert',
  'Verified game REP doubles server-side before wallet credit');
select has_trigger('public','rch_run_stat_rewards','rch_weekend_double_stats_before_insert',
  'Reviewed stats REP doubles server-side before wallet credit');

-- The scheduler is deliberately not callable by any visitor or signed-in member.
set role anon;
select throws_ok(
  $$select public.rch_generate_weekend_circuit(8)$$,
  '42501',null,'Anonymous users cannot schedule featured events');
select throws_ok(
  $$insert into public.rch_weekend_circuit_events(run_id,city,weekend_start,slot,court_slug,starts_at)
    values('10000000-0000-4000-8000-000000000001','Richmond','2026-10-24',1,'alice-fitz-park',now())$$,
  '42501',null,'Public users cannot mint their own double REP events');

set role authenticated;
select throws_ok(
  $$select public.rch_generate_weekend_circuit(8)$$,
  '42501',null,'Members cannot invoke the privileged circuit generator');
select throws_ok(
  $$insert into public.rch_weekend_circuit_events(run_id,city,weekend_start,slot,court_slug,starts_at)
    values('10000000-0000-4000-8000-000000000002','Richmond','2026-10-24',1,'alice-fitz-park',now())$$,
  '42501',null,'Members cannot forge weekend bonuses');

reset role;
select * from finish();
rollback;
