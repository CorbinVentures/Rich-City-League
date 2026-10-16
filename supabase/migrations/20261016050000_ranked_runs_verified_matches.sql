begin;

-- RCH Ranked Runs: separate basketball skill from social REP and self-reported box scores.
-- No historical game or self-reported statistic is retroactively awarded a rating.
create table public.run_ranked_matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.run_games(id) on delete restrict,
  run_id uuid not null references public.runs(id) on delete restrict,
  game_format text not null check (game_format in ('1v1','2v2','3v3','4v4','5v5')),
  home_team_id uuid not null references public.run_teams(id) on delete restrict,
  away_team_id uuid not null references public.run_teams(id) on delete restrict,
  home_score integer not null check (home_score between 0 and 250),
  away_score integer not null check (away_score between 0 and 250),
  home_roster uuid[] not null,
  away_roster uuid[] not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  submitted_by uuid not null references public.profiles(id),
  home_confirmed_by uuid references public.profiles(id),
  away_confirmed_by uuid references public.profiles(id),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  rejected_at timestamptz,
  check (home_score <> away_score),
  check (home_team_id <> away_team_id)
);
create index run_ranked_matches_run_idx on public.run_ranked_matches(run_id,status,submitted_at desc);

create table public.run_competitive_ratings (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_format text not null check (game_format in ('1v1','2v2','3v3','4v4','5v5')),
  rating integer not null default 1000 check (rating between 100 and 3000),
  games integer not null default 0 check (games >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  last_played_at timestamptz,
  primary key (profile_id,game_format),
  check (games=wins+losses)
);
create index run_competitive_ratings_board_idx on public.run_competitive_ratings(game_format,rating desc,games desc);

-- Immutable audit trail of the exact rating movement caused by each confirmed game.
create table public.run_ranked_match_players (
  match_id uuid not null references public.run_ranked_matches(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  side text not null check (side in ('home','away')),
  rating_before integer not null,
  rating_after integer not null,
  primary key(match_id,profile_id)
);

alter table public.run_ranked_matches enable row level security;
alter table public.run_competitive_ratings enable row level security;
alter table public.run_ranked_match_players enable row level security;
revoke all on public.run_ranked_matches,public.run_competitive_ratings,public.run_ranked_match_players from public,anon,authenticated;
grant select on public.run_ranked_matches,public.run_competitive_ratings,public.run_ranked_match_players to authenticated;

create policy ranked_match_attendees_read on public.run_ranked_matches for select to authenticated
  using (status='verified' or submitted_by=(select auth.uid())
    or (select auth.uid())=any(home_roster) or (select auth.uid())=any(away_roster)
    or coalesce(public.is_staff_or_admin(),false));
create policy ranked_rating_owner_read on public.run_competitive_ratings for select to authenticated
  using (profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));
create policy ranked_rating_history_owner_read on public.run_ranked_match_players for select to authenticated
  using (profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));

