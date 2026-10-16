begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('b1610000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
  'authenticated','authenticated','professional-test-'||n||'@example.test',
  '{"date_of_birth":"1990-01-01"}'::jsonb
from generate_series(1,4) n;
delete from public.profiles where id::text like 'b1610000-%';
insert into public.profiles(id,role,is_active,profile_visibility)
values
 ('b1610000-0000-0000-0000-000000000001','fan',true,'public'),
 ('b1610000-0000-0000-0000-000000000002','fan',true,'public'),
 ('b1610000-0000-0000-0000-000000000003','fan',true,'private'),
 ('b1610000-0000-0000-0000-000000000004','fan',true,'public');
insert into public.posts(id,author_id,body,status,target_profile_id) values
 ('b1620000-0000-0000-0000-000000000001','b1610000-0000-0000-0000-000000000001','Public fixture','published',null),
 ('b1620000-0000-0000-0000-000000000002','b1610000-0000-0000-0000-000000000003','Private fixture','published',null),
 ('b1620000-0000-0000-0000-000000000003','b1610000-0000-0000-0000-000000000001','Draft fixture','draft',null),
 ('b1620000-0000-0000-0000-000000000004','b1610000-0000-0000-0000-000000000001','Wall fixture','published','b1610000-0000-0000-0000-000000000003');
insert into public.blocks(blocker_id,blocked_id) values
 ('b1610000-0000-0000-0000-000000000001','b1610000-0000-0000-0000-000000000004');
set role anon;
select throws_ok($$select public.get_my_professional_analytics()$$,'42501',null,'anonymous cannot read professional insights');
select throws_ok($$select count(*) from public.professional_post_views$$,'42501',null,'raw viewer rows are never public');
set role authenticated;
select set_config('request.jwt.claim.sub','b1610000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000001')$$,'public post can be counted');
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000001')$$,'repeat view safe');
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000002')$$,'private post silently ignored');
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000003')$$,'draft silently ignored');
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000004')$$,'private wall post silently ignored');
select throws_ok($$select count(*) from public.professional_post_views$$,'42501',null,'authenticated callers cannot enumerate viewer rows');
select is((public.get_my_professional_analytics(30,'UTC')->'totals'->>'reach')::integer,0,'viewer cannot read author reach');
select throws_ok($$select public.get_my_professional_analytics(180,'UTC')$$,'22023',null,'window capped to 90 days');

select set_config('request.jwt.claim.sub','b1610000-0000-0000-0000-000000000001',true);
select is((public.get_my_professional_analytics(30,'UTC')->'totals'->>'reach')::integer,1,'author sees one observed viewer');
select is((public.get_my_professional_analytics(30,'UTC')->'totals'->>'impressions')::integer,1,'repeat views deduplicated by day');
select is(jsonb_array_length(public.get_my_professional_analytics(90,'UTC')->'hours'),24,'all 24 local hours reported');
select is(jsonb_array_length(public.get_my_professional_analytics(90,'UTC')->'daily'),90,'complete 90-day series reported');
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000001')$$,'self view silently ignored');
select is((public.get_my_professional_analytics(30,'UTC')->'totals'->>'impressions')::integer,1,'own views excluded');

select set_config('request.jwt.claim.sub','b1610000-0000-0000-0000-000000000004',true);
select lives_ok($$select public.record_professional_post_view('b1620000-0000-0000-0000-000000000001')$$,'blocked viewer request does not disclose visibility');
select set_config('request.jwt.claim.sub','b1610000-0000-0000-0000-000000000001',true);
select is((public.get_my_professional_analytics(30,'UTC')->'totals'->>'impressions')::integer,1,'blocked viewer did not increment reach');

select * from finish();
rollback;
