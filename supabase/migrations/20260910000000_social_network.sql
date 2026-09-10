-- Rich City League social network foundation.
-- User-earned values are written through trusted functions; clients cannot self-award XP.

alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists position text,
  add column if not exists jersey_number text,
  add column if not exists location text,
  add column if not exists profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'friends', 'private')),
  add column if not exists friend_request_policy text not null default 'everyone'
    check (friend_request_policy in ('everyone', 'friends_of_friends', 'nobody')),
  add column if not exists message_policy text not null default 'everyone'
    check (message_policy in ('everyone', 'friends', 'nobody'));

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  story_type text not null default 'text' check (story_type in ('text', 'photo', 'video', 'game_day', 'highlight')),
  body text,
  media_url text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  audience text not null default 'friends' check (audience in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  check (body is not null or media_url is not null)
);

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  conversation_type text not null default 'direct' check (conversation_type in ('direct', 'group', 'team', 'community', 'announcement')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  attachment_url text,
  reply_to_id uuid references public.messages(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  community_type text not null default 'general' check (community_type in ('league', 'division', 'team', 'fan', 'player', 'coach', 'parent', 'tournament', 'event', 'general')),
  privacy text not null default 'public' check (privacy in ('public', 'private', 'invite_only')),
  logo_url text,
  cover_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  joined_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  messages boolean not null default true,
  friend_requests boolean not null default true,
  comments boolean not null default true,
  reactions boolean not null default true,
  announcements boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now(),
  unique (profile_id, reason, source_type, source_id)
);

create table if not exists public.user_levels (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_streak integer not null default 0 check (current_streak >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_profile_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (reported_profile_id is not null or post_id is not null or message_id is not null)
);

create table if not exists public.saved_posts (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);

create index if not exists friendships_participant_idx on public.friendships (requester_id, addressee_id, status);
create index if not exists stories_active_idx on public.stories (author_id, expires_at desc);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index if not exists community_posts_idx on public.community_posts (community_id, created_at desc);
create index if not exists activity_profile_idx on public.user_activity (profile_id, created_at desc);
create index if not exists xp_leaderboard_idx on public.user_levels (xp desc, level desc);
create unique index if not exists xp_transactions_dedup_idx
  on public.xp_transactions (profile_id, reason, coalesce(source_type, ''), coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.level_for_xp(total_xp integer)
returns integer language sql immutable as $$
  select greatest(1, floor(sqrt(greatest(total_xp, 0)::numeric / 100))::integer + 1);
$$;

create or replace function public.award_xp(
  target_profile_id uuid,
  xp_amount integer,
  xp_reason text,
  source_kind text default null,
  source_uuid uuid default null
)
returns public.user_levels
language plpgsql
security definer
set search_path = public
as $$
declare result public.user_levels;
declare inserted_transaction boolean := false;
begin
  if xp_amount <= 0 or xp_amount > 1000 then raise exception 'Invalid XP amount'; end if;
  if xp_reason not in ('profile_completed', 'joined_team', 'played_game', 'won_game', 'stat_milestone', 'quality_content', 'meaningful_engagement', 'community_contribution', 'invite_teammate') then
    raise exception 'Invalid XP reason';
  end if;
  if xp_reason <> 'profile_completed' and (source_kind is null or source_uuid is null) then
    raise exception 'Activity source is required';
  end if;
  if not public.is_staff_or_admin() and target_profile_id <> auth.uid() then
    raise exception 'Not authorized to award XP';
  end if;
  insert into public.user_levels (profile_id) values (target_profile_id) on conflict do nothing;
  insert into public.xp_transactions (profile_id, amount, reason, source_type, source_id)
  values (target_profile_id, xp_amount, xp_reason, source_kind, source_uuid)
  on conflict do nothing
  returning true into inserted_transaction;
  update public.user_levels
    set xp = xp + case when inserted_transaction then xp_amount else 0 end,
        level = public.level_for_xp(xp + case when inserted_transaction then xp_amount else 0 end),
        updated_at = now()
    where profile_id = target_profile_id
    returning * into result;
  return result;
end;
$$;

grant execute on function public.award_xp(uuid, integer, text, text, uuid) to authenticated;
grant execute on function public.level_for_xp(integer) to anon, authenticated;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = target_conversation_id and profile_id = auth.uid());
$$;

create or replace function public.is_community_member(target_community_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_members where community_id = target_community_id and profile_id = auth.uid());
$$;

alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_activity enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.user_levels enable row level security;
alter table public.reports enable row level security;
alter table public.saved_posts enable row level security;

create policy "participants view friendships" on public.friendships for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "users create friendships" on public.friendships for insert with check (requester_id = auth.uid());
create policy "participants update friendships" on public.friendships for update using (requester_id = auth.uid() or addressee_id = auth.uid()) with check (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "participants delete friendships" on public.friendships for delete using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "users manage blocks" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "visible active stories" on public.stories for select using (expires_at > now() and (audience = 'public' or author_id = auth.uid() or (audience = 'friends' and exists (select 1 from public.friendships f where f.status = 'accepted' and ((f.requester_id = auth.uid() and f.addressee_id = author_id) or (f.addressee_id = auth.uid() and f.requester_id = author_id))))));
create policy "users create stories" on public.stories for insert with check (author_id = auth.uid());
create policy "authors manage stories" on public.stories for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete stories" on public.stories for delete using (author_id = auth.uid());
create policy "story viewers manage views" on public.story_views for all using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());
create policy "members view conversations" on public.conversations for select using (public.is_conversation_member(id));
create policy "users create conversations" on public.conversations for insert with check (created_by = auth.uid());
create policy "members view membership" on public.conversation_members for select using (profile_id = auth.uid() or public.is_conversation_member(conversation_id));
create policy "conversation creators manage membership" on public.conversation_members for all using (profile_id = auth.uid() or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())) with check (profile_id = auth.uid() or exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid()));
create policy "members view messages" on public.messages for select using (public.is_conversation_member(conversation_id));
create policy "members send messages" on public.messages for insert with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "senders delete messages" on public.messages for update using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "public communities" on public.communities for select using (privacy = 'public' or public.is_community_member(id));
create policy "authenticated create communities" on public.communities for insert with check (created_by = auth.uid());
create policy "members view community membership" on public.community_members for select using (profile_id = auth.uid() or public.is_community_member(community_id));
create policy "users join public communities" on public.community_members for insert with check (profile_id = auth.uid() and exists (select 1 from public.communities c where c.id = community_id and c.privacy = 'public'));
create policy "members leave communities" on public.community_members for delete using (profile_id = auth.uid());
create policy "community members view posts" on public.community_posts for select using (public.is_community_member(community_id) or exists (select 1 from public.communities c where c.id = community_id and c.privacy = 'public'));
create policy "community members create posts" on public.community_posts for insert with check (author_id = auth.uid() and public.is_community_member(community_id));
create policy "users manage notification preferences" on public.notification_preferences for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "users view own activity" on public.user_activity for select using (profile_id = auth.uid());
create policy "users view own xp" on public.xp_transactions for select using (profile_id = auth.uid());
create policy "users view levels" on public.user_levels for select using (true);
create policy "users create reports" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reporters view reports" on public.reports for select using (reporter_id = auth.uid() or public.is_staff_or_admin());
create policy "users manage saved posts" on public.saved_posts for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