-- The host records a completed game; players on BOTH sides must attest to its score.
-- Check-ins are attendance claims, not proof of physical geolocation.
create function public.submit_ranked_run_result(p_game uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_game public.run_games%rowtype;
  v_run public.runs%rowtype;
  v_size integer;
  v_home uuid[];
  v_away uuid[];
  v_id uuid;
begin
  if v_actor is null then raise exception 'Sign in to submit a result'; end if;
  select * into v_game from public.run_games where id=p_game for update;
  if not found then raise exception 'Game not found'; end if;
  select * into v_run from public.runs where id=v_game.run_id;
  if v_actor<>v_run.host_id and not coalesce(public.is_staff_or_admin(),false) then
    raise exception 'Only the run host or RCH staff can submit game results';
  end if;
  if v_run.run_type<>'competitive' or v_run.status='cancelled'
     or v_run.game_format not in ('1v1','2v2','3v3','4v4','5v5') then
    raise exception 'Only structured 1v1–5v5 competitive runs are rated';
  end if;
  if v_game.status<>'completed' or v_game.home_score=v_game.away_score
     or v_run.starts_at>now() or v_run.starts_at<now()-interval '14 days' then
    raise exception 'Complete a non-tied game within 14 days of the run';
  end if;
  v_size:=split_part(v_run.game_format,'v',1)::integer;
  select array_agg(m.profile_id order by m.profile_id) into v_home
    from public.run_team_members m where m.run_id=v_run.id and m.run_team_id=v_game.home_run_team_id;
  select array_agg(m.profile_id order by m.profile_id) into v_away
    from public.run_team_members m where m.run_id=v_run.id and m.run_team_id=v_game.away_run_team_id;
  if coalesce(array_length(v_home,1),0)<>v_size or coalesce(array_length(v_away,1),0)<>v_size then
    raise exception 'Both teams need exactly % assigned players before submitting',v_size;
  end if;
  if (select count(*) from public.run_checkins c
      where c.run_id=v_run.id and c.profile_id=any(v_home))<>v_size
    or (select count(*) from public.run_checkins c
      where c.run_id=v_run.id and c.profile_id=any(v_away))<>v_size then
    raise exception 'Each rostered player must check in before the result can be rated';
  end if;
  if exists(select 1 from public.run_ranked_matches m
      where m.run_id=v_run.id and m.status='verified'
        and m.home_team_id in (v_game.home_run_team_id,v_game.away_run_team_id)
        and m.away_team_id in (v_game.home_run_team_id,v_game.away_run_team_id)
      group by m.run_id having count(*)>=3) then
    raise exception 'At most three games between these teams per run can affect ratings';
  end if;
  insert into public.run_ranked_matches(
    game_id,run_id,game_format,home_team_id,away_team_id,home_score,away_score,home_roster,away_roster,submitted_by
  ) values (
    p_game,v_run.id,v_run.game_format,v_game.home_run_team_id,v_game.away_run_team_id,
    v_game.home_score,v_game.away_score,v_home,v_away,v_actor
  )
  on conflict (game_id) do update set
    home_score=excluded.home_score,away_score=excluded.away_score,
    home_roster=excluded.home_roster,away_roster=excluded.away_roster,
    status='pending',home_confirmed_by=null,away_confirmed_by=null,
    submitted_by=excluded.submitted_by,submitted_at=now(),rejected_at=null
    where public.run_ranked_matches.status='rejected'
  returning id into v_id;
  if v_id is null then raise exception 'This game already has an open or verified review'; end if;
  return v_id;
end $$;

create function public.review_ranked_run_result(p_match uuid,p_approve boolean)
returns text language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  m public.run_ranked_matches%rowtype;
  v_home_confirm uuid;
  v_away_confirm uuid;
  v_home_rating numeric;
  v_away_rating numeric;
  v_expected numeric;
  v_person uuid;
  v_rating integer;
  v_games integer;
  v_k integer;
  v_delta integer;
  v_after integer;
  v_result numeric;
  v_side text;
begin
  if v_actor is null then raise exception 'Sign in to review a game'; end if;
  -- Serialize updates so two overlapping matches cannot clobber a player's rating.
  perform pg_catalog.pg_advisory_xact_lock(786441);
  select * into m from public.run_ranked_matches where id=p_match for update;
  if m.id is null or m.status<>'pending' then raise exception 'No pending game review'; end if;
  if v_actor<>all(m.home_roster) and v_actor<>all(m.away_roster) then
    raise exception 'Only checked-in competitors can confirm this game';
  end if;
  if not p_approve then
    update public.run_ranked_matches set status='rejected',rejected_at=now() where id=p_match;
    return 'rejected';
  end if;
  v_home_confirm:=m.home_confirmed_by;
  v_away_confirm:=m.away_confirmed_by;
  if v_actor=any(m.home_roster) then v_home_confirm:=v_actor; end if;
  if v_actor=any(m.away_roster) then v_away_confirm:=v_actor; end if;
  if v_home_confirm is null or v_away_confirm is null then
    update public.run_ranked_matches
      set home_confirmed_by=v_home_confirm,away_confirmed_by=v_away_confirm
      where id=p_match;
    return 'awaiting_opponent';
  end if;

  -- Don't allow forged roster/results to be verified after the original Run was cancelled.
  if not exists(select 1 from public.runs r where r.id=m.run_id and r.run_type='competitive' and r.status<>'cancelled') then
    raise exception 'This run is no longer eligible';
  end if;
  if (select count(*) from public.run_ranked_matches other
      where other.run_id=m.run_id and other.status='verified'
        and other.home_team_id in (m.home_team_id,m.away_team_id)
        and other.away_team_id in (m.home_team_id,m.away_team_id))>=3 then
    raise exception 'These teams already have three rated games at this run';
  end if;

  insert into public.run_competitive_ratings(profile_id,game_format)
    select unnest(m.home_roster||m.away_roster),m.game_format on conflict do nothing;
  select avg(r.rating)::numeric into v_home_rating from public.run_competitive_ratings r
    where r.game_format=m.game_format and r.profile_id=any(m.home_roster);
  select avg(r.rating)::numeric into v_away_rating from public.run_competitive_ratings r
    where r.game_format=m.game_format and r.profile_id=any(m.away_roster);
  v_expected:=1.0/(1.0+power(10.0,(v_away_rating-v_home_rating)/400.0));

  for v_person in select unnest(m.home_roster||m.away_roster) loop
    v_side:=case when v_person=any(m.home_roster) then 'home' else 'away' end;
    select r.rating,r.games into v_rating,v_games
      from public.run_competitive_ratings r where r.profile_id=v_person and r.game_format=m.game_format for update;
    -- Provisional players adjust faster; larger team games adjust more conservatively.
    v_k:=case m.game_format when '1v1' then 36 when '2v2' then 32
      when '3v3' then 28 when '4v4' then 24 else 20 end;
    if v_games<5 then v_k:=round(v_k*1.3)::integer; end if;
    v_result:=case when (v_side='home' and m.home_score>m.away_score)
      or (v_side='away' and m.away_score>m.home_score) then 1 else 0 end;
    v_delta:=round(v_k*(v_result-(case when v_side='home' then v_expected else 1-v_expected end)))::integer;
    v_after:=greatest(100,least(3000,v_rating+v_delta));
    update public.run_competitive_ratings
      set rating=v_after,games=games+1,wins=wins+(case when v_result=1 then 1 else 0 end),
        losses=losses+(case when v_result=0 then 1 else 0 end),last_played_at=now()
      where profile_id=v_person and game_format=m.game_format;
    insert into public.run_ranked_match_players(match_id,profile_id,side,rating_before,rating_after)
      values(m.id,v_person,v_side,v_rating,v_after);
  end loop;
  update public.run_ranked_matches
    set home_confirmed_by=v_home_confirm,away_confirmed_by=v_away_confirm,
        status='verified',verified_at=now() where id=p_match;
  return 'verified';
end $$;

-- Keep the attested source game immutable after its result has impacted ratings.
create function public.guard_verified_run_game()
returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.run_ranked_matches m
    where m.game_id=old.id and m.status='verified') then
    raise exception 'Verified ranked game is locked for audit; contact RCH staff';
  end if;
  return old;
