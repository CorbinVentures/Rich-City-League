begin;

-- Partner and weekend XP are exclusive reward tiers, not additive bonuses.
-- A SYB match gets 3x XP, even on a featured weekend (never 6x).
create or replace function public.rch_world_xp_multiplier(p_run uuid)
returns integer language sql stable security definer set search_path='' as $$
  select greatest(
    public.rch_partner_reward_multiplier(p_run),
    case when public.rch_is_weekend_bonus_eligible(p_run) then 2 else 1 end
  )
$$;
revoke all on function public.rch_world_xp_multiplier(uuid) from public,anon,authenticated;

-- World XP remains a display-only career total. The event multiplier applies
-- to verified game, win, and first-verified-court XP, not ratings or badges.
create or replace function public.get_rch_world_journey()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_games int;v_wins int;v_courts int;v_scouts int;
 v_week_matches int;v_week_wins int;v_future int;v_today int;v_world_xp int;v_week_start date;
 v_stamps jsonb;v_recent jsonb;v_arena_defenses int;
begin
 if v_user is null then return jsonb_build_object('signed_in',false); end if;
 v_week_start=date_trunc('week',now() at time zone 'America/New_York')::date;
 select count(*)::int,
    count(*) filter(where
      (mp.side='home' and m.home_score>m.away_score)
      or (mp.side='away' and m.away_score>m.home_score))::int,
    count(distinct r.location_slug) filter(where r.location_slug is not null)::int,
    count(*) filter(where m.verified_at >= (v_week_start::timestamp at time zone 'America/New_York')
      and m.verified_at < ((v_week_start+7)::timestamp at time zone 'America/New_York'))::int,
    count(*) filter(where m.verified_at >= (v_week_start::timestamp at time zone 'America/New_York')
      and m.verified_at < ((v_week_start+7)::timestamp at time zone 'America/New_York')
      and ((mp.side='home' and m.home_score>m.away_score)
         or (mp.side='away' and m.away_score>m.home_score)))::int
 into v_games,v_wins,v_courts,v_week_matches,v_week_wins
 from public.run_ranked_matches m
 join public.run_ranked_match_players mp on mp.match_id=m.id and mp.profile_id=v_user
 join public.runs r on r.id=m.run_id
 where m.status='verified' and m.verified_at is not null;

 select coalesce(sum(
    120*xp_multiplier
    + case when won then 60*xp_multiplier else 0 end
    + case when location_slug is not null and court_visit=1 then 25*xp_multiplier else 0 end
   ),0)::int
 into v_world_xp
 from (
   select m.id,r.location_slug,m.verified_at,
     ((mp.side='home' and m.home_score>m.away_score)
       or (mp.side='away' and m.away_score>m.home_score)) as won,
     public.rch_world_xp_multiplier(m.run_id) as xp_multiplier,
     row_number() over(partition by r.location_slug order by m.verified_at,m.id) as court_visit
   from public.run_ranked_matches m
   join public.run_ranked_match_players mp on mp.match_id=m.id and mp.profile_id=v_user
   join public.runs r on r.id=m.run_id
   where m.status='verified' and m.verified_at is not null
 ) matches;

 select count(*)::int,
   count(*) filter(where (scouted_at at time zone 'America/New_York')::date
     =(now() at time zone 'America/New_York')::date)::int
 into v_scouts,v_today
 from public.rch_world_court_scouts s where s.profile_id=v_user;

 select count(*)::int into v_future
 from public.run_players rp join public.runs r on r.id=rp.run_id
 where rp.profile_id=v_user and r.status in ('open','full')
   and r.starts_at between now() and now()+interval '7 days';

 select count(*)::int into v_arena_defenses
 from public.rch_court_master_history h
 where h.winner_id=v_user and h.event_type='title_defense';

 select coalesce(jsonb_agg(jsonb_build_object(
   'court_slug',s.court_slug,'name',l.name,'city',l.locality,'scouted_at',s.scouted_at
 ) order by s.scouted_at desc),'[]'::jsonb) into v_stamps
 from (select court_slug,scouted_at from public.rch_world_court_scouts
   where profile_id=v_user order by scouted_at desc limit 100) s
 join public.basketball_locations l on l.slug=s.court_slug;

 select coalesce(jsonb_agg(jsonb_build_object(
   'court_slug',r.location_slug,'verified_at',m.verified_at,
   'game_format',m.game_format,
   'won',((m.side='home' and m.home_score>m.away_score)
     or (m.side='away' and m.away_score>m.home_score))
 ) order by m.verified_at desc),'[]'::jsonb) into v_recent
 from (select m.verified_at,m.game_format,m.home_score,m.away_score,
   mp.side,m.run_id from public.run_ranked_matches m
   join public.run_ranked_match_players mp on mp.match_id=m.id and mp.profile_id=v_user
   where m.status='verified' and m.verified_at is not null
   order by m.verified_at desc limit 10) m
 join public.runs r on r.id=m.run_id;

 return jsonb_build_object(
   'signed_in',true,'world_xp',v_world_xp,
   'world_level',1+floor(sqrt(v_world_xp::numeric/180))::int,
   'verified_games',v_games,'verified_wins',v_wins,
   'verified_courts',v_courts,'scouted_courts',v_scouts,
   'week_start',v_week_start,'weekly_verified_games',v_week_matches,
   'weekly_verified_wins',v_week_wins,'joined_upcoming_runs',v_future,
   'scouted_today',v_today,'master_title_defenses',v_arena_defenses,
   'stamps',v_stamps,'recent_verified',v_recent,
   'milestones',jsonb_build_object(
     'first_battle',v_games>=1,'first_win',v_wins>=1,
     'five_verified_games',v_games>=5,'three_arenas',v_courts>=3,
     'ten_verified_wins',v_wins>=10,'crown_defender',v_arena_defenses>=1)
 );
