begin;
select no_plan();
set role postgres;
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('a5190000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
 'authenticated','authenticated','royaltee-runbook-test-'||n||'@example.test',
 '{"date_of_birth":"1990-01-01"}'::jsonb
from generate_series(1,3) n;
delete from public.profiles where id::text like 'a5190000-%';
insert into public.profiles(id,role,is_active,onboarding_complete,date_of_birth)
select id,'fan'::public.app_role,true,true,'1990-01-01'
from auth.users where id::text like 'a5190000-%';
insert into public.network_organization_members(organization_id,profile_id,member_role,status)
select id,'a5190000-0000-0000-0000-000000000001','manager','active'
from public.network_organizations where slug='royaltee-steppas';
set role authenticated;
select set_config('request.jwt.claim.sub','a5190000-0000-0000-0000-000000000001',true);
select lives_ok($$insert into public.rcl_royaltee_events
  (id,title,starts_at,event_type,status,min_age)
  values ('a519eeee-0000-0000-0000-000000000001','Adult Runbook Test',now()+interval '7 days','game_day','draft',18)$$,'manager creates adult event');
select lives_ok($$insert into public.rcl_royaltee_event_work_items
  (event_id,template_key,kind,day_offset,priority,title,owner_label,updated_by)
  values('a519eeee-0000-0000-0000-000000000001','test1','content',-1,'critical','Adult hero reel','Media lead','a5190000-0000-0000-0000-000000000001')$$,'manager inserts scoped content');
select is((select count(*) from public.rcl_royaltee_event_work_items)::int,1,'manager reads private event workflow');
select throws_ok($$update public.rcl_royaltee_event_work_items set editorial_approved=true where template_key='test1'$$,'23514',null,'approval without verified consent rejected');
select throws_ok($$update public.rcl_royaltee_event_work_items set posted_at=now() where template_key='test1'$$,'23514',null,'posted state without approval rejected');
select lives_ok($$update public.rcl_royaltee_event_work_items set rights_verified=true,editorial_approved=true where template_key='test1'$$,'approved content requires rights verification');
select lives_ok($$update public.rcl_royaltee_event_work_items set posted_at=now() where template_key='test1'$$,'manager can record approved publication');
select throws_ok($$update public.rcl_royaltee_event_work_items set rights_verified=false where template_key='test1'$$,'23514',null,'cannot revoke consent without withdrawing editorial approval');
select throws_ok($$update public.rcl_royaltee_event_work_items set status='not_applicable' where template_key='test1'$$,'23514',null,'N/A requires reason in notes');
select set_config('request.jwt.claim.sub','a5190000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.rcl_royaltee_event_work_items)::int,0,'ordinary member sees no private content plan');
select throws_ok($$insert into public.rcl_royaltee_event_work_items
  (event_id,template_key,kind,day_offset,priority,title)
  values('a519eeee-0000-0000-0000-000000000001','unauthorized','ops',0,'standard','Fake assignment')$$,'42501',null,'ordinary member cannot add Royaltee tasks');
select set_config('request.jwt.claim.sub','a5190000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.rcl_royaltee_event_work_items)::int,1,'denied inserts leave no row');
set role postgres;
update public.network_organization_members set status='inactive'
where profile_id='a5190000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub','a5190000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.rcl_royaltee_event_work_items)::int,0,'revoked Royaltee manager loses private task visibility');
select * from finish();
rollback;
