begin;

select plan(10);

set role postgres;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('41414141-4141-4414-8414-414141414141', 'authenticated', 'authenticated', 'call-a@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('42424242-4242-4424-8424-424242424242', 'authenticated', 'authenticated', 'call-b@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb),
  ('43434343-4343-4434-8434-434343434343', 'authenticated', 'authenticated', 'call-c@example.test', 'not-used', now(), '{"date_of_birth":"1990-01-01"}'::jsonb)
on conflict (id) do nothing;

delete from public.profiles
where id in (
  '41414141-4141-4414-8414-414141414141',
  '42424242-4242-4424-8424-424242424242',
  '43434343-4343-4434-8434-434343434343'
);

insert into public.profiles (id, role, display_name, is_active, message_policy)
values
  ('41414141-4141-4414-8414-414141414141', 'fan', 'Call A', true, 'everyone'),
  ('42424242-4242-4424-8424-424242424242', 'fan', 'Call B', true, 'everyone'),
  ('43434343-4343-4434-8434-434343434343', 'fan', 'Call C', true, 'everyone');

set role authenticated;
select set_config('request.jwt.claim.sub', '41414141-4141-4414-8414-414141414141', true);

select lives_ok($$
  select set_config(
    'test.call_conversation_id',
    public.start_direct_conversation('42424242-4242-4424-8424-424242424242')::text,
    true
  )
$$, 'a direct conversation exists for calling');

select lives_ok($$
  select set_config(
    'test.message_call_id',
    public.start_message_call(
      current_setting('test.call_conversation_id')::uuid,
      '42424242-4242-4424-8424-424242424242',
      'video'
    )::text,
    true
  )
$$, 'a conversation member can start a video call');

select is(
  (
    select status
    from public.message_calls
    where id = current_setting('test.message_call_id')::uuid
  ),
  'ringing'::text,
  'new calls begin in ringing state'
);

select is(
  (
    select kind
    from public.message_calls
    where id = current_setting('test.message_call_id')::uuid
  ),
  'video'::text,
  'the requested media kind is stored'
);

select set_config('request.jwt.claim.sub', '43434343-4343-4434-8434-434343434343', true);

select is(
  (
    select count(*)
    from public.message_calls
    where id = current_setting('test.message_call_id')::uuid
  ),
  0::bigint,
  'non-participants cannot read the call row'
);

select set_config('request.jwt.claim.sub', '42424242-4242-4424-8424-424242424242', true);

select ok(
  public.answer_message_call(current_setting('test.message_call_id')::uuid),
  'the recipient can answer the call'
);

select is(
  (
    select status
    from public.message_calls
    where id = current_setting('test.message_call_id')::uuid
  ),
  'connecting'::text,
  'answered calls move to connecting'
);

select ok(
  public.activate_message_call(current_setting('test.message_call_id')::uuid),
  'a participant can mark a connected call active'
);

select is(
  (
    select status
    from public.message_calls
    where id = current_setting('test.message_call_id')::uuid
  ),
  'active'::text,
  'connected calls persist as active'
);

select ok(
  public.finish_message_call(current_setting('test.message_call_id')::uuid, 'ended', 'hangup'),
  'a participant can end the call'
);

select * from finish();
rollback;
