begin;

-- Persistent, opt-in scouting journal. This records courts intentionally explored
-- in the app; it is NOT a GPS check-in, attestation, participation record,
-- eligible for spendable REP, or proof that a player visited the site.
create table public.rch_world_court_scouts (
 profile_id uuid not null references public.profiles(id) on delete cascade,
 court_slug text not null references public.basketball_locations(slug) on delete cascade,
 scouted_at timestamptz not null default now(),
 primary key(profile_id,court_slug)
);
create index rch_world_court_scouts_recent on public.rch_world_court_scouts(profile_id,scouted_at desc);
alter table public.rch_world_court_scouts enable row level security;
revoke all on public.rch_world_court_scouts from public,anon,authenticated;
grant select on public.rch_world_court_scouts to authenticated;
create policy rch_world_court_scouts_read_self
 on public.rch_world_court_scouts for select to authenticated
 using(profile_id=(select auth.uid()));

create function public.rch_world_scout_court(p_court text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_name text;v_count int;v_inserted int;
begin
 if v_user is null then raise exception 'Sign in to add a court to your World Passport'; end if;
 if p_court is null or char_length(p_court)>160 then raise exception 'Invalid court'; end if;
 select name into v_name from public.basketball_locations
  where slug=p_court and is_active and verification_status in ('official','provider')
    and access_type='public' and venue_type='outdoor';
 if v_name is null then raise exception 'Only mapped, verified public outdoor courts may be scouted'; end if;
 insert into public.rch_world_court_scouts(profile_id,court_slug) values(v_user,p_court)
  on conflict do nothing;
 get diagnostics v_inserted=row_count;
 select count(*)::int into v_count from public.rch_world_court_scouts where profile_id=v_user;
 return jsonb_build_object('court',p_court,'name',v_name,'new',v_inserted=1,'scouted_total',v_count);
end $$;

-- Read-only, verified-results-backed permanent progression and weekly objectives.
-- No client input can change competitive rating, REP wallet, badges or court titles.
create function public.get_rch_world_journey()
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

 -- Distinct World XP is a deterministic, permanent *display* of verified play;
 -- never deposited into, or spendable from, the REP ledger.
 v_world_xp:=v_games*120 + v_wins*60 + v_courts*25;
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

revoke all on function public.rch_world_scout_court(text) from public,anon,authenticated;
revoke all on function public.get_rch_world_journey() from public,anon,authenticated;
grant execute on function public.rch_world_scout_court(text) to authenticated;
grant execute on function public.get_rch_world_journey() to authenticated;

comment on function public.rch_world_scout_court(text) is
'Intentional in-app court collection, not physical location verification or a REP-awarding action.';
comment on function public.get_rch_world_journey() is
'Private, permanent Worlds XP and mission metrics sourced from server-verified ranked matches, personal court scouting, and existing Runs registrations. Never grants spendable REP or skill rating.';

commit;
