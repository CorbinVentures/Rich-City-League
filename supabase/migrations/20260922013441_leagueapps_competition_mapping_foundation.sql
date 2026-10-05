create table if not exists public.leagueapps_team_mappings (
  program_id bigint not null,
  leagueapps_team_id bigint not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  team_season_id uuid references public.team_seasons(id) on delete cascade,
  team_name text not null,
  updated_at timestamptz not null default now(),
  primary key (program_id, leagueapps_team_id)
);
create index if not exists leagueapps_team_mappings_team_idx on public.leagueapps_team_mappings(team_id);
alter table public.leagueapps_team_mappings enable row level security;
drop policy if exists "Admins manage LeagueApps team mappings" on public.leagueapps_team_mappings;
create policy "Admins manage LeagueApps team mappings" on public.leagueapps_team_mappings for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.leagueapps_team_mappings from anon;
grant select,insert,update,delete on public.leagueapps_team_mappings to authenticated;
drop index if exists public.divisions_leagueapps_program_uidx;
create unique index if not exists standings_season_team_uidx on public.standings(season_id,team_id);