end $$;
revoke all on function public.get_rch_world_journey() from public,anon,authenticated;
grant execute on function public.get_rch_world_journey() to authenticated;
comment on function public.get_rch_world_journey() is
 'Private Runs career totals. World XP is deterministic, display-only, and derived from verified matches; partner and weekend event multipliers apply to eligible match, win and first-court XP, with the larger multiplier used and no stacking. REP and competitive rating remain separate.';

-- Match receipts use the identical weighted formula as the career total so a
-- SYB postgame card shows the XP that actually moved the player's level.
create or replace function public.get_rch_world_expansion()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();w timestamptz;w_end timestamptz;receipts jsonb;arenas jsonb;mates int;courts int;crew_games int;loadout jsonb;j jsonb;
begin
 if u is null then raise exception 'Sign in to view your journey'; end if;
 w:=date_trunc('week',now() at time zone 'America/New_York') at time zone 'America/New_York';
 w_end:=(date_trunc('week',now() at time zone 'America/New_York')+interval '7 days') at time zone 'America/New_York';
 j:=public.get_rch_world_journey();
 with history as (
 select m.*,p.side,r.location_slug,l.name court_name,
   row_number() over(partition by r.location_slug order by m.verified_at,m.id) court_visit,
   public.rch_world_xp_multiplier(m.run_id) as xp_multiplier,
   ((p.side='home' and m.home_score>m.away_score) or (p.side='away' and m.away_score>m.home_score)) won
 from public.run_ranked_matches m
 join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.runs r on r.id=m.run_id
 left join public.basketball_locations l on l.slug=r.location_slug
 where m.status='verified' and m.verified_at is not null
 ), recent as (select * from history order by verified_at desc,id desc limit 10)
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',m.id,'run_id',m.run_id,'court_slug',m.location_slug,'court_name',m.court_name,
 'verified_at',m.verified_at,'game_format',m.game_format,'won',m.won,
 'xp',(120+case when m.won then 60 else 0 end+case when m.location_slug is not null and m.court_visit=1 then 25 else 0 end)*m.xp_multiplier,
 'first_court',m.location_slug is not null and m.court_visit=1,
 'rep',coalesce((select sum(t.amount) from public.rch_rep_transactions t where t.profile_id=u and t.kind='earn'
   and t.source_key like 'run:'||m.id::text||':'||u::text||':%'),0),
 'badges',coalesce((select jsonb_agg(b.badge_code) from public.rch_run_badge_awards b where b.profile_id=u and b.earned_from_match_id=m.id),'[]'::jsonb),
 'territory',(select c.name from public.rch_court_takeovers t join public.commonwealth_crews c on c.id=t.winning_crew_id where t.resolved_match_id=m.id and t.status='resolved'),
 'crown',(select h.event_type from public.rch_court_master_history h where h.match_id=m.id and h.winner_id=u)
 ) order by m.verified_at desc,m.id desc),'[]'::jsonb) into receipts from recent m;

 select count(distinct r.location_slug)::int into courts
 from public.run_ranked_matches m join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.runs r on r.id=m.run_id where m.status='verified' and m.verified_at>=w and m.verified_at<w_end;
 select count(distinct teammate.profile_id)::int into mates
 from public.run_ranked_match_players p join public.run_ranked_matches m on m.id=p.match_id
 join public.run_ranked_match_players teammate on teammate.match_id=p.match_id and teammate.side=p.side and teammate.profile_id<>u
 where p.profile_id=u and m.status='verified' and m.verified_at>=w and m.verified_at<w_end;
 select count(distinct m.id)::int into crew_games
 from public.run_ranked_matches m join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.rch_court_takeovers t on t.resolved_match_id=m.id and t.status='resolved'
 where m.status='verified' and m.verified_at>=w and m.verified_at<w_end;
 select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) into arenas from (
 select r.location_slug court_slug,max(l.name) court_name,count(*) games,
 count(*) filter(where (p.side='home' and m.home_score>m.away_score) or (p.side='away' and m.away_score>m.home_score)) wins
 from public.run_ranked_matches m join public.run_ranked_match_players p on p.match_id=m.id and p.profile_id=u
 join public.runs r on r.id=m.run_id join public.basketball_locations l on l.slug=r.location_slug
 where m.status='verified' and m.verified_at is not null group by r.location_slug order by max(m.verified_at) desc limit 50
 ) a;
 select jsonb_build_object('banner',case when coalesce((j->'milestones'->>l.banner)::boolean,false) then l.banner end,'reward_goal',l.reward_goal)
 into loadout from public.rch_world_loadouts l where profile_id=u;
 return jsonb_build_object('receipts',receipts,'arenas',arenas,'weekly_courts',courts,'weekly_teammates',mates,'weekly_crew_games',crew_games,
 'loadout',coalesce(loadout,'{}'::jsonb),'wallet',coalesce((select balance from public.rch_rep_wallets where profile_id=u),0),
 'rewards',coalesce((select jsonb_agg(jsonb_build_object('code',code,'title',title,'price',price,'delivery',delivery) order by price,code) from public.rch_rep_rewards where available),'[]'::jsonb));
end $$;
revoke all on function public.get_rch_world_expansion() from public,anon,authenticated;
grant execute on function public.get_rch_world_expansion() to authenticated;
comment on function public.get_rch_world_expansion() is
 'Private Runs journey expansion with postgame World XP receipts using the same partner/weekend multiplier as the career total.';

commit;
