begin;

-- Read receipts must not rely on a broad UPDATE policy for conversation_members.
-- This RPC can only advance the signed-in member's own last_read_at value.
create or replace function public.mark_conversation_read(target_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_catalog
as $mark_read$
declare
  me uuid := auth.uid();
  read_at timestamptz := clock_timestamp();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  update public.conversation_members
  set last_read_at = read_at
  where conversation_id = target_conversation_id
    and profile_id = me;

  if not found then
    raise exception 'Conversation unavailable';
  end if;

  return read_at;
end;
$mark_read$;

revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Respect blocks and the recipient's direct-message preference everywhere a
-- direct conversation is created or a new direct message is sent.
create or replace function public.can_message_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $can_message$
  select
    auth.uid() is not null
    and target_profile_id is not null
    and target_profile_id <> auth.uid()
    and exists (
      select 1
      from public.profiles target
      where target.id = target_profile_id
        and target.is_active = true
        and not exists (
          select 1
          from public.blocks b
          where (b.blocker_id = auth.uid() and b.blocked_id = target_profile_id)
             or (b.blocker_id = target_profile_id and b.blocked_id = auth.uid())
        )
        and (
          target.message_policy = 'everyone'
          or (
            target.message_policy = 'friends'
            and exists (
              select 1
              from public.friendships f
              where f.status = 'accepted'
                and (
                  (f.requester_id = auth.uid() and f.addressee_id = target_profile_id)
                  or
                  (f.requester_id = target_profile_id and f.addressee_id = auth.uid())
                )
            )
          )
        )
    );
$can_message$;

revoke all on function public.can_message_profile(uuid) from public, anon;
grant execute on function public.can_message_profile(uuid) to authenticated;

create or replace function public.can_send_message(target_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $can_send$
declare
  me uuid := auth.uid();
  kind text;
  peer_id uuid;
begin
  if me is null then
    return false;
  end if;

  select c.conversation_type
  into kind
  from public.conversations c
  where c.id = target_conversation_id
    and exists (
      select 1
      from public.conversation_members mine
      where mine.conversation_id = c.id
        and mine.profile_id = me
    );

  if kind is null then
    return false;
  end if;

  if kind <> 'direct' then
    return true;
  end if;

  select cm.profile_id
  into peer_id
  from public.conversation_members cm
  where cm.conversation_id = target_conversation_id
    and cm.profile_id <> me
  limit 1;

  return peer_id is not null and public.can_message_profile(peer_id);
end;
$can_send$;

revoke all on function public.can_send_message(uuid) from public, anon;
grant execute on function public.can_send_message(uuid) to authenticated;

drop policy if exists "members send messages" on public.messages;
create policy "members send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_send_message(conversation_id)
  );

-- Serialize direct-conversation creation for a member pair so rapid taps cannot
-- create duplicate one-to-one threads.
create or replace function public.start_direct_conversation(target_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $direct$
declare
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if target_profile_id is null or target_profile_id = me then
    raise exception 'Invalid message recipient';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(least(me::text, target_profile_id::text)),
    hashtext(greatest(me::text, target_profile_id::text))
  );

  if not public.can_message_profile(target_profile_id) then
    raise exception 'This member is not accepting direct messages';
  end if;

  select c.id
  into existing_id
  from public.conversations c
  join public.conversation_members mine
    on mine.conversation_id = c.id and mine.profile_id = me
  join public.conversation_members theirs
    on theirs.conversation_id = c.id and theirs.profile_id = target_profile_id
  where c.conversation_type = 'direct'
    and (
      select count(*)
      from public.conversation_members cm
      where cm.conversation_id = c.id
    ) = 2
  order by c.created_at asc
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations(created_by, title, conversation_type)
  values (me, null, 'direct')
  returning id into new_id;

  insert into public.conversation_members(conversation_id, profile_id)
  values (new_id, me), (new_id, target_profile_id);

  return new_id;
end;
$direct$;

revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

-- A new message should bring an archived thread back to the inbox, while mute
-- must actually suppress notification creation for the muted recipient.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $notify$
begin
  update public.conversation_preferences
  set archived_at = null
  where conversation_id = new.conversation_id
    and archived_at is not null;

  insert into public.notifications (recipient_id, actor_id, type, title, body, link)
  select
    cm.profile_id,
    new.sender_id,
    'message',
    case when c.conversation_type = 'direct' then 'NEW MESSAGE' else 'NEW GROUP MESSAGE' end,
    case when c.conversation_type = 'direct'
      then 'You have a new RCH message.'
      else 'You have a new RCH group message.'
    end,
    '/messages/' || new.conversation_id
  from public.conversation_members cm
  join public.conversations c on c.id = cm.conversation_id
  left join public.notification_preferences np on np.profile_id = cm.profile_id
  left join public.conversation_preferences pref
    on pref.conversation_id = cm.conversation_id
   and pref.profile_id = cm.profile_id
  where cm.conversation_id = new.conversation_id
    and cm.profile_id <> new.sender_id
    and coalesce(np.messages, true)
    and (pref.muted_until is null or pref.muted_until <= now())
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = cm.profile_id and b.blocked_id = new.sender_id)
         or (b.blocker_id = new.sender_id and b.blocked_id = cm.profile_id)
    );

  return new;
