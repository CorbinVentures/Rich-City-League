begin;

-- Player-entered Runs stats are personal, self-reported records. They never
-- become official box scores or feed rankings, badges, ratings, or REP.
create table public.rch_solo_run_stat_entries (
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_number smallint not null check (game_number between 1 and 20),
  points smallint not null default 0 check (points between 0 and 250),
  rebounds smallint not null default 0 check (rebounds between 0 and 250),
  assists smallint not null default 0 check (assists between 0 and 250),
  three_made smallint not null default 0 check (three_made between 0 and 250),
  three_attempted smallint not null default 0 check (three_attempted between 0 and 250),
  steals smallint not null default 0 check (steals between 0 and 250),
  blocks smallint not null default 0 check (blocks between 0 and 250),
  turnovers smallint not null default 0 check (turnovers between 0 and 250),
  defensive_stops smallint not null default 0 check (defensive_stops between 0 and 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (run_id, profile_id, game_number),
  check (three_made <= three_attempted)
);

alter table public.rch_solo_run_stat_entries enable row level security;
revoke all on public.rch_solo_run_stat_entries from public, anon, authenticated;
grant select on public.rch_solo_run_stat_entries to authenticated;
drop policy if exists "players read own solo Run stats" on public.rch_solo_run_stat_entries;
create policy "players read own solo Run stats"
  on public.rch_solo_run_stat_entries for select to authenticated
  using (profile_id = auth.uid());

create or replace function public.rch_submit_solo_run_stats(
  p_run uuid,
  p_game_number integer,
  p_points integer,
  p_rebounds integer,
  p_assists integer,
  p_three_made integer,
  p_three_attempted integer,
  p_steals integer,
  p_blocks integer,
  p_turnovers integer,
  p_defensive_stops integer
)
returns table(xp_awarded integer)
language plpgsql security definer set search_path='' as $fn$
declare
  v_actor uuid := auth.uid();
  v_run public.runs%rowtype;
  v_awarded boolean := false;
begin
  if v_actor is null then raise exception 'Sign in to save your personal stats'; end if;
  if p_game_number is null or p_game_number < 1 or p_game_number > 20 then
    raise exception 'Choose a game number from 1 to 20';
  end if;
  if p_points is null or p_rebounds is null or p_assists is null
     or p_three_made is null or p_three_attempted is null or p_steals is null
     or p_blocks is null or p_turnovers is null or p_defensive_stops is null then
    raise exception 'Enter a number for each stat, using 0 when it did not happen';
  end if;

  select * into v_run from public.runs where id = p_run for update;
  if not found or v_run.status = 'cancelled' then raise exception 'This Run is unavailable'; end if;
  if v_run.starts_at < now() - interval '72 hours'
     or v_run.starts_at > now() + interval '2 hours' then
    raise exception 'Personal stats open two hours before the Run and close 72 hours after it starts';
  end if;
  if exists (
    select 1 from public.rch_weekend_circuit_events e where e.run_id = p_run
  ) then
    raise exception 'Suggested court meetups do not accept game stats';
  end if;
  if v_actor <> v_run.host_id
     and not exists (
       select 1 from public.run_players rp
       where rp.run_id = p_run and rp.profile_id = v_actor
     )
     and not exists (
       select 1 from public.run_checkins rc
       where rc.run_id = p_run and rc.profile_id = v_actor
     ) then
    raise exception 'Join or check in to this Run before logging your stats';
  end if;

  insert into public.rch_solo_run_stat_entries (
    run_id, profile_id, game_number, points, rebounds, assists,
    three_made, three_attempted, steals, blocks, turnovers, defensive_stops,
    updated_at
  ) values (
    p_run, v_actor, p_game_number, p_points, p_rebounds, p_assists,
    p_three_made, p_three_attempted, p_steals, p_blocks, p_turnovers, p_defensive_stops,
    now()
  )
  on conflict (run_id, profile_id, game_number) do update set
    points = excluded.points,
    rebounds = excluded.rebounds,
    assists = excluded.assists,
    three_made = excluded.three_made,
    three_attempted = excluded.three_attempted,
    steals = excluded.steals,
    blocks = excluded.blocks,
    turnovers = excluded.turnovers,
    defensive_stops = excluded.defensive_stops,
    updated_at = now();

  -- Award XP once per player per hosted Run, even if they record several games.
  -- This source is explicitly excluded from the REP wallet below.
  v_awarded := public.award_run_rep(
    v_actor, 15, 'solo_run_stats', 'solo_run_stats', p_run
  );
  return query select case when v_awarded then 15 else 0 end;
end
$fn$;

revoke all on function public.rch_submit_solo_run_stats(
  uuid, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.rch_submit_solo_run_stats(
  uuid, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer
) to authenticated;

-- Ordinary XP transactions also credit the REP wallet. Solo self-reports earn
-- account XP only, so they are excluded from that wallet while verified awards
-- continue through the existing ledger.
create or replace function public.rch_rep_verified_earnings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name = 'xp_transactions' then
    if new.source_type = 'solo_run_stats' then return new; end if;
    perform public.rch_rep_credit_internal(
      new.profile_id, new.amount,
      'xp:' || new.id::text,
      coalesce(new.reason, 'Verified social action')
    );
  elsif tg_table_name = 'rch_run_rep_events' then
    perform public.rch_rep_credit_internal(
      new.profile_id, new.rep,
      'run:' || new.match_id::text || ':' || new.profile_id::text || ':' || new.reason,
      'Verified Run: ' || new.reason
    );
  elsif tg_table_name = 'rch_run_stat_rewards' and new.rep_bonus > 0 then
    perform public.rch_rep_credit_internal(
      new.profile_id, new.rep_bonus,
      'run_stats:' || new.submission_id::text,
      'Reviewed Run statistics'
    );
  end if;
  return new;
end $$;
revoke all on function public.rch_rep_verified_earnings() from public, anon, authenticated;


-- Self-reported XP must not unlock the cumulative REP badges, now or later.
-- It still contributes to account XP and level progression.
create or replace function public.award_rep_badges()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  total_rep integer;
begin
  if new.source_type = 'solo_run_stats' then return new; end if;
  select coalesce(sum(amount), 0) into total_rep
  from public.xp_transactions
  where profile_id = new.profile_id
    and source_type is distinct from 'solo_run_stats';
  insert into public.fan_badges(profile_id, badge_id)
  select new.profile_id, b.id from public.badges b
  where b.is_active = true and b.requirement_type = 'rep_total'
    and total_rep >= b.requirement_value
  on conflict (profile_id, badge_id) do nothing;
  return new;
end $$;
revoke execute on function public.award_rep_badges() from public, anon, authenticated;

commit;
