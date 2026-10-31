-- RCL roster invariants, applied to Supabase on 2026-10-30.
-- Prevent one athlete having simultaneous active clubs in the same season.
-- Preserve historical/released rows and do not impose an unratified roster-size cap.
-- This function must see every roster regardless of staff/coach RLS.
create or replace function private.enforce_single_active_rcl_roster()
returns trigger
language plpgsql security definer set search_path = ''
as $guard$
declare target_season uuid;
begin
  if new.left_at is not null then return new; end if;

  select ts.season_id into target_season
  from public.team_seasons ts where ts.id = new.team_season_id;
  if target_season is null then
    raise exception 'Roster membership must reference a valid season team'
      using errcode = '23503';
  end if;

  -- Serialize concurrent registrations for the same player and season.
  -- Querying other clubs without a transaction lock would have a race.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.player_id::text || ':' || target_season::text, 0)
  );
  if exists (
    select 1 from public.rosters r
    join public.team_seasons ts on ts.id = r.team_season_id
    where ts.season_id = target_season
      and r.player_id = new.player_id
      and r.left_at is null
      and r.id is distinct from new.id
      and r.team_season_id <> new.team_season_id
  ) then
    raise exception 'Player is already active on another club in this season'
      using errcode = '23505';
  end if;
  return new;
end;
$guard$;
revoke all on function private.enforce_single_active_rcl_roster()
from public, anon, authenticated;

drop trigger if exists guard_single_active_club_roster on public.rosters;
create trigger guard_single_active_club_roster
before insert or update of player_id, team_season_id, left_at
on public.rosters
for each row execute function private.enforce_single_active_rcl_roster();

-- Editing parent season/team would otherwise silently alter roster history.
create or replace function private.freeze_team_season_with_roster_history()
returns trigger
language plpgsql security definer set search_path = ''
as $freeze$
begin
  if (old.season_id is distinct from new.season_id
      or old.team_id is distinct from new.team_id)
    and exists (select 1 from public.rosters r where r.team_season_id = old.id) then
    raise exception 'Team-season identity is locked once roster history exists'
      using errcode = '23514';
  end if;
  return new;
end;
$freeze$;
revoke all on function private.freeze_team_season_with_roster_history()
from public, anon, authenticated;

drop trigger if exists guard_team_season_roster_history on public.team_seasons;
create trigger guard_team_season_roster_history
before update of season_id, team_id on public.team_seasons
for each row execute function private.freeze_team_season_with_roster_history();
