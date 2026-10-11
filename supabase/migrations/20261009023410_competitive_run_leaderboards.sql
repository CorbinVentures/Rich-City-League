begin;

-- Competitive Open Run box scores are always submitted by the participant,
-- then reviewed by an independent host / attendee before any leaderboard ranking.
create table if not exists public.run_competitive_box_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points between 0 and 100),
  rebounds integer not null check (rebounds between 0 and 40),
  assists integer not null check (assists between 0 and 35),
  won boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','verified','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint run_competitive_box_scores_unique unique (run_id, profile_id)
);
create index if not exists run_box_scores_verified_idx
  on public.run_competitive_box_scores(profile_id,run_id) where review_status='verified';
create index if not exists run_box_scores_pending_idx
  on public.run_competitive_box_scores(run_id) where review_status='pending';

alter table public.run_competitive_box_scores enable row level security;
revoke all on public.run_competitive_box_scores from public,anon,authenticated;
grant select on public.run_competitive_box_scores to authenticated;
drop policy if exists run_box_scores_visible_to_reviewers on public.run_competitive_box_scores;
create policy run_box_scores_visible_to_reviewers
  on public.run_competitive_box_scores for select to authenticated
  using (
    profile_id=(select auth.uid())
    or exists (
      select 1 from public.runs r
      where r.id=run_id and r.host_id=(select auth.uid())
    )
    or (
      exists (select 1 from public.runs r where r.id=run_id and r.host_id=profile_id)
      and exists (select 1 from public.run_checkins c
        where c.run_id=run_competitive_box_scores.run_id and c.profile_id=(select auth.uid()))
    )
  );

create or replace function public.submit_competitive_run_stats(
  p_run uuid, p_points integer, p_rebounds integer, p_assists integer, p_won boolean
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_host uuid;
  v_start timestamptz;
  v_type text;
  v_status text;
  v_id uuid;
begin
  if v_actor is null then raise exception 'Sign in before submitting stats'; end if;
  if p_points is null or p_points not between 0 and 100
    or p_rebounds is null or p_rebounds not between 0 and 40
    or p_assists is null or p_assists not between 0 and 35
    or p_won is null then
    raise exception 'Stats are outside the allowed single-game limits';
  end if;

  select host_id,starts_at,run_type,status into v_host,v_start,v_type,v_status
    from public.runs where id=p_run;
  if not found then raise exception 'Run not found'; end if;
  if v_type <> 'competitive' or v_status='cancelled' then
    raise exception 'Only active competitive runs support rankings';
  end if;
  if v_start > now() or v_start < now()-interval '30 days' then
    raise exception 'Stats can be submitted after the run, for up to 30 days';
  end if;
  if not exists (select 1 from public.run_players where run_id=p_run and profile_id=v_actor) then
    raise exception 'Join the run before submitting a box score';
  end if;

  insert into public.run_competitive_box_scores (run_id,profile_id,points,rebounds,assists,won)
  values (p_run,v_actor,p_points,p_rebounds,p_assists,p_won)
  on conflict (run_id,profile_id) do update
  set points=excluded.points,rebounds=excluded.rebounds,assists=excluded.assists,won=excluded.won,
      review_status='pending',reviewed_by=null,reviewed_at=null,updated_at=now()
  where public.run_competitive_box_scores.review_status in ('pending','rejected')
  returning id into v_id;
  if v_id is null then raise exception 'Verified stats cannot be edited'; end if;
  return v_id;
end;
$$;

create or replace function public.review_competitive_run_stats(
  p_submission uuid, p_approve boolean
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_run uuid;
  v_player uuid;
  v_host uuid;
  v_status text;
begin
  if v_actor is null then raise exception 'Sign in to review stats'; end if;
  select s.run_id,s.profile_id,s.review_status,r.host_id
    into v_run,v_player,v_status,v_host
    from public.run_competitive_box_scores s
    join public.runs r on r.id=s.run_id
    where s.id=p_submission
    for update of s;
  if not found then raise exception 'Stats submission not found'; end if;
  if v_status <> 'pending' then raise exception 'This box score has already been reviewed'; end if;
  if v_actor=v_player then raise exception 'You cannot verify your own stats'; end if;
  if not (
    v_actor=v_host or
    (v_player=v_host and exists (
      select 1 from public.run_checkins c
      where c.run_id=v_run and c.profile_id=v_actor
    ))
  ) then raise exception 'Only the run host or an independent checked-in participant may review this box score';
  end if;
  update public.run_competitive_box_scores
    set review_status=case when p_approve then 'verified' else 'rejected' end,
        reviewed_by=v_actor,reviewed_at=now(),updated_at=now()
    where id=p_submission;
  return true;
end;
$$;

create or replace function public.get_competitive_run_leaderboard(
  p_scope text default 'state',
  p_city text default 'Richmond',
  p_limit integer default 20
) returns table (
  profile_id uuid, player_name text, avatar_url text, city text,
  games bigint, ppg numeric, apg numeric, rpg numeric,
  wins bigint, rep integer, player_level integer
)
language sql stable security definer set search_path=''
as $$
  with raw_stats as (
    select s.profile_id,
      count(*)::bigint as games,
      round(avg(s.points)::numeric,1) as ppg,
      round(avg(s.assists)::numeric,1) as apg,
      round(avg(s.rebounds)::numeric,1) as rpg,
      count(*) filter (where s.won)::bigint as wins
    from public.run_competitive_box_scores s
    where s.review_status='verified'
    group by s.profile_id
  ),
  public_players as (
    select rs.*,
      coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player') as player_name,
      p.avatar_url,
      case
        when exists (
          select 1 from public.basketball_locations l
          where lower(l.locality)=lower(trim(split_part(coalesce(p.location,''),',',1)))
          limit 1
        ) then left(trim(split_part(p.location,',',1)),45)
        else 'Virginia'
      end as city,
      coalesce(u.xp,0) as rep,
      coalesce(u.level,1) as player_level
    from raw_stats rs
    join public.profiles p on p.id=rs.profile_id
    left join public.user_levels u on u.profile_id=p.id
    where p.is_active=true and coalesce(p.is_system_account,false)=false
      and coalesce(p.profile_visibility,'public') not in ('private','only_me')
  )
  select pp.profile_id,pp.player_name,pp.avatar_url,pp.city,
    pp.games,pp.ppg,pp.apg,pp.rpg,pp.wins,pp.rep,pp.player_level
  from public_players pp
  where p_scope <> 'city'
     or lower(pp.city)=lower(left(trim(coalesce(p_city,'')),45))
  order by pp.wins desc,pp.ppg desc,pp.games desc,pp.profile_id
  limit least(greatest(coalesce(p_limit,20),1),50);
$$;

revoke all on function public.submit_competitive_run_stats(uuid,integer,integer,integer,boolean) from public,anon,authenticated;
revoke all on function public.review_competitive_run_stats(uuid,boolean) from public,anon,authenticated;
revoke all on function public.get_competitive_run_leaderboard(text,text,integer) from public,anon,authenticated;
grant execute on function public.submit_competitive_run_stats(uuid,integer,integer,integer,boolean) to authenticated;
grant execute on function public.review_competitive_run_stats(uuid,boolean) to authenticated;
grant execute on function public.get_competitive_run_leaderboard(text,text,integer) to anon,authenticated;

comment on table public.run_competitive_box_scores is
  'One box score per competitive Open Run participant, independently reviewed before public leaderboard inclusion. No REP is awarded merely for submitted stats.';
commit;