end;
$notify$;

-- Deleted message text must never continue to appear in inbox previews.
create or replace function public.get_message_inbox()
returns table (
  conversation_id uuid,
  title text,
  conversation_type text,
  updated_at timestamptz,
  latest_body text,
  latest_created_at timestamptz,
  latest_sender_id uuid,
  unread_count bigint,
  is_pinned boolean,
  muted_until timestamptz,
  archived_at timestamptz,
  peer_id uuid,
  peer_display_name text,
  peer_username text,
  peer_avatar_url text,
  peer_is_vip boolean,
  peer_vip_label text,
  peer_rep integer,
  peer_level integer,
  member_count bigint
)
language sql
stable
security definer
set search_path = public
as $inbox$
  select
    c.id as conversation_id,
    c.title,
    c.conversation_type,
    c.updated_at,
    latest.body as latest_body,
    latest.created_at as latest_created_at,
    latest.sender_id as latest_sender_id,
    (
      select count(*)
      from public.messages unread
      where unread.conversation_id = c.id
        and unread.sender_id <> auth.uid()
        and unread.deleted_at is null
        and (mine.last_read_at is null or unread.created_at > mine.last_read_at)
    ) as unread_count,
    coalesce(pref.is_pinned, false) as is_pinned,
    pref.muted_until,
    pref.archived_at,
    peer.profile_id as peer_id,
    peer_profile.display_name as peer_display_name,
    peer_profile.username as peer_username,
    peer_profile.avatar_url as peer_avatar_url,
    coalesce(peer_profile.is_vip, false) as peer_is_vip,
    peer_profile.vip_label as peer_vip_label,
    coalesce(peer_level.xp, 0)::integer as peer_rep,
    coalesce(peer_level.level, 1)::integer as peer_level,
    (
      select count(*)
      from public.conversation_members count_members
      where count_members.conversation_id = c.id
    ) as member_count
  from public.conversation_members mine
  join public.conversations c on c.id = mine.conversation_id
  left join public.conversation_preferences pref
    on pref.conversation_id = c.id and pref.profile_id = mine.profile_id
  left join lateral (
    select
      case when m.deleted_at is null then m.body else 'Message removed' end as body,
      m.created_at,
      m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select cm.profile_id
    from public.conversation_members cm
    where c.conversation_type = 'direct'
      and cm.conversation_id = c.id
      and cm.profile_id <> auth.uid()
    limit 1
  ) peer on true
  left join public.profiles peer_profile on peer_profile.id = peer.profile_id
  left join public.user_levels peer_level on peer_level.profile_id = peer.profile_id
  where mine.profile_id = auth.uid()
  order by coalesce(pref.is_pinned, false) desc, coalesce(latest.created_at, c.updated_at) desc;
$inbox$;

revoke all on function public.get_message_inbox() from public, anon;
grant execute on function public.get_message_inbox() to authenticated;

commit;
