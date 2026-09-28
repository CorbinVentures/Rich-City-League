begin;

alter table public.news
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

alter table public.media
  add column if not exists team_id uuid references public.teams(id) on delete cascade;

create index if not exists news_team_id_published_at_idx
  on public.news(team_id, published_at desc)
  where team_id is not null;

create index if not exists media_team_id_created_at_idx
  on public.media(team_id, created_at desc)
  where team_id is not null;

create table if not exists public.team_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  body text not null check (length(trim(body)) between 1 and 4000),
  is_pinned boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_announcements_team_published_idx
  on public.team_announcements(team_id, is_pinned desc, published_at desc);

alter table public.team_announcements enable row level security;

grant select, insert, update, delete on public.team_announcements to authenticated;
revoke all on public.team_announcements from anon;

drop policy if exists "members read team announcements" on public.team_announcements;
create policy "members read team announcements"
on public.team_announcements for select
to authenticated
using (true);

drop policy if exists "team operators create announcements" on public.team_announcements;
create policy "team operators create announcements"
on public.team_announcements for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (public.is_coach_of_team(team_id) or public.is_staff_or_admin())
);

drop policy if exists "team operators update announcements" on public.team_announcements;
create policy "team operators update announcements"
on public.team_announcements for update
to authenticated
using (
  public.is_coach_of_team(team_id) or public.is_staff_or_admin()
)
with check (
  public.is_coach_of_team(team_id) or public.is_staff_or_admin()
);

drop policy if exists "team operators delete announcements" on public.team_announcements;
create policy "team operators delete announcements"
on public.team_announcements for delete
to authenticated
using (
  public.is_coach_of_team(team_id) or public.is_staff_or_admin()
);

-- Existing authenticated media uploads remain available for member media, but
-- a team_id may only be attached by an authorized team operator.
drop policy if exists "authenticated media upload" on public.media;
create policy "authenticated media upload"
on public.media for insert
to authenticated
with check (
  uploader_id = (select auth.uid())
  and (
    team_id is null
    or public.is_coach_of_team(team_id)
    or public.is_staff_or_admin()
  )
);

drop policy if exists "coach create team news" on public.news;
create policy "coach create team news"
on public.news for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and team_id is not null
  and (public.is_coach_of_team(team_id) or public.is_staff_or_admin())
);

drop policy if exists "coach update team news" on public.news;
create policy "coach update team news"
on public.news for update
to authenticated
using (
  team_id is not null
  and (public.is_coach_of_team(team_id) or public.is_staff_or_admin())
)
with check (
  team_id is not null
  and (public.is_coach_of_team(team_id) or public.is_staff_or_admin())
);

drop policy if exists "coach delete team news" on public.news;
create policy "coach delete team news"
on public.news for delete
to authenticated
using (
  team_id is not null
  and (public.is_coach_of_team(team_id) or public.is_staff_or_admin())
);

commit;
