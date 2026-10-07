begin;

select plan(16);

set role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('10101010-1010-4010-8010-101010101010', 'authenticated', 'authenticated', 'message-a@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('20202020-2020-4020-8020-202020202020', 'authenticated', 'authenticated', 'message-b@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('30303030-3030-4030-8030-303030303030', 'authenticated', 'authenticated', 'message-c@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb)
on conflict (id) do nothing;

delete from public.profiles
where id in (
  '10101010-1010-4010-8010-101010101010',
  '20202020-2020-4020-8020-202020202020',
  '30303030-3030-4030-8030-303030303030'
);

insert into public.profiles (id, role, display_name, is_active, message_policy)
values
  ('10101010-1010-4010-8010-101010101010', 'fan', 'Message A', true, 'everyone'),
  ('20202020-2020-4020-8020-202020202020', 'fan', 'Message B', true, 'everyone'),
  ('30303030-3030-4030-8030-303030303030', 'fan', 'Message C', true, 'everyone');

set role authenticated;
select set_config('request.jwt.claim.sub', '10101010-1010-4010-8010-101010101010', true);

select lives_ok($$
  select set_config(
    'test.messaging_direct_id',
    public.start_direct_conversation('20202020-2020-4020-8020-202020202020')::text,
    true
  )
$$, 'a direct conversation can be created');

select is(
  public.start_direct_conversation('20202020-2020-4020-8020-202020202020'),
  current_setting('test.messaging_direct_id')::uuid,
  'reopening a direct conversation reuses the existing thread'
);

select lives_ok($$
  select set_config(
    'test.messaging_group_id',
    public.start_group_conversation(
      array['20202020-2020-4020-8020-202020202020'::uuid,'30303030-3030-4030-8030-303030303030'::uuid],
      'Messaging Test Group'
    )::text,
    true
  )
$$, 'a group conversation can be created');

select is(
  (
    select count(*)
    from public.conversation_members
    where conversation_id = current_setting('test.messaging_group_id')::uuid
  ),
  3::bigint,
  'the group contains the creator and selected members'
);

select lives_ok($$
  select public.mark_conversation_read(current_setting('test.messaging_direct_id')::uuid)
$$, 'a member can mark their conversation read');

select ok(
  (
    select last_read_at is not null
    from public.conversation_members
    where conversation_id = current_setting('test.messaging_direct_id')::uuid
      and profile_id = auth.uid()
  ),
  'marking a conversation read updates only the member read timestamp'
);

select set_config('request.jwt.claim.sub', '20202020-2020-4020-8020-202020202020', true);

select lives_ok($$
  insert into public.conversation_preferences
    (conversation_id, profile_id, is_pinned, muted_until, archived_at)
  values (
    current_setting('test.messaging_direct_id')::uuid,
    auth.uid(),
    true,
    now() + interval '1 day',
    now()
  )
  on conflict (conversation_id, profile_id)
  do update set
    is_pinned = excluded.is_pinned,
    muted_until = excluded.muted_until,
    archived_at = excluded.archived_at
$$, 'pin mute and archive preferences can be saved');

select set_config('request.jwt.claim.sub', '10101010-1010-4010-8010-101010101010', true);

select lives_ok($
  with inserted as (
    insert into public.messages (conversation_id, sender_id, body)
    values (
      current_setting('test.messaging_direct_id')::uuid,
      auth.uid(),
      'Messaging action test'
    )
    returning id
  )
  select set_config(
    'test.messaging_message_id',
    (select id::text from inserted),
    true
  )
$, 'a conversation member can send a message');

select set_config('request.jwt.claim.sub', '20202020-2020-4020-8020-202020202020', true);

select is(
  (
    select count(*)
    from public.notifications
    where recipient_id = auth.uid()
      and type = 'message'
      and link = '/messages/' || current_setting('test.messaging_direct_id')
  ),
  0::bigint,
  'muting a conversation suppresses new-message notifications'
);

select is(
  (
    select archived_at
    from public.conversation_preferences
    where conversation_id = current_setting('test.messaging_direct_id')::uuid
      and profile_id = auth.uid()
  ),
  null::timestamptz,
  'a new message returns an archived conversation to the inbox'
);

select set_config('request.jwt.claim.sub', '10101010-1010-4010-8010-101010101010', true);

select lives_ok($$
  update public.messages
  set body = 'Edited messaging action test', edited_at = now()
  where id = current_setting('test.messaging_message_id')::uuid
    and sender_id = auth.uid()
$$, 'a sender can edit their own message');

select set_config('request.jwt.claim.sub', '20202020-2020-4020-8020-202020202020', true);

select lives_ok($$
  insert into public.message_reactions (message_id, profile_id, reaction_key)
  values (current_setting('test.messaging_message_id')::uuid, auth.uid(), 'fire')
$$, 'a conversation member can react to a message');

select lives_ok($$
  delete from public.message_reactions
  where message_id = current_setting('test.messaging_message_id')::uuid
    and profile_id = auth.uid()
    and reaction_key = 'fire'
$$, 'a member can remove their own reaction');

select set_config('request.jwt.claim.sub', '10101010-1010-4010-8010-101010101010', true);

update public.messages
set body = 'Message removed',
    attachment_url = null,
    reply_to_id = null,
    deleted_at = now()
where id = current_setting('test.messaging_message_id')::uuid
  and sender_id = auth.uid();

select set_config('request.jwt.claim.sub', '20202020-2020-4020-8020-202020202020', true);

select is(
  (
    select latest_body
    from public.get_message_inbox()
    where conversation_id = current_setting('test.messaging_direct_id')::uuid
  ),
  'Message removed'::text,
  'deleted message content is masked in the inbox preview'
);

insert into public.blocks (blocker_id, blocked_id)
values (auth.uid(), '10101010-1010-4010-8010-101010101010');

select set_config('request.jwt.claim.sub', '10101010-1010-4010-8010-101010101010', true);

select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  values (
    current_setting('test.messaging_direct_id')::uuid,
    auth.uid(),
    'Blocked message'
  )
$$, '42501', null, 'blocking a member prevents new direct messages');

select set_config('request.jwt.claim.sub', '20202020-2020-4020-8020-202020202020', true);
delete from public.blocks
where blocker_id = auth.uid()
  and blocked_id = '10101010-1010-4010-8010-101010101010';
update public.profiles set message_policy = 'nobody' where id = auth.uid();

select set_config('request.jwt.claim.sub', '10101010-1010-4010-8010-101010101010', true);

select throws_ok($$
  select public.start_direct_conversation('20202020-2020-4020-8020-202020202020')
$$, 'P0001', 'This member is not accepting direct messages',
  'direct-message privacy settings are enforced');

select * from finish();
rollback;
