begin;

-- The circuit is a season-specific lens over existing independently verified Run matches.
-- A cycle starts on November 1 (America/New_York), closes December 20, and ends
-- with the Commonwealth Cup on January 1 of the following calendar year.
-- Historical verified Run ratings and ordinary social REP remain unchanged.

create table if not exists public.rch_run_crew_teams (
  run_team_id uuid primary key references public.run_teams(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  crew_id uuid not null references public.commonwealth_crews(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unique(run_id,crew_id)
);
create index if not exists rch_run_crew_teams_crew_idx on public.rch_run_crew_teams(crew_id,run_id);
alter table public.rch_run_crew_teams enable row level security;
revoke all on public.rch_run_crew_teams from public,anon,authenticated;
grant select on public.rch_run_crew_teams to anon,authenticated;
create policy rch_run_crew_teams_read on public.rch_run_crew_teams
  for select to anon,authenticated using(true);

-- Captains explicitly associate an actual, fully formed Run team with their crew.
-- This association must exist BEFORE match results are submitted; it cannot be
-- retroactively added to a winning team to manufacture qualification points.
create or replace function public.rch_assign_run_team_to_crew(p_run_team uuid,p_crew uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_run uuid;
  v_format text;
  v_size integer;
  v_total integer;
  v_crew_members integer;
begin
  if v_actor is null then raise exception 'Sign in to represent a crew'; end if;
  select t.run_id,r.game_format into v_run,v_format
  from public.run_teams t join public.runs r on r.id=t.run_id
  where t.id=p_run_team and r.run_type='competitive' and r.status<>'cancelled';
  if v_run is null or v_format not in ('2v2','3v3','4v4','5v5') then
    raise exception 'Choose a competitive 2v2–5v5 Run team';
  end if;
  if not exists (select 1 from public.commonwealth_crews c
    where c.id=p_crew and c.captain_id=v_actor) then
    raise exception 'Only your crew captain may claim a team';
  end if;
  if not exists (select 1 from public.commonwealth_run_entries e
    where e.run_id=v_run and e.crew_id=p_crew) then
    raise exception 'Register your crew for this Run first';
  end if;
  if exists (select 1 from public.run_ranked_matches m
     where m.home_team_id=p_run_team or m.away_team_id=p_run_team) then
     raise exception 'Crew identity must be confirmed before match results are submitted';
  end if;
  v_size:=split_part(v_format,'v',1)::integer;
  select count(*),count(cm.profile_id) into v_total,v_crew_members
  from public.run_team_members tm
  left join public.commonwealth_crew_members cm
     on cm.profile_id=tm.profile_id and cm.crew_id=p_crew
  where tm.run_team_id=p_run_team and tm.run_id=v_run;
  if v_total<>v_size or v_crew_members<>v_size then
    raise exception 'All % Run team members must belong to this crew',v_size;
  end if;
  insert into public.rch_run_crew_teams(run_team_id,run_id,crew_id,assigned_by)
  values(p_run_team,v_run,p_crew,v_actor)
  on conflict(run_team_id) do nothing;
  if not exists(select 1 from public.rch_run_crew_teams
    where run_team_id=p_run_team and crew_id=p_crew) then
    raise exception 'This Run team belongs to a different crew';
  end if;
end $$;

-- The public circuit board returns ONLY public, active player identities,
-- approved crew identities and independently verified match summaries.
-- No unchecked-in attendance, unreviewed box score, or self-declared win counts.
create or replace function public.get_rch_circuit_standings(
  p_cycle integer default 2026,
  p_format text default '3v3',
  p_limit integer default 30
) returns table(
  competitor_id uuid, competitor_name text, city text, logo_path text,
  games bigint, wins bigint, losses bigint, qualifying_points bigint,
  run_sessions bigint, eligible boolean, seed bigint
) language plpgsql stable security definer set search_path='' as $$
begin
  if p_cycle < 2026 or p_cycle > extract(year from now() at time zone 'America/New_York')::integer+1 then
    raise exception 'Invalid competitive cycle';
  end if;
  if p_format not in ('1v1','2v2','3v3','4v4','5v5') then
    raise exception 'Choose a valid competitive division';
  end if;
  if p_format='1v1' then
    return query
      with results as (
        select mp.profile_id as id,m.run_id,
          case when mp.side='home' then m.home_score>m.away_score
               else m.away_score>m.home_score end as won
        from public.run_ranked_match_players mp
        join public.run_ranked_matches m on m.id=mp.match_id
        join public.runs r on r.id=m.run_id
        where m.status='verified' and m.game_format='1v1'
          and r.run_type='competitive' and r.status<>'cancelled'
          and r.starts_at>=make_timestamptz(p_cycle,11,1,0,0,0,'America/New_York')
          and r.starts_at<make_timestamptz(p_cycle,12,21,0,0,0,'America/New_York')
          and m.verified_at<make_timestamptz(p_cycle+1,1,1,0,0,0,'America/New_York')
      ), aggregate as (
        select id,count(*)::bigint as played,
          count(*) filter(where won)::bigint as victorious,
          count(distinct run_id)::bigint as sessions
        from results group by id
      ), entrants as (
        select a.id,
          coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player') as name,
          left(trim(split_part(coalesce(p.location,'Virginia'),',',1)),80) as locality,
          p.avatar_url as image,
          a.played,a.victorious,a.sessions,
          (a.played>=3 and a.sessions>=2) as qualified
        from aggregate a join public.profiles p on p.id=a.id
        where p.is_active and not coalesce(p.is_system_account,false)
          and coalesce(p.profile_visibility,'public') not in ('private','only_me')
      )
      select e.id,e.name,e.locality,e.image,e.played,e.victorious,
        e.played-e.victorious,(3*e.victorious)::bigint,e.sessions,e.qualified,
        row_number() over(order by e.qualified desc,e.victorious desc,
          (e.victorious::numeric/nullif(e.played,0)) desc,e.played desc,e.id)
      from entrants e
      order by e.qualified desc,e.victorious desc,
        (e.victorious::numeric/nullif(e.played,0)) desc,e.played desc,e.id
      limit least(greatest(coalesce(p_limit,30),1),100);
  else
    return query
      with matches as (
        select m.id,m.run_id,m.home_score,m.away_score,
               h.crew_id as home_crew,a.crew_id as away_crew
        from public.run_ranked_matches m
        join public.runs r on r.id=m.run_id
        join public.rch_run_crew_teams h on h.run_team_id=m.home_team_id and h.run_id=m.run_id
        join public.rch_run_crew_teams a on a.run_team_id=m.away_team_id and a.run_id=m.run_id
        where m.status='verified' and m.game_format=p_format
          and h.crew_id<>a.crew_id
          and r.run_type='competitive' and r.status<>'cancelled'
          and r.starts_at>=make_timestamptz(p_cycle,11,1,0,0,0,'America/New_York')
          and r.starts_at<make_timestamptz(p_cycle,12,21,0,0,0,'America/New_York')
          and m.verified_at<make_timestamptz(p_cycle+1,1,1,0,0,0,'America/New_York')
          and exists (select 1 from public.commonwealth_run_entries e where e.run_id=m.run_id and e.crew_id=h.crew_id)
          and exists (select 1 from public.commonwealth_run_entries e where e.run_id=m.run_id and e.crew_id=a.crew_id)
      ), sides as (
        select home_crew as id,away_crew as opponent,run_id,home_score>away_score as won from matches
        union all
        select away_crew as id,home_crew as opponent,run_id,away_score>home_score as won from matches
      ), aggregate as (
        select s.id,count(*)::bigint as played,
          count(*) filter(where s.won)::bigint as victorious,
          count(distinct s.run_id)::bigint as sessions,
          count(distinct s.opponent)::bigint as opponents
        from sides s group by s.id
      ), entrants as (
        select a.id,c.name,c.city as locality,c.logo_path as image,
          a.played,a.victorious,a.sessions,
          (a.played>=3 and a.sessions>=2 and a.opponents>=2) as qualified
        from aggregate a join public.commonwealth_crews c on c.id=a.id
      )
      select e.id,e.name,e.locality,e.image,e.played,e.victorious,
        e.played-e.victorious,(3*e.victorious)::bigint,e.sessions,e.qualified,
        row_number() over(order by e.qualified desc,e.victorious desc,
          (e.victorious::numeric/nullif(e.played,0)) desc,e.played desc,e.id)
      from entrants e
      order by e.qualified desc,e.victorious desc,
        (e.victorious::numeric/nullif(e.played,0)) desc,e.played desc,e.id
      limit least(greatest(coalesce(p_limit,30),1),100);
  end if;
end $$;

-- A championship title must be awarded by staff after the actual January 1 Cup.
-- No scheduled job manufactures winners, games, attendance or brackets.
create table if not exists public.rch_cup_titles (
  cycle_year integer not null check(cycle_year>=2026),
  division text not null check(division in ('1v1','2v2','3v3','4v4','5v5')),
  winner_profile_id uuid references public.profiles(id) on delete restrict,
  winner_crew_id uuid references public.commonwealth_crews(id) on delete restrict,
  verified_by uuid not null references public.profiles(id),
  evidence text not null check (length(trim(evidence)) between 10 and 1000),
  awarded_at timestamptz not null default now(),
  primary key(cycle_year,division),
  check ((division='1v1' and winner_profile_id is not null and winner_crew_id is null)
    or (division<>'1v1' and winner_crew_id is not null and winner_profile_id is null))
);
alter table public.rch_cup_titles enable row level security;
revoke all on public.rch_cup_titles from public,anon,authenticated;
grant select on public.rch_cup_titles to anon,authenticated;
create policy rch_cup_titles_public on public.rch_cup_titles for select to anon,authenticated using(true);

create or replace function public.rch_award_commonwealth_title(
  p_cycle integer,p_division text,p_winner uuid,p_evidence text
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_eligible boolean;
begin
  if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
    raise exception 'Only RCH competition staff may verify Cup titles';
  end if;
  if p_division not in ('1v1','2v2','3v3','4v4','5v5')
      or p_cycle<2026 or p_cycle>extract(year from now() at time zone 'America/New_York')::integer then
    raise exception 'Invalid Cup division or cycle';
  end if;
  if now()<make_timestamptz(p_cycle+1,1,1,0,0,0,'America/New_York') then
    raise exception 'Cup awards cannot be issued before January 1';
  end if;
  select s.eligible into v_eligible from public.get_rch_circuit_standings(p_cycle,p_division,100) s
  where s.competitor_id=p_winner;
  if not coalesce(v_eligible,false) then raise exception 'Winner must meet published Cup qualification standards'; end if;
  if length(trim(coalesce(p_evidence,''))) not between 10 and 1000 then
    raise exception 'Document the verified championship result';
  end if;
  insert into public.rch_cup_titles(cycle_year,division,winner_profile_id,winner_crew_id,verified_by,evidence)
  values(p_cycle,p_division,case when p_division='1v1' then p_winner else null end,
    case when p_division<>'1v1' then p_winner else null end,v_actor,p_evidence);
end $$;

revoke all on function public.rch_assign_run_team_to_crew(uuid,uuid),
  public.get_rch_circuit_standings(integer,text,integer),
  public.rch_award_commonwealth_title(integer,text,uuid,text) from public,anon,authenticated;
grant execute on function public.rch_assign_run_team_to_crew(uuid,uuid),
  public.rch_award_commonwealth_title(integer,text,uuid,text) to authenticated;
grant execute on function public.get_rch_circuit_standings(integer,text,integer) to anon,authenticated;

comment on function public.get_rch_circuit_standings(integer,text,integer) is
'Seasonal Cup qualification uses November 1–December 20 America/New_York run dates, opponent-verified results, and a January 1 verification deadline. Three games over at least two sessions required; crews also face at least two opponents.';
commit;