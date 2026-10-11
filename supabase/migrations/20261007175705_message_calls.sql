begin;

create table public.message_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'connecting', 'active', 'declined', 'missed', 'ended', 'failed')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '45 seconds'),
  end_reason text,
  constraint message_calls_two_people check (caller_id <> callee_id)
);

create index message_calls_callee_status_idx
  on public.message_calls(callee_id, status, created_at desc);

create index message_calls_caller_status_idx
  on public.message_calls(caller_id, status, created_at desc);

create index message_calls_conversation_created_idx
  on public.message_calls(conversation_id, created_at desc);

alter table public.message_calls enable row level security;

revoke all on table public.message_calls from public, anon;
grant select on table public.message_calls to authenticated;

create policy "call participants can read calls"
  on public.message_calls
  for select
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

create or replace function public.start_message_call(
  target_conversation_id uuid,
  target_profile_id uuid,
  call_kind text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $start_call$
declare
  me uuid := auth.uid();
  new_call_id uuid;
  caller_name text;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if call_kind not in ('audio', 'video') then
    raise exception 'Unsupported call type';
  end if;

  if target_profile_id is null or target_profile_id = me then
    raise exception 'Invalid call recipient';
  end if;

  if not exists (
    select 1
    from public.conversations c
    join public.conversation_members mine
      on mine.conversation_id = c.id and mine.profile_id = me
    join public.conversation_members theirs
      on theirs.conversation_id = c.id and theirs.profile_id = target_profile_id
    where c.id = target_conversation_id
      and c.conversation_type = 'direct'
      and (
        select count(*)
        from public.conversation_members members
        where members.conversation_id = c.id
      ) = 2
  ) then
    raise exception 'Calls are available only in direct conversations';
  end if;

  if not public.can_message_profile(target_profile_id) then
    raise exception 'This member is not available for calls';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('rch-call:' || least(me::text, target_profile_id::text)),
    hashtext(greatest(me::text, target_profile_id::text))
  );

  update public.message_calls
  set status = 'missed',
      ended_at = now(),
      end_reason = 'ring_timeout'
  where status = 'ringing'
    and expires_at <= now()
    and (caller_id in (me, target_profile_id) or callee_id in (me, target_profile_id));

  if exists (
    select 1
    from public.message_calls mc
    where mc.status in ('ringing', 'connecting', 'active')
      and mc.expires_at > now()
      and (
        mc.caller_id in (me, target_profile_id)
        or mc.callee_id in (me, target_profile_id)
      )
  ) then
    raise exception 'One of you is already on a call';
  end if;

  insert into public.message_calls (
    conversation_id,
    caller_id,
    callee_id,
    kind
  )
  values (
    target_conversation_id,
    me,
    target_profile_id,
    call_kind
  )
  returning id into new_call_id;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'RCH member')
  into caller_name
  from public.profiles p
  where p.id = me;

  insert into public.notifications (recipient_id, actor_id, type, title, body, link)
  select
    target_profile_id,
    me,
    'message_call',
    case when call_kind = 'video' then 'Incoming video call' else 'Incoming voice call' end,
    coalesce(caller_name, 'RCH member') || ' is calling you.',
    '/messages/' || target_conversation_id
  where coalesce(
    (select np.messages from public.notification_preferences np where np.profile_id = target_profile_id),
    true
  )
  and not exists (
    select 1
    from public.conversation_preferences pref
    where pref.conversation_id = target_conversation_id
      and pref.profile_id = target_profile_id
      and pref.muted_until > now()
  );

  return new_call_id;
end;
$start_call$;

revoke all on function public.start_message_call(uuid, uuid, text) from public, anon;
grant execute on function public.start_message_call(uuid, uuid, text) to authenticated;

create or replace function public.answer_message_call(target_call_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $answer_call$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  update public.message_calls
  set status = 'connecting',
      answered_at = coalesce(answered_at, now()),
      expires_at = now() + interval '4 hours'
  where id = target_call_id
    and callee_id = me
    and status = 'ringing'
    and expires_at > now();

  if not found then
    raise exception 'Call is no longer available';
  end if;

  return true;
end;
$answer_call$;

revoke all on function public.answer_message_call(uuid) from public, anon;
grant execute on function public.answer_message_call(uuid) to authenticated;

create or replace function public.activate_message_call(target_call_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $activate_call$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  update public.message_calls
  set status = 'active',
      answered_at = coalesce(answered_at, now()),
      expires_at = now() + interval '4 hours'
  where id = target_call_id
    and me in (caller_id, callee_id)
    and status in ('connecting', 'active');

  if not found then
    return false;
  end if;

  return true;
end;
$activate_call$;

revoke all on function public.activate_message_call(uuid) from public, anon;
grant execute on function public.activate_message_call(uuid) to authenticated;

create or replace function public.finish_message_call(
  target_call_id uuid,
  target_status text default 'ended',
  target_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $finish_call$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if target_status not in ('declined', 'missed', 'ended', 'failed') then
    raise exception 'Unsupported call status';
  end if;

  if target_status = 'declined' and not exists (
    select 1 from public.message_calls where id = target_call_id and callee_id = me
  ) then
    raise exception 'Only the recipient can decline this call';
  end if;

  update public.message_calls
  set status = target_status,
      ended_at = coalesce(ended_at, now()),
      end_reason = coalesce(target_reason, end_reason),
      expires_at = least(expires_at, now())
  where id = target_call_id
    and me in (caller_id, callee_id)
    and status in ('ringing', 'connecting', 'active');

  return found;
end;
$finish_call$;

revoke all on function public.finish_message_call(uuid, text, text) from public, anon;
grant execute on function public.finish_message_call(uuid, text, text) to authenticated;

-- Realtime signaling uses private channels named rch-call:<call uuid>.
-- Access is scoped to the two participants recorded on the call.
drop policy if exists "call participants receive signaling" on realtime.messages;
create policy "call participants receive signaling"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'rch-call:%'
    and exists (
      select 1
      from public.message_calls mc
      where mc.id::text = split_part((select realtime.topic()), ':', 2)
        and auth.uid() in (mc.caller_id, mc.callee_id)
    )
  );

drop policy if exists "call participants send signaling" on realtime.messages;
create policy "call participants send signaling"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) like 'rch-call:%'
    and exists (
      select 1
      from public.message_calls mc
      where mc.id::text = split_part((select realtime.topic()), ':', 2)
        and auth.uid() in (mc.caller_id, mc.callee_id)
    )
  );

alter publication supabase_realtime add table public.message_calls;

commit;