end $$;
create trigger guard_verified_run_game_changes before update or delete on public.run_games
  for each row execute function public.guard_verified_run_game();

create function public.get_ranked_run_ladder(
  p_format text default '5v5',p_scope text default 'state',
  p_city text default 'Richmond',p_limit integer default 25
) returns table(
  profile_id uuid,player_name text,avatar_url text,city text,game_format text,
  rating integer,games integer,wins integer,losses integer,provisional boolean
) language plpgsql stable security definer set search_path='' as $$
begin
  if p_format not in ('1v1','2v2','3v3','4v4','5v5') then raise exception 'Choose a supported match format'; end if;
  return query
    select r.profile_id,
      coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player')::text,
      p.avatar_url::text,
      coalesce(nullif(left(trim(split_part(p.location,',',1)),45),''),'Virginia')::text,
      r.game_format,r.rating,r.games,r.wins,r.losses,(r.games<5)
    from public.run_competitive_ratings r
    join public.profiles p on p.id=r.profile_id
    where r.game_format=p_format and r.games>0 and p.is_active
      and not coalesce(p.is_system_account,false)
      and coalesce(p.profile_visibility,'public') not in ('private','only_me')
      and (p_scope<>'city' or lower(trim(split_part(coalesce(p.location,''),',',1)))=lower(trim(p_city)))
    order by (r.rating-case when r.games<5 then 60 else 0 end) desc,
      r.wins desc,r.games desc,r.profile_id
    limit least(greatest(coalesce(p_limit,25),1),50);
end $$;

revoke all on function public.submit_ranked_run_result(uuid),
  public.review_ranked_run_result(uuid,boolean),
  public.get_ranked_run_ladder(text,text,text,integer),
  public.guard_verified_run_game() from public,anon,authenticated;
grant execute on function public.submit_ranked_run_result(uuid),
  public.review_ranked_run_result(uuid,boolean) to authenticated;
grant execute on function public.get_ranked_run_ladder(text,text,text,integer) to anon,authenticated;

comment on table public.run_ranked_matches is
  'Verified competitive run results require a real completed run, exact checked-in rosters, and one score attestation from EACH opposing team. Rankings do not affect REP or Cup scores.';
comment on table public.run_competitive_ratings is
  'Format-specific Elo-style skill estimate, initialized at 1000. Provisional ratings have fewer than five confirmed games.';

commit;
