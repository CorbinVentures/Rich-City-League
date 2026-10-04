begin;

alter table public.messages
  add column if not exists edited_at timestamptz;

create table if not exists public.conversation_preferences (
  conversation_id uuid not null,
  profile_id uuid not null,
  is_pinned boolean not null default false,
  muted_until timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, profile_id),
  constraint conversation_preferences_membership_fkey
    foreign key (conversation_id, profile_id)
    references public.conversation_members(conversation_id, profile_id)
    on delete cascade
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_key text not null check (reaction_key in ('like','love','fire','laugh','wow','clutch')),
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id, reaction_key)
);

create index if not exists conversation_preferences_profile_idx
  on public.conversation_preferences(profile_id, is_pinned desc, updated_at desc);

create index if not exists message_reactions_message_idx
  on public.message_reactions(message_id, created_at);

alter table public.conversation_preferences enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists "users view own conversation preferences" on public.conversation_preferences;
create policy "users view own conversation preferences"
  on public.conversation_preferences for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists "users manage own conversation preferences" on public.conversation_preferences;
create policy "users manage own conversation preferences"
  on public.conversation_preferences for all
  to authenticated
  using (profile_id = auth.uid() and public.is_conversation_member(conversation_id))
  with check (profile_id = auth.uid() and public.is_conversation_member(conversation_id));

drop policy if exists "conversation members view message reactions" on public.message_reactions;
create policy "conversation members view message reactions"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "members react to messages" on public.message_reactions;
create policy "members react to messages"
  on public.message_reactions for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "members remove own message reactions" on public.message_reactions;
create policy "members remove own message reactions"
  on public.message_reactions for delete
  to authenticated
  using (profile_id = auth.uid());

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = greatest(coalesce(updated_at, new.created_at), new.created_at)
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation_after_message on public.messages;
create trigger touch_conversation_after_message
  after insert on public.messages
  for each row execute procedure public.touch_conversation_on_message();

create or replace function public.touch_conversation_preference_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversation_preferences_updated_at on public.conversation_preferences;
create trigger conversation_preferences_updated_at
  before update on public.conversation_preferences
  for each row execute procedure public.touch_conversation_preference_updated_at();

alter publication supabase_realtime add table public.message_reactions;


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
as $
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
    select m.body, m.created_at, m.sender_id
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
$;

revoke all on function public.get_message_inbox() from public;
grant execute on function public.get_message_inbox() to authenticated;

create or replace function public.start_group_conversation(target_profile_ids uuid[], group_title text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $
declare
  me uuid := auth.uid();
  clean_ids uuid[];
  new_id uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;

  select array_agg(distinct id)
  into clean_ids
  from unnest(coalesce(target_profile_ids, array[]::uuid[])) id
  where id is not null and id <> me;

  if clean_ids is null or cardinality(clean_ids) < 2 then
    raise exception 'Choose at least two other members for a group';
  end if;

  if exists (
    select 1
    from unnest(clean_ids) id
    left join public.profiles p on p.id = id and p.is_active = true
    where p.id is null
  ) then
    raise exception 'One or more selected members are unavailable';
  end if;

  insert into public.conversations(created_by, title, conversation_type)
  values (
    me,
    nullif(left(trim(coalesce(group_title, '')), 80), ''),
    'group'
  )
  returning id into new_id;

  insert into public.conversation_members(conversation_id, profile_id, role)
  values (new_id, me, 'admin');

  insert into public.conversation_members(conversation_id, profile_id, role)
  select new_id, id, 'member'
  from unnest(clean_ids) id;

  return new_id;
end;
$;

revoke all on function public.start_group_conversation(uuid[], text) from public;
grant execute on function public.start_group_conversation(uuid[], text) to authenticated;

commit;
