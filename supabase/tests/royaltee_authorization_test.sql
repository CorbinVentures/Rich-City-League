begin;
select no_plan();
set role postgres;
-- Synthetic fixtures only; this entire test rolls back.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('a5140000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
 'authenticated','authenticated','royaltee-test-'||n||'@example.test','{"date_of_birth":"1990-01-01"}'::jsonb
from generate_series(1,7) n;
delete from public.profiles where id::text like 'a5140000-%';
insert into public.profiles(id,role,is_active,onboarding_complete,date_of_birth)
select id,case when email='royaltee-test-7@example.test' then 'admin'::public.app_role else 'player'::public.app_role end,true,true,'1990-01-01'
from auth.users where id::text like 'a5140000-%';
update public.profiles set date_of_birth=(current_date-interval '17 years')::date where id='a5140000-0000-0000-0000-000000000004';
insert into public.network_organization_members(organization_id,profile_id,member_role,status)
select id,'a5140000-0000-0000-0000-000000000001','manager','active' from public.network_organizations where slug='royaltee-steppas';
insert into public.rcl_staff_assignments(profile_id,role_code,approved_by)
values('a5140000-0000-0000-0000-000000000005','cheerleading_coach','a5140000-0000-0000-0000-000000000001');
set role anon;
select is(public.can_manage_royaltee(),false,'anonymous permission helper fails closed without breaking public policies');
select lives_ok($$select * from public.rcl_royaltee_events$$,'public calendar remains readable');
select throws_ok($$select public.get_royaltee_event_registration_roster('a514eeee-0000-0000-0000-000000000001')$$,'42501',null,'anonymous roster denied');
set role authenticated;
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000005',true);
select is(public.can_manage_royaltee(),false,'general cheerleading assignment grants no Royaltee authority');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000001',true);
select is(public.can_manage_royaltee(),true,'approved Royaltee manager allowed');
select is(public.is_admin(),false,'Royaltee manager has no global administrator rights');
select lives_ok($$insert into public.rcl_royaltee_events(id,title,starts_at,status,registration_open,capacity,registration_fee_cents)
 values('a514eeee-0000-0000-0000-000000000001','Royaltee test',now()+interval '2 days','published',true,2,1000)$$,'manager creates adult event');
set role postgres;
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000007',true);
update public.profiles set is_active=false where id='a5140000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000001',true);
select is(public.can_manage_royaltee(),false,'inactive manager denied');
set role postgres;
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000007',true);
update public.profiles set is_active=true where id='a5140000-0000-0000-0000-000000000001';
update public.network_organization_members set status='inactive' where profile_id='a5140000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000001',true);
select is(public.can_manage_royaltee(),false,'revoked organization membership denied');
set role postgres;
update public.network_organization_members set status='active' where profile_id='a5140000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000002',true);
select is(public.can_manage_royaltee(),false,'ordinary adult denied management');
select throws_ok($$select public.get_royaltee_event_registration_roster('a514eeee-0000-0000-0000-000000000001')$$,'42501',null,'ordinary adult denied roster RPC');
select throws_ok($$insert into public.rcl_royaltee_events(title,starts_at) values('Forbidden event',now())$$,'42501',null,'ordinary adult cannot create events');
select lives_ok($$select public.register_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'adult registers');
select lives_ok($$select public.register_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'duplicate signup is idempotent');
select is((select count(*) from public.rcl_royaltee_event_registrations where profile_id=auth.uid()),1::bigint,'only one registration per adult');
select is((select fee_cents_snapshot from public.rcl_royaltee_event_registrations where profile_id=auth.uid()),1000,'first fee snapshot');
select throws_ok($$update public.rcl_royaltee_event_registrations set payment_status='paid' where profile_id=auth.uid()$$,'42501',null,'member cannot fake payment');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000001',true);
update public.rcl_royaltee_events set registration_fee_cents=1500 where id='a514eeee-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000003',true);
select lives_ok($$select public.register_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'second adult registers at new fee');
select is((select fee_cents_snapshot from public.rcl_royaltee_event_registrations where profile_id=auth.uid()),1500,'new registration gets new fee');
select is((select count(*) from public.rcl_royaltee_event_registrations),1::bigint,'member sees only own registration');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000004',true);
select throws_ok($$select public.register_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'P0001','Adult (18+) completed profile required','minor denied');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000006',true);
select throws_ok($$select public.register_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'P0001','This event is full','third adult denied at capacity');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000002',true);
select lives_ok($$select public.withdraw_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'adult withdraws');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000006',true);
select lives_ok($$select public.register_royaltee_event('a514eeee-0000-0000-0000-000000000001')$$,'freed place can be filled');
select set_config('request.jwt.claim.sub','a5140000-0000-0000-0000-000000000001',true);
select throws_ok($$select public.manage_royaltee_event_registration((select id from public.rcl_royaltee_event_registrations where profile_id='a5140000-0000-0000-0000-000000000002'),'registered',null)$$,'P0001','This event is full','manager reactivation cannot exceed capacity');
select throws_ok($$update public.rcl_royaltee_event_registrations set status='registered' where profile_id='a5140000-0000-0000-0000-000000000002'$$,'42501',null,'manager cannot bypass RPC with direct table update');
select lives_ok($$select public.manage_royaltee_event_registration((select id from public.rcl_royaltee_event_registrations where profile_id='a5140000-0000-0000-0000-000000000003'),'checked_in','paid')$$,'manager checks in and marks manual payment');
select ok((select checked_in_at is not null and payment_status='paid' and fee_cents_snapshot=1500 from public.rcl_royaltee_event_registrations where profile_id='a5140000-0000-0000-0000-000000000003'),'check-in timestamp and fee retained');
select lives_ok($$select public.get_royaltee_event_registration_roster('a514eeee-0000-0000-0000-000000000001')$$,'manager reads private roster');
select is((select role::text from public.profiles where id=auth.uid()),'player','global member role unchanged');
select * from finish();
rollback;
