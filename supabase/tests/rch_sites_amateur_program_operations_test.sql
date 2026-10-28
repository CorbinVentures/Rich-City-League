begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email) values
 ('a6300000-0000-4000-8000-000000000001','authenticated','authenticated','adult-one-fixture@example.test'),
 ('a6300000-0000-4000-8000-000000000002','authenticated','authenticated','adult-coach-fixture@example.test'),
 ('a6300000-0000-4000-8000-000000000003','authenticated','authenticated','minor-fixture@example.test');
delete from public.profiles where id in (
 'a6300000-0000-4000-8000-000000000001','a6300000-0000-4000-8000-000000000002',
 'a6300000-0000-4000-8000-000000000003');
insert into public.profiles(id,role,is_active,onboarding_complete,date_of_birth) values
 ('a6300000-0000-4000-8000-000000000001','player',true,true,'1996-01-01'),
 ('a6300000-0000-4000-8000-000000000002','player',true,true,'1992-01-01'),
 ('a6300000-0000-4000-8000-000000000003','player',true,true,(current_date-interval '15 years')::date);
insert into public.network_organizations(id,slug,name,organization_type,status,is_verified,is_claimed) values
 ('b6300000-0000-4000-8000-000000000001','amateur-fixture-one','Amateur One','training','active',true,true),
 ('b6300000-0000-4000-8000-000000000002','amateur-fixture-two','Amateur Two','team','active',true,true);
insert into public.rch_site_subscriptions(organization_id,tier,billing_status,provider_subscription_ref,current_period_end)
 values
 ('b6300000-0000-4000-8000-000000000001','amateur','active','test-amateur-subscription',now()+interval '30 days'),
 ('b6300000-0000-4000-8000-000000000002','professional','active','test-professional-subscription',now()+interval '30 days');
insert into public.network_organization_members(organization_id,profile_id,member_role,status)
 values ('b6300000-0000-4000-8000-000000000001','a6300000-0000-4000-8000-000000000002','manager','active');
select is((select enabled from public.rch_site_amateur_rollout where id=true),false,
 'New Amateur operational features remain off by default');
select throws_ok($$
insert into public.rch_site_amateur_programs(organization_id,name,kind,capacity)
values('b6300000-0000-4000-8000-000000000001','Closed rollout training','training',1)
$$,'23514',null,'No programs until private rollout enabled');
update public.rch_site_amateur_rollout set enabled=true,
 pilot_organization_id='b6300000-0000-4000-8000-000000000001' where id=true;
select is((select pilot_organization_id from public.rch_site_amateur_rollout where id=true),
 'b6300000-0000-4000-8000-000000000001'::uuid,'Only the approved pilot organization is activated');

insert into public.rch_site_amateur_programs(id,organization_id,name,kind,capacity)
values('c6300000-0000-4000-8000-000000000001',
 'b6300000-0000-4000-8000-000000000001','Thursday clinic','training',1);
select throws_ok($$
insert into public.rch_site_amateur_programs(organization_id,name,kind,capacity)
values('b6300000-0000-4000-8000-000000000002','Other organization blocked','team',2)
$$,'23514',null,'Enabling pilot cannot expose operations to another paid organization');

select throws_ok($$
insert into public.rch_site_amateur_registrations(organization_id,program_id,profile_id) values
('b6300000-0000-4000-8000-000000000001','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000003')
$$,'23514',null,'A minor profile cannot register');
select throws_ok($$
insert into public.rch_site_amateur_registrations(organization_id,program_id,profile_id) values
('b6300000-0000-4000-8000-000000000002','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000001')
$$,'23514',null,'Program registration cannot cross organization boundaries');
insert into public.rch_site_amateur_registrations(organization_id,program_id,profile_id)
values('b6300000-0000-4000-8000-000000000001','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000001');
select throws_ok($$
insert into public.rch_site_amateur_registrations(organization_id,program_id,profile_id)
values('b6300000-0000-4000-8000-000000000001','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000002')
$$,'P0001',null,'Program capacity is enforced inside the database');

insert into public.rch_site_amateur_sessions(organization_id,program_id,coach_profile_id,starts_at,ends_at)
values('b6300000-0000-4000-8000-000000000001','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000002',now()+interval '3 days',now()+interval '3 days 1 hour');
select throws_ok($$
insert into public.rch_site_amateur_sessions(organization_id,program_id,coach_profile_id,starts_at,ends_at)
values('b6300000-0000-4000-8000-000000000001','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000002',now()+interval '3 days 30 minutes',
now()+interval '3 days 1 hour 30 minutes')
$$,'23P01',null,'The same coach cannot be double booked');
select throws_ok($$
insert into public.rch_site_amateur_sessions(organization_id,program_id,coach_profile_id,starts_at,ends_at)
values('b6300000-0000-4000-8000-000000000001','c6300000-0000-4000-8000-000000000001',
'a6300000-0000-4000-8000-000000000001',now()+interval '4 days',now()+interval '4 days 1 hour')
$$,'23514',null,'Coaches require active membership in their own organization');

select ok(not has_table_privilege('anon','public.rch_site_amateur_registrations','SELECT'),
 'Anonymous users cannot read athlete rosters');
select ok(not has_table_privilege('authenticated','public.rch_site_amateur_registrations','SELECT'),
 'Signed-in users cannot read other teams rosters from Data API');
select ok(not has_table_privilege('authenticated','public.rch_site_amateur_rollout','UPDATE'),
 'Ordinary users cannot turn on a private rollout flag');

set role authenticated;
select set_config('request.jwt.claim.sub','a6300000-0000-4000-8000-000000000001',true);
select throws_ok($$select * from public.rch_site_amateur_registrations$$,'42501',null,
 'Authenticated registrants cannot query private roster directly');
select throws_ok($$
insert into public.rch_site_amateur_programs(organization_id,name,kind,capacity)
values('b6300000-0000-4000-8000-000000000001','Forged basketball program','training',10)
$$,'42501',null,'Ordinary users cannot create another program');

set role postgres;
update public.rch_site_subscriptions set current_period_end=now()-interval '1 second'
where organization_id='b6300000-0000-4000-8000-000000000001';
select throws_ok($$
insert into public.rch_site_amateur_programs(organization_id,name,kind,capacity)
values('b6300000-0000-4000-8000-000000000001','Expired plan program','training',10)
$$,'23514',null,'Expired paid website period cannot add programs');
select lives_ok($$
update public.rch_site_amateur_registrations set status='withdrawn'
where program_id='c6300000-0000-4000-8000-000000000001'
and profile_id='a6300000-0000-4000-8000-000000000001'
$$,'Adult can withdraw despite expired paid subscription');
select * from finish();
rollback;
