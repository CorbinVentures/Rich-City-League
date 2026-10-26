begin;
select no_plan();

select has_table('public','rch_post_tag_requests','Consent is stored independently of posts');
select has_table('public','rch_post_topics','Lifestyle categories reuse posts');
select has_function('private','rch_can_request_adult_tag',array['uuid'],'Adult tag eligibility checked without revealing DOB');
select ok(not has_table_privilege('anon','public.rch_post_tag_requests','INSERT'),'Guest cannot request a tag');
select ok(not has_table_privilege('anon','public.rch_post_topics','INSERT'),'Guest cannot forge post topics');
select ok(not has_table_privilege('authenticated','public.rch_post_topics','UPDATE'),'Post topic ownership cannot be reassigned');

set role postgres;
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('b1880000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
'authenticated','authenticated','tag-qa-'||n||'@example.test','{}'::jsonb
from generate_series(1,4) n;
delete from public.profiles where id::text like 'b1880000-%';
insert into public.profiles(id,username,role,is_active,profile_visibility,date_of_birth)
select ('b1880000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'tagqa'||n,
'fan'::public.app_role,true,'public',
case when n=3 then '2010-01-01'::date when n=4 then null else '1990-01-01'::date end
from generate_series(1,4) n;
insert into public.posts(id,author_id,body,media_urls,status)
values
('b1881000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000001','Game day outfit','[]'::jsonb,'published'),
('b1881000-0000-4000-8000-000000000002','b1880000-0000-4000-8000-000000000002','Another creator','[]'::jsonb,'published');

set role authenticated;
select set_config('request.jwt.claim.sub','b1880000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.rch_post_tag_requests(post_id,requester_id,tagged_profile_id,tag_kind)
values('b1881000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000002','creator')$$,
'Post author can request credit from eligible adult');
select throws_ok($$insert into public.rch_post_tag_requests(post_id,requester_id,tagged_profile_id,tag_kind)
values('b1881000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000003','player')$$,
'42501',null,'Minor target excluded');
select throws_ok($$insert into public.rch_post_tag_requests(post_id,requester_id,tagged_profile_id,tag_kind)
values('b1881000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000004','creator')$$,
'42501',null,'Missing DOB cannot bypass age gate');
select throws_ok($$insert into public.rch_post_tag_requests(post_id,requester_id,tagged_profile_id,tag_kind)
values('b1881000-0000-4000-8000-000000000002','b1880000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000002','creator')$$,
'42501',null,'Only post owner may request a credit');
update public.rch_post_tag_requests set status='accepted'
where post_id='b1881000-0000-4000-8000-000000000001';
select is((select status from public.rch_post_tag_requests where post_id='b1881000-0000-4000-8000-000000000001'),
'pending','Requester cannot approve own request');

select lives_ok($$insert into public.rch_post_topics(post_id,author_id,topic) values(
'b1881000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000001','kicks_fits')$$,
'Author may classify own post');

set role authenticated;
select set_config('request.jwt.claim.sub','b1880000-0000-4000-8000-000000000002',true);
select throws_ok($$insert into public.rch_post_topics(post_id,author_id,topic) values(
'b1881000-0000-4000-8000-000000000001','b1880000-0000-4000-8000-000000000002','kicks_fits')$$,
'42501',null,'Cannot categorize somebody else post');
select lives_ok($$update public.rch_post_tag_requests set status='accepted'
where post_id='b1881000-0000-4000-8000-000000000001'$$,
'Tagged member can approve');
select is((select status from public.rch_post_tag_requests
 where tagged_profile_id='b1880000-0000-4000-8000-000000000002'),
'accepted','Approval recorded');
select lives_ok($$delete from public.rch_post_tag_requests
 where tagged_profile_id='b1880000-0000-4000-8000-000000000002'$$,'Tagged member can revoke');

set role postgres;
update public.profiles set profile_visibility='private'
where id='b1880000-0000-4000-8000-000000000001';
set role anon;
select is((select count(*)::integer from public.rch_post_topics),0,
'Privacy change hides tagged lifestyle posts from public');
select * from finish();
rollback;
