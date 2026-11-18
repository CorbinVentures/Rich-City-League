begin;

-- XP from a self-reported Run still follows the regular XP-to-REP wallet credit.
-- Badge qualification remains explicitly excluded in award_rep_badges().
create or replace function public.rch_rep_verified_earnings()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name = 'xp_transactions' then
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

-- Credit any solo XP transactions that were saved before this correction.
-- The wallet ledger's xp:<transaction id> key makes this safe to rerun.
do $backfill$
declare
  v_xp record;
begin
  for v_xp in
    select id, profile_id, amount, reason
    from public.xp_transactions
    where source_type = 'solo_run_stats'
  loop
    perform public.rch_rep_credit_internal(
      v_xp.profile_id, v_xp.amount,
      'xp:' || v_xp.id::text,
      coalesce(v_xp.reason, 'Solo Run stats XP')
    );
  end loop;
end
$backfill$;

-- Keep the legacy Runs leaderboard consistent with the personal stat tracker.
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
  with all_lines as (
    select s.profile_id,s.points,s.assists,s.rebounds,s.won
    from public.run_competitive_box_scores s
    where s.review_status='verified'
    union all
    select s.profile_id,s.points,s.assists,s.rebounds,false as won
    from public.rch_solo_run_stat_entries s
    join public.runs r on r.id=s.run_id
    where r.status<>'cancelled' and r.starts_at<=now()
      and not exists(
        select 1 from public.run_competitive_box_scores v
        where v.run_id=s.run_id and v.profile_id=s.profile_id
          and v.review_status='verified'
      )
  ), raw_stats as (
    select s.profile_id,
      count(*)::bigint as games,
      round(avg(s.points)::numeric,1) as ppg,
      round(avg(s.assists)::numeric,1) as apg,
      round(avg(s.rebounds)::numeric,1) as rpg,
      count(*) filter(where s.won)::bigint as wins
    from all_lines s
    group by s.profile_id
  ), public_players as (
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

-- Self-reported stat lines contribute to per-court PPG/APG/RPG and ranking
-- tie-breaks, but they do not invent wins or a verified match result.
create or replace function public.get_rch_court_masters(p_court text)
returns table(division text,rank bigint,profile_id uuid,player_name text,avatar_url text,
  games bigint,wins bigint,win_pct numeric,ppg numeric,apg numeric,rpg numeric,is_master boolean)
language sql stable security definer set search_path='' as $$
with matches as (
  select mp.profile_id,m.game_format,m.run_id,
    case when mp.side='home' then m.home_score>m.away_score else m.away_score>m.home_score end as won
  from public.run_ranked_match_players mp
  join public.run_ranked_matches m on m.id=mp.match_id and m.status='verified'
  join public.runs r on r.id=m.run_id
  where r.location_slug=p_court and r.run_type='competitive' and r.status<>'cancelled'
    and m.game_format in ('1v1','2v2','3v3')
), summed as (
  select m.profile_id,m.game_format,count(*)::bigint as played,
    count(*) filter(where m.won)::bigint as victorious,count(distinct m.run_id)::bigint as sessions
  from matches m group by m.profile_id,m.game_format
), box_lines as (
  select s.profile_id,s.points,s.assists,s.rebounds
  from public.run_competitive_box_scores s
  join public.runs r on r.id=s.run_id
  where r.location_slug=p_court and r.status<>'cancelled' and s.review_status='verified'
  union all
  select s.profile_id,s.points,s.assists,s.rebounds
  from public.rch_solo_run_stat_entries s
  join public.runs r on r.id=s.run_id
  where r.location_slug=p_court and r.status<>'cancelled' and r.starts_at<=now()
    and not exists(
      select 1 from public.run_competitive_box_scores v
      where v.run_id=s.run_id and v.profile_id=s.profile_id
        and v.review_status='verified'
    )
), box as (
  select s.profile_id,round(avg(s.points)::numeric,1) as points,
    round(avg(s.assists)::numeric,1) as assists,round(avg(s.rebounds)::numeric,1) as rebounds
  from box_lines s group by s.profile_id
), ranked as (
  select e.game_format,e.profile_id,p.display_name,p.username,p.avatar_url,
    e.played,e.victorious,e.sessions,
    round((100*e.victorious::numeric/nullif(e.played,0)),1) as pct,
    coalesce(b.points,0) as ppg,coalesce(b.assists,0) as apg,coalesce(b.rebounds,0) as rpg,
    row_number() over(partition by e.game_format order by
      (e.played>=3 and e.sessions>=2) desc,
      e.victorious::numeric/nullif(e.played,0) desc,e.victorious desc,
      coalesce(b.points,0) desc,e.played desc,e.profile_id) as placement
  from summed e join public.profiles p on p.id=e.profile_id
    and p.is_active and not coalesce(p.is_system_account,false)
    and coalesce(p.profile_visibility,'public') not in ('private','only_me')
  left join box b on b.profile_id=e.profile_id
)
select k.game_format,k.placement,k.profile_id,
  coalesce(nullif(k.display_name,''),nullif(k.username::text,''),'RCH Player'),
  k.avatar_url,k.played,k.victorious,k.pct,k.ppg,k.apg,k.rpg,
  (k.placement=1 and k.played>=3 and k.sessions>=2)
from ranked k where k.placement<=3 order by k.game_format,k.placement
$$;

-- The public Runs stat board combines reviewed match lines with self-reported
-- solo lines, and labels the source for each player.
create or replace function public.get_rch_run_box_score_leaderboard(
  p_scope text default 'state',p_city text default 'Richmond',p_limit integer default 30
) returns table(
  profile_id uuid,player_name text,avatar_url text,city text,games bigint,
  ppg numeric,apg numeric,rpg numeric,wins bigint,rep integer,player_level integer,
  record_source text
) language plpgsql stable security definer set search_path='' as $$
begin
  if p_scope not in ('state','city') then raise exception 'Choose city or statewide rankings'; end if;
  return query
    with verified_lines as (
      select s.profile_id,s.match_id,s.points,s.assists,s.rebounds,
        (m.home_score>m.away_score and s.profile_id=any(m.home_roster))
          or (m.away_score>m.home_score and s.profile_id=any(m.away_roster)) as won
      from public.rch_match_skill_box_scores s
      join public.run_ranked_matches m on m.id=s.match_id
      where s.review_status='verified' and m.status='verified'
    ), solo_lines as (
      select s.profile_id,s.run_id,s.points,s.assists,s.rebounds,false as won
      from public.rch_solo_run_stat_entries s
      join public.runs r on r.id=s.run_id
      where r.status<>'cancelled' and r.starts_at<=now()
        and not exists(
          select 1
          from public.rch_match_skill_box_scores v
          join public.run_ranked_matches m on m.id=v.match_id
          where m.run_id=s.run_id and v.profile_id=s.profile_id
            and v.review_status='verified' and m.status='verified'
        )
    ), all_lines as (
      select v.profile_id,v.points,v.assists,v.rebounds,v.won,'verified'::text as source
      from verified_lines v
      union all
      select s.profile_id,s.points,s.assists,s.rebounds,s.won,'self_reported'::text as source
      from solo_lines s
    ), totals as (
      select x.profile_id,count(*)::bigint as games,
        round(avg(x.points)::numeric,1) as ppg,
        round(avg(x.assists)::numeric,1) as apg,
        round(avg(x.rebounds)::numeric,1) as rpg,
        count(*) filter(where x.won)::bigint as wins,
        count(*) filter(where x.source='verified')::bigint as verified_games,
        count(*) filter(where x.source='self_reported')::bigint as self_reported_games
      from all_lines x group by x.profile_id
    ), visible_players as (
      select t.*,
        case
          when t.verified_games>0 and t.self_reported_games>0 then 'mixed'
          when t.self_reported_games>0 then 'self_reported'
          else 'verified'
        end as record_source,
        coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player') as player_name,
        p.avatar_url,
        case when exists(select 1 from public.basketball_locations l
          where lower(l.locality)=lower(trim(split_part(coalesce(p.location,''),',',1))))
          then left(trim(split_part(p.location,',',1)),45) else 'Virginia' end as city,
        coalesce(levels.xp,0) as rep,coalesce(levels.level,1) as player_level
      from totals t join public.profiles p on p.id=t.profile_id
      left join public.user_levels levels on levels.profile_id=t.profile_id
      where p.is_active=true and not coalesce(p.is_system_account,false)
        and coalesce(p.profile_visibility,'public')='public'
    )
    select v.profile_id,v.player_name::text,v.avatar_url::text,v.city::text,v.games,
      v.ppg,v.apg,v.rpg,v.wins,v.rep,v.player_level,v.record_source
    from visible_players v
    where p_scope<>'city' or lower(v.city)=lower(left(trim(coalesce(p_city,'')),45))
    order by v.wins desc,v.ppg desc,v.games desc,v.profile_id
    limit least(greatest(coalesce(p_limit,30),1),50);
end $$;
revoke all on function public.get_rch_run_box_score_leaderboard(text,text,integer) from public,anon,authenticated;
grant execute on function public.get_rch_run_box_score_leaderboard(text,text,integer) to anon,authenticated;

commit;