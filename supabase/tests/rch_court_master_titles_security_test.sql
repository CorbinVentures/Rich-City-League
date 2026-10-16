begin;
select no_plan();
select has_table('public','rch_court_master_titles','Court titles persist separately from leaderboards');
select has_table('public','rch_court_master_challenges','Individual title challenges have a ledger');
select has_table('public','rch_court_master_attestations','Officials attest to championship evidence');
select has_table('public','rch_court_master_history','Every certified title defense and transfer is recorded');
select has_trigger('public','run_ranked_matches','rch_before_master_duel_verification',
  'Independent certification is required before a challenged title match verifies');
select has_trigger('public','run_ranked_matches','rch_after_master_duel_verification',
  'Verified results update the permanent Master title ledger');

set role anon;
select throws_ok($$select public.rch_request_court_master_duel('test','1v1','10000000-0000-4000-8000-000000000001'::uuid)$$,
 '42501',null,'Anonymous visitors cannot challenge court titles');
select throws_ok($$select public.rch_certify_court_master_duel('10000000-0000-4000-8000-000000000001'::uuid)$$,
 '42501',null,'Anonymous visitors cannot certify titles');
set role authenticated;
select throws_ok($$select public.rch_certify_court_master_duel('10000000-0000-4000-8000-000000000001'::uuid)$$,
 'P0001',null,'Signed-out sessions cannot certify official title results');
select throws_ok($$insert into public.rch_court_master_titles(court_slug,division,holder_id)
 values('fake','1v1','10000000-0000-4000-8000-000000000001'::uuid)$$,
 '42501',null,'Users cannot directly crown themselves');
select throws_ok($$update public.rch_court_master_challenges set status='resolved'$$,
 '42501',null,'Users cannot directly decide title challenges');

select * from finish();
rollback;