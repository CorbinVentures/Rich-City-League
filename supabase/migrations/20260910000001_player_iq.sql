-- RCL Player IQ: cached intelligence layer for public player experiences.
create table if not exists public.player_iq_profiles (
  player_id uuid primary key references public.players(id) on delete cascade,
  rcl_rating numeric(5,2) not null default 0 check (rcl_rating between 0 and 100),
  court_performance_score numeric(5,2) not null default 0 check (court_performance_score between 0 and 100),
  skill_profile_score numeric(5,2) not null default 0 check (skill_profile_score between 0 and 100),
  teammate_grade_score numeric(5,2) not null default 0 check (teammate_grade_score between 0 and 100),
  community_popularity_score numeric(5,2) not null default 0 check (community_popularity_score between 0 and 100),
  growth_consistency_score numeric(5,2) not null default 0 check (growth_consistency_score between 0 and 100),
  exposure_index numeric(5,2) not null default 0 check (exposure_index between 0 and 100),
  player_archetype text,
  rating_trend text not null default 'stable' check (rating_trend in ('rising', 'stable', 'declining')),
  previous_rating numeric(5,2) check (previous_rating between 0 and 100),
  rating_change numeric(6,2) not null default 0,
  games_evaluated integer not null default 0 check (games_evaluated >= 0),
  last_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_iq_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  rcl_rating numeric(5,2) not null check (rcl_rating between 0 and 100),
  court_performance_score numeric(5,2) not null check (court_performance_score between 0 and 100),
  skill_profile_score numeric(5,2) not null check (skill_profile_score between 0 and 100),
  teammate_grade_score numeric(5,2) not null check (teammate_grade_score between 0 and 100),
  community_popularity_score numeric(5,2) not null check (community_popularity_score between 0 and 100),
  growth_consistency_score numeric(5,2) not null check (growth_consistency_score between 0 and 100),
  exposure_index numeric(5,2) not null check (exposure_index between 0 and 100),
  calculated_at timestamptz not null default now()
);

create table if not exists public.teammate_evaluations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  evaluator_player_id uuid not null references public.players(id) on delete cascade,
  teammate_player_id uuid not null references public.players(id) on delete cascade,
  communication smallint not null check (communication between 1 and 5),
  unselfishness smallint not null check (unselfishness between 1 and 5),
  effort smallint not null check (effort between 1 and 5),
  leadership smallint not null check (leadership between 1 and 5),
  defense smallint not null check (defense between 1 and 5),
  team_chemistry smallint not null check (team_chemistry between 1 and 5),
  coachability smallint not null check (coachability between 1 and 5),
  created_at timestamptz not null default now(),
  check (evaluator_player_id <> teammate_player_id),
  unique (game_id, evaluator_player_id, teammate_player_id)
);

create index if not exists player_iq_rating_idx on public.player_iq_profiles (rcl_rating desc);
create index if not exists player_iq_exposure_idx on public.player_iq_profiles (exposure_index desc);
create index if not exists player_iq_history_player_idx on public.player_iq_history (player_id, calculated_at desc);
create index if not exists teammate_evaluations_teammate_idx on public.teammate_evaluations (teammate_player_id, created_at desc);

alter table public.player_iq_profiles enable row level security;
alter table public.player_iq_history enable row level security;
alter table public.teammate_evaluations enable row level security;

drop policy if exists "public player iq profiles" on public.player_iq_profiles;
create policy "public player iq profiles" on public.player_iq_profiles for select using (true);
drop policy if exists "staff manage player iq profiles" on public.player_iq_profiles;
create policy "staff manage player iq profiles" on public.player_iq_profiles for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "public player iq history" on public.player_iq_history;
create policy "public player iq history" on public.player_iq_history for select using (true);
drop policy if exists "staff manage player iq history" on public.player_iq_history;
create policy "staff manage player iq history" on public.player_iq_history for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "eligible players submit evaluations" on public.teammate_evaluations;
create policy "eligible players submit evaluations" on public.teammate_evaluations
  for insert with check (
    public.is_staff_or_admin()
    or exists (
      select 1 from public.players evaluator
      join public.rosters evaluator_roster on evaluator_roster.player_id = evaluator.id and evaluator_roster.left_at is null
      join public.rosters teammate_roster on teammate_roster.player_id = teammate_player_id and teammate_roster.team_season_id = evaluator_roster.team_season_id and teammate_roster.left_at is null
      join public.games evaluated_game on evaluated_game.id = game_id
      where evaluator.id = evaluator_player_id
        and evaluator.profile_id = auth.uid()
        and evaluator.id <> teammate_player_id
        and evaluated_game.status = 'completed'
    )
  );
drop policy if exists "players view own evaluations" on public.teammate_evaluations;
create policy "players view own evaluations" on public.teammate_evaluations for select using (
  public.is_staff_or_admin()
  or evaluator_player_id in (select id from public.players where profile_id = auth.uid())
  or teammate_player_id in (select id from public.players where profile_id = auth.uid())
);

drop trigger if exists player_iq_profiles_updated_at on public.player_iq_profiles;
create trigger player_iq_profiles_updated_at before update on public.player_iq_profiles for each row execute procedure public.set_updated_at();

create or replace view public.public_player_iq with (security_invoker = false) as
select
  p.player_id, p.rcl_rating, p.court_performance_score, p.skill_profile_score,
  p.teammate_grade_score, p.community_popularity_score, p.growth_consistency_score,
  p.exposure_index, p.player_archetype, p.rating_trend, p.previous_rating,
  p.rating_change, p.games_evaluated, p.last_calculated_at
from public.player_iq_profiles p
join public.players player on player.id = p.player_id
where player.is_active;
grant select on public.public_player_iq to anon, authenticated;
