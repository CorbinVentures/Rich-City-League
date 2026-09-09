-- Complete the foundation with operational, notification, and audit structures.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (length(trim(type)) > 0),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.commissioners (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Commissioner',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (league_id, profile_id)
);

create table public.registration_items (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  description text not null,
  created_at timestamptz not null default now(),
  check (player_id is not null or team_id is not null)
);

alter table public.team_game_stats
  add constraint team_game_stats_nonnegative check (
    points >= 0 and rebounds >= 0 and assists >= 0 and turnovers >= 0 and fouls >= 0
  );

alter table public.player_game_stats
  add constraint player_game_stats_nonnegative check (
    minutes >= 0 and points >= 0 and rebounds >= 0 and assists >= 0 and steals >= 0
    and blocks >= 0 and turnovers >= 0 and fouls >= 0
    and field_goals_made >= 0 and field_goals_attempted >= 0
    and three_pointers_made >= 0 and three_pointers_attempted >= 0
    and free_throws_made >= 0 and free_throws_attempted >= 0
  );

alter table public.rosters
  add constraint rosters_valid_dates check (left_at is null or left_at >= joined_at);

alter table public.standings
  add constraint standings_nonnegative check (
    wins >= 0 and losses >= 0 and ties >= 0 and points_for >= 0 and points_against >= 0
  );

create index seasons_league_status_idx on public.seasons (league_id, status);
create index team_seasons_season_division_idx on public.team_seasons (season_id, division_id);
create index games_team_schedule_idx on public.games (home_team_id, scheduled_at);
create index games_away_team_schedule_idx on public.games (away_team_id, scheduled_at);
create index player_game_stats_player_game_idx on public.player_game_stats (player_id, game_id);
create index standings_season_rank_idx on public.standings (season_id, division_id, rank);
create index registrations_season_status_idx on public.registrations (season_id, status);
create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index commissioners_league_idx on public.commissioners (league_id);

create or replace function public.is_commissioner(target_league_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_staff_or_admin()
    or exists (
      select 1 from public.commissioners
      where league_id = target_league_id and profile_id = auth.uid()
    )
$$;

create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators can change profile roles';
  end if;
  if new.is_active is distinct from old.is_active and not public.is_admin() then
    raise exception 'Only administrators can change profile status';
  end if;
  return new;
end
$$;

create trigger protect_profile_privileged_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_fields();

alter table public.notifications enable row level security;
alter table public.commissioners enable row level security;
alter table public.registration_items enable row level security;

create policy "users view own notifications" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "users mark own notifications" on public.notifications
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
create policy "staff create notifications" on public.notifications
  for insert with check (public.is_staff_or_admin());
create policy "users delete own notifications" on public.notifications
  for delete using (recipient_id = auth.uid());

create policy "public commissioner names" on public.commissioners
  for select using (true);
create policy "staff manage commissioners" on public.commissioners
  for all using (public.is_staff_or_admin() or public.is_admin())
  with check (public.is_staff_or_admin() or public.is_admin());

create policy "users view own registration items" on public.registration_items
  for select using (
    public.is_staff_or_admin()
    or exists (
      select 1 from public.registrations r
      where r.id = registration_id and r.applicant_id = auth.uid()
    )
  );
create policy "staff manage registration items" on public.registration_items
  for all using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
