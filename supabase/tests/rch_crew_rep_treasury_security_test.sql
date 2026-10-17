begin;
select no_plan();
select has_table('public','rch_crew_rep_wallets','Crew REP ledger exists separately from player balances');
select has_table('public','rch_crew_rep_orders','Crew redemption requests are audited');
select has_table('public','rch_crew_rep_transactions','Every contribution and refund is persisted');
select has_trigger('public','rch_court_takeovers','rch_crew_rep_takeover','Only verified crew takeovers mint crew REP');
select ok(not has_table_privilege('authenticated','public.rch_crew_rep_wallets','UPDATE'),
 'Ordinary users cannot edit crew REP wallets');
select ok(not has_table_privilege('authenticated','public.rch_crew_rep_transactions','INSERT'),
 'Ordinary users cannot fabricate crew REP');
select ok(not has_table_privilege('authenticated','public.rch_rep_wallets','UPDATE'),
 'Contributors cannot bypass the wallet debit');
set role anon;
select throws_ok($$select public.rch_contribute_crew_rep('10000000-0000-4000-8000-000000000001'::uuid,100)$$,
 '42501',null,'Anonymous wallets cannot fund a crew');
set role authenticated;
select throws_ok($$select public.rch_redeem_crew_rep('10000000-0000-4000-8000-000000000001'::uuid,'crew_showcase')$$,
 'P0001',null,'No authenticated identity cannot spend a crew treasury');
select throws_ok($$select public.rch_decide_crew_rep_order('10000000-0000-4000-8000-000000000001'::uuid,true,'Reviewed evidence')$$,
 'P0001',null,'Only staff can mark crew rewards fulfilled');
select * from finish();
rollback;