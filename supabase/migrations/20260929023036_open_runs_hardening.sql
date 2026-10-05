begin;

-- Public functions default to EXECUTE for PUBLIC in PostgreSQL. Open Runs reward RPCs
-- must only be callable by signed-in members because they award REP and badges.
revoke all on function public.check_in_to_run(uuid) from public;
revoke all on function public.check_in_to_run(uuid) from anon;
revoke all on function public.claim_latest_run_highlight(uuid) from public;
revoke all on function public.claim_latest_run_highlight(uuid) from anon;
grant execute on function public.check_in_to_run(uuid) to authenticated;
grant execute on function public.claim_latest_run_highlight(uuid) to authenticated;

-- Normalize activity-form values before the existing runs.game_format constraint is
-- evaluated. This also makes direct API clients case-insensitive for legacy values.
create or replace function public.normalize_run_game_format()
returns trigger language plpgsql set search_path=public as $$
begin
  new.game_format := lower(trim(new.game_format));
  return new;
end $$;

drop trigger if exists normalize_run_game_format_before_write on public.runs;
create trigger normalize_run_game_format_before_write
  before insert or update of game_format on public.runs
  for each row execute function public.normalize_run_game_format();

revoke all on function public.normalize_run_game_format() from public, anon, authenticated;

commit;
