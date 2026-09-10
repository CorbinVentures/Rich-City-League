-- Extensible identity and competition foundation for the RCL ecosystem.
do $$
begin
  alter type public.app_role add value if not exists 'fan';
exception when duplicate_object then null;
end $$;

create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  status text not null default 'active' check (status in ('active', 'pending', 'revoked')),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create table if not exists public.fan_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  favorite_team_id uuid references public.teams(id) on delete set null,
  fan_level integer not null default 1 check (fan_level >= 1),
  games_attended integer not null default 0 check (games_attended >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.score_explanations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  score_type text not null check (score_type in ('player_index', 'player_win_factor', 'coach_index', 'fan_win_factor')),
  score numeric(6,2) not null check (score between 0 and 100),
  components jsonb not null default '{}'::jsonb,
  data_points integer not null default 0 check (data_points >= 0),
  calculated_at timestamptz not null default now(),
  check (profile_id is not null or player_id is not null)
);

create table if not exists public.fantasy_seasons (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  scoring_rules jsonb not null default '{"points":1,"rebounds":1.2,"assists":1.5,"steals":3,"blocks":3,"turnovers":-1}'::jsonb,
  champion_fantasy_team_id uuid,
  created_at timestamptz not null default now(),
  unique (season_id)
);

create table if not exists public.fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  fantasy_season_id uuid not null references public.fantasy_seasons(id) on delete cascade,
  manager_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 60),
  total_points numeric(10,2) not null default 0 check (total_points >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  created_at timestamptz not null default now(),
  unique (fantasy_season_id, manager_id)
);

alter table public.fantasy_seasons
  drop constraint if exists fantasy_seasons_champion_fantasy_team_id_fkey;
alter table public.fantasy_seasons
  add constraint fantasy_seasons_champion_fantasy_team_id_fkey
  foreign key (champion_fantasy_team_id) references public.fantasy_teams(id) on delete set null;

create table if not exists public.fantasy_rosters (
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  roster_slot text not null default 'bench' check (roster_slot in ('starter', 'bench', 'ir')),
  acquired_at timestamptz not null default now(),
  primary key (fantasy_team_id, player_id)
);

create table if not exists public.fantasy_scores (
  id uuid primary key default gen_random_uuid(),
  fantasy_team_id uuid not null references public.fantasy_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  fantasy_points numeric(8,2) not null check (fantasy_points >= 0),
  scoring_breakdown jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (fantasy_team_id, player_id, game_id)
);

create index if not exists profile_roles_role_idx on public.profile_roles (role, status);
create index if not exists score_explanations_player_idx on public.score_explanations (player_id, score_type, calculated_at desc);
create index if not exists score_explanations_profile_idx on public.score_explanations (profile_id, score_type, calculated_at desc);
create index if not exists fantasy_teams_standings_idx on public.fantasy_teams (fantasy_season_id, total_points desc);
create index if not exists fantasy_scores_team_idx on public.fantasy_scores (fantasy_team_id, game_id);

alter table public.profile_roles enable row level security;
alter table public.fan_profiles enable row level security;
alter table public.score_explanations enable row level security;
alter table public.fantasy_seasons enable row level security;
alter table public.fantasy_teams enable row level security;
alter table public.fantasy_rosters enable row level security;
alter table public.fantasy_scores enable row level security;

create policy "public active profile roles" on public.profile_roles for select using (status = 'active');
create policy "users manage own fan role request" on public.profile_roles for insert with check (profile_id = auth.uid() and role = 'fan');
create policy "staff manage profile roles" on public.profile_roles for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "users view own fan profile" on public.fan_profiles for select using (true);
create policy "users update own fan profile" on public.fan_profiles for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "public score explanations" on public.score_explanations for select using (true);
create policy "staff manage score explanations" on public.score_explanations for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public fantasy seasons" on public.fantasy_seasons for select using (true);
create policy "staff manage fantasy seasons" on public.fantasy_seasons for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "public fantasy standings" on public.fantasy_teams for select using (true);
create policy "managers create fantasy teams" on public.fantasy_teams for insert with check (manager_id = auth.uid());
create policy "managers update fantasy teams" on public.fantasy_teams for update using (manager_id = auth.uid()) with check (manager_id = auth.uid());
create policy "managers manage fantasy rosters" on public.fantasy_rosters for all using (
  exists (select 1 from public.fantasy_teams t where t.id = fantasy_team_id and t.manager_id = auth.uid())
) with check (
  exists (select 1 from public.fantasy_teams t where t.id = fantasy_team_id and t.manager_id = auth.uid())
);
create policy "public fantasy scores" on public.fantasy_scores for select using (true);
create policy "staff manage fantasy scores" on public.fantasy_scores for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create or replace function public.calculate_fantasy_points(
  points numeric, rebounds numeric, assists numeric, steals numeric, blocks numeric, turnovers numeric,
  rules jsonb default '{"points":1,"rebounds":1.2,"assists":1.5,"steals":3,"blocks":3,"turnovers":-1}'::jsonb
) returns numeric language sql immutable as $$
  select round(
    coalesce(points, 0) * coalesce((rules->>'points')::numeric, 1)
    + coalesce(rebounds, 0) * coalesce((rules->>'rebounds')::numeric, 1)
    + coalesce(assists, 0) * coalesce((rules->>'assists')::numeric, 1)
    + coalesce(steals, 0) * coalesce((rules->>'steals')::numeric, 1)
    + coalesce(blocks, 0) * coalesce((rules->>'blocks')::numeric, 1)
    + coalesce(turnovers, 0) * coalesce((rules->>'turnovers')::numeric, -1), 2
  );
$$;
grant execute on function public.calculate_fantasy_points(numeric, numeric, numeric, numeric, numeric, numeric, jsonb) to anon, authenticated;
