begin;
select no_plan();

select has_table('public','rch_mixtapes','Mixtapes reuse social posts');
select has_table('public','rch_mixtape_items','Mixtape items only reference source posts');
select has_function('public','rch_publish_own_mixtape',array['text','uuid[]','boolean'],'Atomic owner-only publishing exists');
select ok(not has_table_privilege('anon','public.rch_mixtapes','INSERT'),'Guests cannot forge mixtapes');
select ok(not has_table_privilege('anon','public.rch_mixtape_items','INSERT'),'Guests cannot insert playlist media');
select ok(not has_table_privilege('authenticated','public.rch_mixtape_items','UPDATE'),'Members cannot rewrite playlist source references');

set role postgres;
-- CI's minimal schema omits the production post SELECT grants; reproduce inside rollback-only fixtures.
grant select on public.posts to anon, authenticated;
insert into auth.users(id,aud,role,email,raw_user_meta_data)
values
('b1770000-0000-4000-8000-000000000001','authenticated','authenticated','mixtape-owner@example.test','{}'::jsonb),
('b1770000-0000-4000-8000-000000000002','authenticated','authenticated','mixtape-other@example.test','{}'::jsonb);
delete from public.profiles where id in
('b1770000-0000-4000-8000-000000000001','b1770000-0000-4000-8000-000000000002');
insert into public.profiles(id,role,is_active,profile_visibility)
values
('b1770000-0000-4000-8000-000000000001','fan'::public.app_role,true,'public'),
('b1770000-0000-4000-8000-000000000002','fan'::public.app_role,true,'public');

insert into public.posts(id,author_id,body,media_urls,status)
values
('b1771000-0000-4000-8000-000000000001','b1770000-0000-4000-8000-000000000001','Owner video','["https://rch.supabase.co/storage/v1/object/public/media/b1770000-0000-4000-8000-000000000001/posts/clip.mp4"]'::jsonb,'published'),
('b1771000-0000-4000-8000-000000000002','b1770000-0000-4000-8000-000000000002','Other video','["https://rch.supabase.co/storage/v1/object/public/media/b1770000-0000-4000-8000-000000000002/posts/other.mp4"]'::jsonb,'published'),
('b1771000-0000-4000-8000-000000000003','b1770000-0000-4000-8000-000000000001','Photo only','["https://rch.supabase.co/storage/v1/object/public/media/b1770000-0000-4000-8000-000000000001/posts/photo.jpg"]'::jsonb,'published');

set role authenticated;
select set_config('request.jwt.claim.sub','b1770000-0000-4000-8000-000000000001',true);
select throws_ok(
 $$select public.rch_publish_own_mixtape('Owner tape',array['b1771000-0000-4000-8000-000000000001'::uuid],false)$$,
 '42501',null,'Rights confirmation is mandatory');
select throws_ok(
 $$select public.rch_publish_own_mixtape('Borrowed tape',array['b1771000-0000-4000-8000-000000000002'::uuid],true)$$,
 '42501',null,'Owner cannot add another members video');
select throws_ok(
 $$select public.rch_publish_own_mixtape('Photo tape',array['b1771000-0000-4000-8000-000000000003'::uuid],true)$$,
 '42501',null,'Photo-only post cannot be inserted as video');
select throws_ok(
 $$select public.rch_publish_own_mixtape('Repeated tape',array['b1771000-0000-4000-8000-000000000001'::uuid,'b1771000-0000-4000-8000-000000000001'::uuid],true)$$,
 'P0001',null,'Duplicate post cannot be added twice');
select lives_ok(
 $$select public.rch_publish_own_mixtape('My first mixtape',array['b1771000-0000-4000-8000-000000000001'::uuid],true)$$,
 'Owner can publish a real video collection');
select is((select count(*)::integer from public.rch_mixtapes),1,'Failed publishes leave no half-written mixtapes');
select is((select count(*)::integer from public.rch_mixtape_items),1,'Published mixtape references one real post');
select throws_ok(
 $$update public.rch_mixtapes set owner_id='b1770000-0000-4000-8000-000000000002' where owner_id='b1770000-0000-4000-8000-000000000001'$$,
 '42501',null,'Owner ID cannot be rewritten');

select set_config('request.jwt.claim.sub','b1770000-0000-4000-8000-000000000002',true);
select ok(not exists(select 1 from public.rch_mixtape_items where mixtape_id in
(select id from public.rch_mixtapes where status='draft')),'Another account has no access to drafts');
delete from public.rch_mixtapes where owner_id='b1770000-0000-4000-8000-000000000001';
-- RLS deletes generally filter to zero rows without throwing.
select is((select count(*)::integer from public.rch_mixtapes),1,'Other member has not withdrawn owners mixtape');

set role postgres;
update public.posts set status='draft'
where id='b1771000-0000-4000-8000-000000000001';
set role anon;
select is((select count(*)::integer from public.rch_mixtape_items),0,'Revoked source is no longer in a public mixtape');
select * from finish();
rollback;
