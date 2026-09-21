-- Reconcile production RCL Runs schema with the current application contract.
-- Some earlier production state used capacity/run_type; keep those fields while
-- exposing the current game_format/max_players contract used by the app.

alter table public.runs
  add column if not exists game_format text not null default '5v5';

alter table public.runs
  add column if not exists max_players integer not null default 10;

update public.runs
set max_players = coalesce(capacity, max_players);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.runs'::regclass
      and conname = 'runs_game_format_check'
  ) then
    alter table public.runs add constraint runs_game_format_check
      check (game_format in ('1v1','3v3','4v4','5v5','shootaround','open_run'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.runs'::regclass
      and conname = 'runs_max_players_check'
  ) then
    alter table public.runs add constraint runs_max_players_check
      check (max_players between 2 and 50);
  end if;
end $$;

drop policy if exists "users join open runs" on public.run_players;

create policy "users join open runs" on public.run_players
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.runs r
      where r.id = run_players.run_id
        and r.status = 'open'
        and r.starts_at > now()
        and (
          select count(*)
          from public.run_players rp
          where rp.run_id = run_players.run_id
        ) < r.max_players
    )
  );
