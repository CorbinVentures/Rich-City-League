begin;
select no_plan();
set role postgres;
-- CI's minimal local database lacks some REST role grants present in
-- production; mirror those existing grants inside this rollback-only test.
grant select on public.posts, public.stories to anon, authenticated;
grant select, insert, update on public.friendships to authenticated;
grant select on public.follows to anon, authenticated;
grant insert, update on public.follows to authenticated;

-- Isolated fixtures; no production credentials or personal information.
insert into auth.users(id,aud,role,email,raw_user_meta_data)
select ('b1600000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
  'authenticated','authenticated','privacy-qa-'||n||'@example.test',
  '{"date_of_birth":"1990-01-01"}'::jsonb
from generate_series(1,7) n;
delete from public.profiles where id::text like 'b1600000-%';
insert into public.profiles(id,role,is_active,profile_visibility,friend_request_policy)
select ('b1600000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
 'fan'::public.app_role,true,
 case when n=2 then 'friends' when n=3 then 'private' else 'public' end,
 case when n=5 then 'nobody' when n=6 then 'friends_of_friends' else 'everyone' end
from generate_series(1,7) n;

insert into public.friendships(requester_id,addressee_id,status)
values
 ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000002','accepted'),
 ('b1600000-0000-0000-0000-000000000002','b1600000-0000-0000-0000-000000000006','accepted');

insert into public.blocks(blocker_id,blocked_id)
values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000004');

insert into public.posts(author_id,body,status)
values
 ('b1600000-0000-0000-0000-000000000002','Connection post','published'),
 ('b1600000-0000-0000-0000-000000000003','Private post','published'),
 ('b1600000-0000-0000-0000-000000000004','Blocked post','published');
insert into public.stories(author_id,body,audience)
values
 ('b1600000-0000-0000-0000-000000000002','Connection story','public'),
 ('b1600000-0000-0000-0000-000000000003','Private story','public'),
 ('b1600000-0000-0000-0000-000000000004','Blocked story','public');

insert into public.follows(follower_id,following_id)
values ('b1600000-0000-0000-0000-000000000004','b1600000-0000-0000-0000-000000000003');

set role anon;
select ok(not has_column_privilege('anon','public.profiles','phone','SELECT'),'anonymous member phone SELECT denied');
select ok(not has_column_privilege('anon','public.profiles','date_of_birth','SELECT'),'anonymous birthday SELECT denied');
select ok(not has_column_privilege('authenticated','public.profiles','phone','SELECT'),'signed-in cross-member phone SELECT denied');
select ok(not has_column_privilege('authenticated','public.profiles','date_of_birth','SELECT'),'signed-in cross-member birthday SELECT denied');
select throws_ok($$select phone from public.profiles limit 1$$,'42501',null,'wildcard/private phone read rejected even for visible rows');
select throws_ok($$select * from public.get_my_private_profile()$$,'42501',null,'anonymous callers cannot use private profile RPC');
select throws_ok($$select * from public.get_my_blocked_accounts()$$,'42501',null,'anonymous callers cannot list member blocks');
select ok(not exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000002'),'anon cannot see connections-only profile');
select ok(not exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000003'),'anon cannot see private profile');
select ok(exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000004'),'anon can see otherwise-public profile');
select ok(not exists(select 1 from public.posts where author_id='b1600000-0000-0000-0000-000000000003'),'anon cannot read hidden-profile posts');
select ok(not exists(select 1 from public.follows where following_id='b1600000-0000-0000-0000-000000000003'),'anon cannot inspect a private member follow graph');

set role authenticated;
select set_config('request.jwt.claim.sub','b1600000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.get_my_blocked_accounts()),1,'only the blocker can list their blocked account');
select ok(exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000002'),'accepted connection can see connections-only profile');
select ok(not exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000003'),'signed-in non-owner cannot see private profile');
select ok(not exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000004'),'blocking hides profile both ways');
select ok(exists(select 1 from public.posts where author_id='b1600000-0000-0000-0000-000000000002'),'connection can read connection posts');
select ok(not exists(select 1 from public.posts where author_id='b1600000-0000-0000-0000-000000000003'),'private posts hidden from connections');
select ok(not exists(select 1 from public.posts where author_id='b1600000-0000-0000-0000-000000000004'),'blocked posts hidden');
select ok(exists(select 1 from public.stories where author_id='b1600000-0000-0000-0000-000000000002'),'connection can read story');
select throws_ok($$insert into public.follows(follower_id,following_id) values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000004')$$,'42501',null,'block prevents direct follow insert');
select throws_ok($$insert into public.follows(follower_id,following_id) values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000003')$$,'42501',null,'private member rejects direct follow insert');
select lives_ok($$insert into public.follows(follower_id,following_id) values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000002')$$,'accepted connection can be followed');
select ok(not exists(select 1 from public.stories where author_id='b1600000-0000-0000-0000-000000000004'),'blocked stories hidden');

select throws_ok($$insert into public.friendships(requester_id,addressee_id,status) values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000005','pending')$$,'42501',null,'nobody preference rejects request at database');
select throws_ok($$insert into public.friendships(requester_id,addressee_id,status) values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000004','pending')$$,'42501',null,'block rejects requests at database');
select lives_ok($$insert into public.friendships(requester_id,addressee_id,status) values ('b1600000-0000-0000-0000-000000000001','b1600000-0000-0000-0000-000000000006','pending')$$,'mutual accepted friend permits request');
select throws_ok($$update public.friendships set status='accepted' where requester_id='b1600000-0000-0000-0000-000000000001' and addressee_id='b1600000-0000-0000-0000-000000000006'$$,'42501',null,'requester cannot accept own request');

select set_config('request.jwt.claim.sub','b1600000-0000-0000-0000-000000000006',true);
select lives_ok($$update public.friendships set status='accepted' where requester_id='b1600000-0000-0000-0000-000000000001' and addressee_id='b1600000-0000-0000-0000-000000000006'$$,'recipient may accept pending invitation');

select set_config('request.jwt.claim.sub','b1600000-0000-0000-0000-000000000003',true);
select is((select count(*)::integer from public.get_my_private_profile()),1,'owner-only private RPC returns exactly one private row');
select ok(exists(select 1 from public.follows where following_id='b1600000-0000-0000-0000-000000000003'),'private member can see own follower records');
select ok(not public.is_my_profile_adult(),'missing DOB is not adult-eligible');
select ok(exists(select 1 from public.profiles where id='b1600000-0000-0000-0000-000000000003'),'private owner can read own profile');

select * from finish();
rollback;
