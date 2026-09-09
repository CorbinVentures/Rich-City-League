-- Keep standings, notifications, and public live updates derived from trusted writes.

create or replace function public.rebuild_standings(target_season_id uuid, target_division_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.standings
  where season_id = target_season_id
    and division_id is not distinct from target_division_id;

  insert into public.standings (
    season_id, division_id, team_id, wins, losses, ties,
    points_for, points_against, streak, rank, updated_at
  )
  with teams_in_division as (
    select ts.season_id, ts.division_id, ts.team_id
    from public.team_seasons ts
    where ts.season_id = target_season_id
      and ts.division_id is not distinct from target_division_id
    group by ts.season_id, ts.division_id, ts.team_id
  ),
  results as (
    select g.season_id, g.division_id, g.home_team_id as team_id,
      case when g.home_score > g.away_score then 1 else 0 end as wins,
      case when g.home_score < g.away_score then 1 else 0 end as losses,
      case when g.home_score = g.away_score then 1 else 0 end as ties,
      g.home_score as points_for, g.away_score as points_against
    from public.games g
    where g.season_id = target_season_id
      and g.division_id is not distinct from target_division_id
      and g.status = 'completed'
    union all
    select g.season_id, g.division_id, g.away_team_id,
      case when g.away_score > g.home_score then 1 else 0 end,
      case when g.away_score < g.home_score then 1 else 0 end,
      case when g.away_score = g.home_score then 1 else 0 end,
      g.away_score, g.home_score
    from public.games g
    where g.season_id = target_season_id
      and g.division_id is not distinct from target_division_id
      and g.status = 'completed'
  ),
  totals as (
    select t.season_id, t.division_id, t.team_id,
      coalesce(sum(r.wins), 0)::integer as wins,
      coalesce(sum(r.losses), 0)::integer as losses,
      coalesce(sum(r.ties), 0)::integer as ties,
      coalesce(sum(r.points_for), 0)::integer as points_for,
      coalesce(sum(r.points_against), 0)::integer as points_against
    from teams_in_division t
    left join results r on r.team_id = t.team_id
    group by t.season_id, t.division_id, t.team_id
  ),
  ranked as (
    select totals.*,
      row_number() over (
        partition by division_id
        order by wins::numeric / nullif(wins + losses + ties, 0) desc nulls last,
          wins desc,
          (points_for - points_against) desc,
          points_for desc,
          team_id
      )::integer as rank
    from totals
  )
  select season_id, division_id, team_id, wins, losses, ties, points_for,
    points_against, null, rank, now()
  from ranked;
end;
$$;

create or replace function public.refresh_standings_for_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.rebuild_standings(old.season_id, old.division_id);
  end if;
  if tg_op <> 'DELETE' then
    perform public.rebuild_standings(new.season_id, new.division_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger refresh_standings_after_game
after insert or update or delete on public.games
for each row execute procedure public.refresh_standings_for_game();

create or replace function public.notify_registration_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.applicant_id is not null and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    insert into public.notifications (recipient_id, actor_id, type, title, body, link)
    values (
      new.applicant_id, auth.uid(), 'registration_status',
      'Registration ' || initcap(new.status::text),
      'Your registration status is now ' || new.status::text || '.',
      '/registration'
    );
  end if;
  return new;
end;
$$;

create trigger notify_registration_status_after_change
after insert or update of status on public.registrations
for each row execute procedure public.notify_registration_status();

create or replace function public.notify_game_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.scheduled_at is distinct from old.scheduled_at then
    insert into public.notifications (recipient_id, actor_id, type, title, body, link)
    select distinct tc.profile_id, auth.uid(), 'game_changed',
      case new.status
        when 'postponed' then 'Game postponed'
        when 'cancelled' then 'Game cancelled'
        else 'Game schedule changed'
      end,
      'A game involving your team has been updated.',
      '/games/' || new.id::text
    from public.team_coaches tc
    where tc.team_id in (new.home_team_id, new.away_team_id);
  end if;
  return new;
end;
$$;

create trigger notify_game_change_after_change
after insert or update of status, scheduled_at on public.games
for each row execute procedure public.notify_game_change();

create or replace function public.notify_award()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_id is not null then
    insert into public.notifications (recipient_id, actor_id, type, title, body, link)
    select p.profile_id, auth.uid(), 'award', 'New league award',
      'You received the ' || new.name || ' award.',
      '/players/' || new.player_id::text
    from public.players p
    where p.id = new.player_id and p.profile_id is not null;
  end if;
  return new;
end;
$$;

create trigger notify_award_after_insert
after insert on public.awards
for each row execute procedure public.notify_award();

alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.notifications;
