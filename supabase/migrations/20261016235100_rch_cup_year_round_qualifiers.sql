begin;
-- The Cup reads year-to-date (Jan 2–Dec 20 Eastern) verified Runs as an
-- independent, exclusive year-end qualification snapshot. Nov 1–Dec 20
-- is the published final qualification push, NOT the only period earning credit.
-- Jan 1 Cup games cannot count toward qualification for their own season.
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
  if p_cycle<>0 and (p_cycle < 2026 or p_cycle > extract(year from now() at time zone 'America/New_York')::integer+1) then
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
          and (case when p_cycle=0 then true else
            r.starts_at>=make_timestamptz(p_cycle,1,2,0,0,0,'America/New_York')
            and r.starts_at<make_timestamptz(p_cycle,12,21,0,0,0,'America/New_York')
            and m.verified_at<make_timestamptz(p_cycle+1,1,1,0,0,0,'America/New_York')
          end)
      ), totals as (
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
        from totals a join public.profiles p on p.id=a.id
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
          and (case when p_cycle=0 then true else
            r.starts_at>=make_timestamptz(p_cycle,1,2,0,0,0,'America/New_York')
            and r.starts_at<make_timestamptz(p_cycle,12,21,0,0,0,'America/New_York')
            and m.verified_at<make_timestamptz(p_cycle+1,1,1,0,0,0,'America/New_York')
          end)
          and exists (select 1 from public.commonwealth_run_entries e where e.run_id=m.run_id and e.crew_id=h.crew_id)
          and exists (select 1 from public.commonwealth_run_entries e where e.run_id=m.run_id and e.crew_id=a.crew_id)
      ), sides as (
        select home_crew as id,away_crew as opponent,run_id,home_score>away_score as won from matches
        union all
        select away_crew as id,home_crew as opponent,run_id,away_score>home_score as won from matches
      ), totals as (
        select s.id,count(*)::bigint as played,
          count(*) filter(where s.won)::bigint as victorious,
          count(distinct s.run_id)::bigint as sessions,
          count(distinct s.opponent)::bigint as opponents
        from sides s group by s.id
      ), entrants as (
        select a.id,c.name,c.city as locality,c.logo_path as image,
          a.played,a.victorious,a.sessions,
          (a.played>=3 and a.sessions>=2 and a.opponents>=2) as qualified
        from totals a join public.commonwealth_crews c on c.id=a.id
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


comment on function public.get_rch_circuit_standings(integer,text,integer) is 'Cup-only: independent verified Run results from January 2 to December 20 of each cycle; finalists locked after review. No crew territory or Master title changes from this board.';
commit;