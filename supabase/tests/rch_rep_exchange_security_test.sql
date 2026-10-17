begin;
select no_plan();
select has_table('public','rch_rep_wallets','Spendable REP is separate from user_levels career XP');
select has_table('public','rch_rep_transactions','Every earned, spent or refunded REP unit has a ledger entry');
select has_table('public','rch_rep_orders','Reward delivery is tracked and reviewable');
select has_table('public','rch_rep_rewards','Reward prices come from a controlled catalogue');
select has_table('public','rch_place_badge_awards','Geographic badges retain match and court evidence');
select has_table('public','rch_crew_badge_awards','Crews receive independently verified territory medals');
select has_trigger('public','xp_transactions','rch_rep_from_social_xp','Valid Social XP is bridged into the wallet');
select has_trigger('public','run_ranked_matches','rch_badges_after_ranked_match','Court badges require an independently verified match');
select ok(not has_function_privilege('authenticated','public.award_xp(uuid,integer,text,text,uuid)','EXECUTE'),
 'A user cannot invent XP through the historical award_xp RPC');
select ok(not has_table_privilege('authenticated','public.xp_transactions','INSERT'),
 'Authenticated browsers cannot create arbitrary XP to mint currency');
select ok(not has_table_privilege('anon','public.xp_transactions','INSERT'),
 'Anonymous visitors cannot manufacture career REP');
select ok(not has_table_privilege('authenticated','public.rch_rep_wallets','UPDATE'),
 'Wallets are not directly writable');
select ok(not has_table_privilege('authenticated','public.rch_rep_transactions','INSERT'),
 'Wallet transaction ledger cannot be spoofed');
select ok(not has_table_privilege('authenticated','public.rch_place_badge_awards','INSERT'),
 'Players cannot manually award themselves court crowns');

set role anon;
select throws_ok($$select public.rch_buy_rep_reward('local_post_boost',null,'richmond')$$,
 '42501',null,'Anonymous checkout is blocked');
select throws_ok($$select public.rch_certify_community_badge('10000000-0000-4000-8000-000000000001'::uuid,'fan_attendance','10000000-0000-4000-8000-000000000002'::uuid)$$,
 '42501',null,'No anonymous badge certification');
set role authenticated;
select throws_ok($$select public.rch_buy_rep_reward('profile_frame',null,'virginia')$$,
 'P0001',null,'Signed-out browser does not spend another wallet');
select throws_ok($$select public.rch_review_rep_reward('10000000-0000-4000-8000-000000000001'::uuid,true,'Reviewed request')$$,
 'P0001',null,'Ordinary member cannot approve an order');
select throws_ok($$insert into public.rch_rep_transactions(profile_id,amount,kind,source_key,detail)
values('10000000-0000-4000-8000-000000000001',900,'earn','forged:test','Forged credit')$$,
 '42501',null,'Direct credit forgery denied');
select * from finish();
rollback;