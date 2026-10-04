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

commit;
