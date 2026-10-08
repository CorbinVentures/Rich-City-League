-- Harden cross-season integrity and role-aware access for the foundation schema.

alter table public.divisions
  add constraint divisions_season_id_id_key unique (season_id, id);

alter table public.team_seasons
  add constraint team_seasons_division_same_season_fk
  foreign key (season_id, division_id)
  references public.divisions (season_id, id);

create index team_coaches_profile_team_idx
  on public.team_coaches (profile_id, team_id);

create index rosters_team_season_player_idx
  on public.rosters (team_season_id, player_id);

create or replace function public.is_coach_of_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff_or_admin()
    or exists (
      select 1
      from public.team_coaches
      where team_id = target_team_id
        and profile_id = auth.uid()
    )
$$;

create or replace function public.validate_roster_team_season()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.team_seasons ts
    where ts.id = new.team_season_id
  ) then
    raise exception 'Roster membership must reference a valid team season';
  end if;
  return new;
end
$$;

create trigger validate_roster_team_season
  before insert or update on public.rosters
  for each row execute procedure public.validate_roster_team_season();

create or replace function public.validate_player_stat_roster()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.games g
    join public.team_seasons ts on ts.season_id = g.season_id
    join public.rosters r on r.team_season_id = ts.id
    where g.id = new.game_id
      and ts.team_id = new.team_id
      and (ts.team_id = g.home_team_id or ts.team_id = g.away_team_id)
      and r.player_id = new.player_id
      and (r.left_at is null or r.left_at >= g.scheduled_at::date)
      and r.joined_at <= g.scheduled_at::date
  ) then
    raise exception 'Player statistics must belong to a player rostered on the team for the game season';
  end if;
  return new;
end
$$;

create trigger validate_player_stat_roster
  before insert or update on public.player_game_stats
  for each row execute procedure public.validate_player_stat_roster();

create or replace function public.validate_game_teams()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.team_seasons ts
    where ts.season_id = new.season_id
      and ts.team_id = new.home_team_id
      and (new.division_id is null or ts.division_id = new.division_id)
  ) or not exists (
    select 1
    from public.team_seasons ts
    where ts.season_id = new.season_id
      and ts.team_id = new.away_team_id
      and (new.division_id is null or ts.division_id = new.division_id)
  ) then
    raise exception 'Game teams must be registered for the game season and division';
  end if;
  return new;
end
$$;

create trigger validate_game_teams
  before insert or update on public.games
  for each row execute procedure public.validate_game_teams();

create or replace function public.validate_team_stat_team()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.games g
    join public.team_seasons ts on ts.season_id = g.season_id
    where g.id = new.game_id
      and ts.team_id = new.team_id
      and (ts.team_id = g.home_team_id or ts.team_id = g.away_team_id)
  ) then
    raise exception 'Team statistics must belong to a team playing in the game season';
  end if;
  return new;
end
$$;

create trigger validate_team_stat_team
  before insert or update on public.team_game_stats
  for each row execute procedure public.validate_team_stat_team();

drop policy "public profiles" on public.profiles;
create policy "users view safe profiles"
  on public.profiles
  for select
  using (id = auth.uid() or public.is_staff_or_admin());

drop policy "public commissioner names" on public.commissioners;
create policy "commissioners view assigned records"
  on public.commissioners
  for select
  using (profile_id = auth.uid() or public.is_staff_or_admin());

create policy "coaches manage their team seasons"
  on public.team_seasons
  for all
  using (public.is_coach_of_team(team_id))
  with check (public.is_coach_of_team(team_id));

create policy "coaches manage their rosters"
  on public.rosters
  for all
  using (
    public.is_staff_or_admin()
    or exists (
      select 1
      from public.team_seasons ts
      where ts.id = team_season_id
        and public.is_coach_of_team(ts.team_id)
    )
  )
  with check (
    public.is_staff_or_admin()
    or exists (
      select 1
      from public.team_seasons ts
      where ts.id = team_season_id
        and public.is_coach_of_team(ts.team_id)
    )
  );

create policy "players update own player record"
  on public.players
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "users update own comments"
  on public.comments
  for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "uploaders delete own media"
  on public.media
  for delete
  using (uploader_id = auth.uid() or public.is_staff_or_admin());
