begin;
select no_plan();
set role postgres;

insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
 ('eedf0000-0000-0000-0000-000000000001','authenticated','authenticated','city-one@example.test','{"date_of_birth":"1990-01-01"}'::jsonb),
 ('eedf0000-0000-0000-0000-000000000002','authenticated','authenticated','city-two@example.test','{"date_of_birth":"1990-01-01"}'::jsonb)
on conflict (id) do nothing;
insert into public.profiles(id,role,is_active,is_system_account)
values ('eedf0000-0000-0000-0000-000000000001','fan',true,false),
 ('eedf0000-0000-0000-0000-000000000002','fan',true,false)
on conflict(id) do nothing;

set role anon;
select throws_ok($$select count(*) from public.rch_analytics_city_consent$$,'42501',null,'anonymous users cannot list city preferences');
select throws_ok($$insert into public.rch_analytics_city_consent(profile_id,city_id)
 values('eedf0000-0000-0000-0000-000000000001','richmond')$$,'42501',null,'anonymous users cannot opt a member in');

set role authenticated;
select set_config('request.jwt.claim.sub','eedf0000-0000-0000-0000-000000000001',true);
select lives_ok($$insert into public.rch_analytics_city_consent(profile_id,city_id)
 values('eedf0000-0000-0000-0000-000000000001','richmond')$$,'member can opt in themselves');
select is((select count(*) from public.rch_analytics_city_consent),1::bigint,'member sees only their consent');
select throws_ok($$insert into public.rch_analytics_city_consent(profile_id,city_id)
 values('eedf0000-0000-0000-0000-000000000002','norfolk')$$,'42501',null,'cannot opt another member in');
select lives_ok($$update public.rch_analytics_city_consent set city_id='norfolk',updated_at=now()
 where profile_id='eedf0000-0000-0000-0000-000000000001'$$,'member can change their own consented city');
select is((select city_id from public.rch_analytics_city_consent),'norfolk','updated city is reflected');
select throws_ok($$insert into public.rch_analytics_city_consent(profile_id,city_id)
 values('eedf0000-0000-0000-0000-000000000001','someone street address')$$,
 '23514',null,'city field forbids street-style free text');
select lives_ok($$delete from public.rch_analytics_city_consent where profile_id='eedf0000-0000-0000-0000-000000000001'$$,
 'member can withdraw consent');
set role postgres;
select is((select count(*) from public.rch_analytics_city_consent where profile_id='eedf0000-0000-0000-0000-000000000001'),
  0::bigint,'withdrawn city is removed');
select * from finish();
rollback;
