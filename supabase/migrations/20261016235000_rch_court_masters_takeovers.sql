begin;

-- RCH's three worlds are peers:
-- Runs = statewide individual ratings, local court mastery and basketball REP.
-- Crews = independent crew win rates, court territory and challenges.
-- Commonwealth Cup = exclusive annual snapshot of VERIFIED Runs, never the source of a court title.
-- The first two worlds function year-round, even when the Cup is not qualifying.

create table if not exists public.rch_court_territories (
  court_slug text primary key references public.basketball_locations(slug) on delete cascade,
  crew_id uuid not null references public.commonwealth_crews(id) on delete restrict,
  awarded_by_match uuid unique references public.run_ranked_matches(id) on delete restrict,
  since_at timestamptz not null default now(),
  defended_at timestamptz,
  successful_defenses integer not null default 0 check(successful_defenses>=0)
);
alter table public.rch_court_territories enable row level security;
revoke all on public.rch_court_territories from public,anon,authenticated;
grant select on public.rch_court_territories to anon,authenticated;
create policy rch_territory_public_read on public.rch_court_territories for select to anon,authenticated using(true);

create table if not exists public.rch_court_takeovers (
  id uuid primary key default gen_random_uuid(),
  court_slug text not null references public.basketball_locations(slug),
  run_id uuid not null references public.runs(id),
  challenger_crew_id uuid not null references public.commonwealth_crews(id),
  defender_crew_id uuid not null references public.commonwealth_crews(id),
  challenged_by uuid not null references public.profiles(id),
  status text not null default 'requested' check(status in ('requested','accepted','declined','resolved','cancelled')),
  accepted_at timestamptz,
  resolved_match_id uuid unique references public.run_ranked_matches(id),
  winning_crew_id uuid references public.commonwealth_crews(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check(challenger_crew_id<>defender_crew_id)
);
create unique index if not exists rch_one_open_takeover_per_court on public.rch_court_takeovers(court_slug)
  where status in ('requested','accepted');
create index if not exists rch_takeovers_run_pending on public.rch_court_takeovers(run_id,status);
alter table public.rch_court_takeovers enable row level security;
revoke all on public.rch_court_takeovers from public,anon,authenticated;
grant select on public.rch_court_takeovers to anon,authenticated;
create policy rch_takeovers_public_read on public.rch_court_takeovers for select to anon,authenticated using(true);

-- Independently verified results are the ONLY origin of Run game REP.
-- Taking and holding a court changes CREW territory, never another player's historical ELO.
create table if not exists public.rch_run_rep_events (
  match_id uuid not null references public.run_ranked_matches(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  court_slug text references public.basketball_locations(slug),
  game_format text not null check(game_format in ('1v1','2v2','3v3','4v4','5v5')),
  reason text not null check(reason in ('verified_win','verified_loss','takeover_win','takeover_defense')),
  rep integer not null check(rep between 0 and 150),
  created_at timestamptz not null default now(),
  primary key(match_id,profile_id)
);
create index if not exists rch_run_rep_by_profile on public.rch_run_rep_events(profile_id,created_at desc);
alter table public.rch_run_rep_events enable row level security;
revoke all on public.rch_run_rep_events from public,anon,authenticated;
grant select on public.rch_run_rep_events to authenticated;
create policy rch_run_rep_owner on public.rch_run_rep_events for select to authenticated
  using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));

create table if not exists public.rch_run_badge_awards (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_code text not null check(badge_code in ('first_win','run_veteran','court_defender','takeover_artist')),
  earned_from_match_id uuid not null references public.run_ranked_matches(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  primary key(profile_id,badge_code)
);
alter table public.rch_run_badge_awards enable row level security;
revoke all on public.rch_run_badge_awards from public,anon,authenticated;
grant select on public.rch_run_badge_awards to authenticated;
create policy rch_run_badge_owner on public.rch_run_badge_awards for select to authenticated
  using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));

-- Three court masters: 1v1, 2v2, 3v3. Each has a top-three challenger ladder;
-- #1 receives the Master title only after 3 verified games in 2+ Run sessions.
-- Box-score stats come from a separately independent reviewer, not player claims.
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
), box as (
  select s.profile_id,round(avg(s.points)::numeric,1) as points,
    round(avg(s.assists)::numeric,1) as assists,round(avg(s.rebounds)::numeric,1) as rebounds
  from public.run_competitive_box_scores s join public.runs r on r.id=s.run_id
  where r.location_slug=p_court and r.status<>'cancelled' and s.review_status='verified'
  group by s.profile_id
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
revoke all on function public.get_rch_court_masters(text) from public,anon,authenticated;
grant execute on function public.get_rch_court_masters(text) to anon,authenticated;

-- All qualifying crew-v-crew games at this specific court, not team membership alone.
-- Crew territories are NOT Commonwealth Cup standings.
create or replace function public.get_rch_court_crew_standings(p_court text)
returns table(crew_id uuid,crew_name text,logo_path text,games bigint,wins bigint,
  win_pct numeric,run_sessions bigint,eligible boolean,is_controller boolean,rank bigint)
language sql stable security definer set search_path='' as $$
with played as (
  select m.run_id,m.home_score,m.away_score,h.crew_id as home_id,a.crew_id as away_id
  from public.run_ranked_matches m
  join public.runs r on r.id=m.run_id and r.location_slug=p_court
  join public.rch_run_crew_teams h on h.run_team_id=m.home_team_id and h.run_id=m.run_id
  join public.rch_run_crew_teams a on a.run_team_id=m.away_team_id and a.run_id=m.run_id
  where m.status='verified' and m.game_format in ('2v2','3v3','4v4','5v5')
    and r.run_type='competitive' and r.status<>'cancelled' and h.crew_id<>a.crew_id
), sides as (
  select p.home_id as id,p.run_id,p.home_score>p.away_score as won from played p
  union all
  select p.away_id as id,p.run_id,p.away_score>p.home_score as won from played p
), stats as (
  select s.id,count(*)::bigint as played,
    count(*) filter(where s.won)::bigint as victories,
    count(distinct s.run_id)::bigint as sessions
  from sides s group by s.id
), ranked as (
  select s.*,row_number() over(order by
    (s.played>=3 and s.sessions>=2) desc,
    s.victories::numeric/nullif(s.played,0) desc,s.victories desc,
    s.played desc,s.id) as placement
  from stats s
), controller as (
  select coalesce((select t.crew_id from public.rch_court_territories t where t.court_slug=p_court),
    (select z.id from ranked z where z.placement=1 and z.played>=3 and z.sessions>=2)) as id
)
select k.id,c.name,c.logo_path,k.played,k.victories,
  round(100*k.victories::numeric/nullif(k.played,0),1),k.sessions,
  (k.played>=3 and k.sessions>=2),(k.id=(select id from controller)),k.placement
from ranked k join public.commonwealth_crews c on c.id=k.id
order by k.placement limit 30
$$;
revoke all on function public.get_rch_court_crew_standings(text) from public,anon,authenticated;
grant execute on function public.get_rch_court_crew_standings(text) to anon,authenticated;

-- Future Run chosen at the disputed court; challenger and defender must both opt in,
-- both register/assign full crew rosters, and both later verify a real completed game.
create or replace function public.rch_request_court_takeover(p_court text,p_run uuid,p_crew uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();v_owner uuid;v_id uuid;v_run public.runs%rowtype;
begin
 if v_actor is null then raise exception 'Sign in as crew captain'; end if;
 if not exists(select 1 from public.commonwealth_crews c where c.id=p_crew and c.captain_id=v_actor)
 then raise exception 'Only the challenger crew captain may declare a takeover'; end if;
 if not exists(select 1 from public.basketball_locations l where l.slug=p_court and l.is_active)
 then raise exception 'Select an active verified court'; end if;
 select * into v_run from public.runs where id=p_run;
 if v_run.id is null or v_run.location_slug is distinct from p_court
    or v_run.run_type<>'competitive' or v_run.status='cancelled'
    or v_run.game_format not in ('2v2','3v3','4v4','5v5')
    or v_run.starts_at<now()-interval '2 hours'
    or v_run.starts_at>now()+interval '30 days'
 then raise exception 'Select an upcoming 2v2–5v5 competitive Run at that exact court'; end if;
 select t.crew_id into v_owner from public.rch_court_territories t where t.court_slug=p_court;
 if v_owner is null then
   select b.crew_id into v_owner from public.get_rch_court_crew_standings(p_court) b
   where b.eligible order by b.rank limit 1;
 end if;
 if v_owner is null then raise exception 'No established court controller yet; compete in regular Runs to establish one'; end if;
 if v_owner=p_crew then raise exception 'The reigning crew cannot challenge itself'; end if;
 if not exists(select 1 from public.commonwealth_run_entries e where e.crew_id=p_crew and e.run_id=p_run)
 then raise exception 'Register your crew for the selected Run before challenging'; end if;
 insert into public.rch_court_takeovers(court_slug,run_id,challenger_crew_id,defender_crew_id,challenged_by)
 values(p_court,p_run,p_crew,v_owner,v_actor) returning id into v_id;
 return v_id;
end $$;

create or replace function public.rch_answer_court_takeover(p_takeover uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_c public.rch_court_takeovers%rowtype;
begin
 if v_actor is null then raise exception 'Sign in as defending captain'; end if;
 select * into v_c from public.rch_court_takeovers where id=p_takeover for update;
 if v_c.id is null or v_c.status<>'requested' then raise exception 'No pending takeover request'; end if;
 if not exists(select 1 from public.commonwealth_crews c where c.id=v_c.defender_crew_id and c.captain_id=v_actor)
 then raise exception 'Only the defending crew captain may answer'; end if;
 if p_accept and not exists(select 1 from public.commonwealth_run_entries e
     where e.crew_id=v_c.defender_crew_id and e.run_id=v_c.run_id)
 then raise exception 'Register the defending crew for the selected Run before accepting'; end if;
 update public.rch_court_takeovers set status=case when p_accept then 'accepted' else 'declined' end,
  accepted_at=case when p_accept then now() else null end where id=p_takeover;
end $$;
revoke all on function public.rch_request_court_takeover(text,uuid,uuid),
  public.rch_answer_court_takeover(uuid,boolean) from public,anon,authenticated;
grant execute on function public.rch_request_court_takeover(text,uuid,uuid),
  public.rch_answer_court_takeover(uuid,boolean) to authenticated;

-- Trigger only on transitioning a result to independently verified.
-- Proof is an accepted challenge whose selected Run and BOTH registered Crew team
-- IDs exactly match the winner and loser of this specific verified match.
create or replace function public.rch_register_verified_court_match()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_court text;v_ch public.rch_court_takeovers%rowtype;
 v_home uuid;v_away uuid;v_winner uuid;v_defense boolean:=false;
 v_player uuid;v_won boolean;v_reason text;v_rep integer;v_wins bigint;
begin
 if new.status<>'verified' or old.status='verified' then return new; end if;
 select r.location_slug into v_court from public.runs r where r.id=new.run_id;
 select h.crew_id,a.crew_id into v_home,v_away
   from public.rch_run_crew_teams h join public.rch_run_crew_teams a
     on a.run_id=h.run_id and a.run_team_id=new.away_team_id
   where h.run_team_id=new.home_team_id and h.run_id=new.run_id;
 v_winner:=case when new.home_score>new.away_score then v_home else v_away end;
 if v_home is not null and v_away is not null and v_home<>v_away then
  select * into v_ch from public.rch_court_takeovers c
  where c.status='accepted' and c.run_id=new.run_id and c.court_slug=v_court
    and ((c.challenger_crew_id=v_home and c.defender_crew_id=v_away)
      or (c.challenger_crew_id=v_away and c.defender_crew_id=v_home))
    and new.submitted_at>=c.accepted_at
  order by c.created_at asc limit 1 for update;
  if v_ch.id is not null then
   v_defense:=v_winner=v_ch.defender_crew_id;
   insert into public.rch_court_territories(court_slug,crew_id,awarded_by_match,since_at,defended_at,successful_defenses)
     values(v_court,v_winner,new.id,coalesce(new.verified_at,now()),
       case when v_defense then now() else null end,case when v_defense then 1 else 0 end)
   on conflict(court_slug) do update set
     crew_id=excluded.crew_id,
     awarded_by_match=excluded.awarded_by_match,
     since_at=case when public.rch_court_territories.crew_id=excluded.crew_id then public.rch_court_territories.since_at else excluded.since_at end,
     defended_at=case when v_defense then now() else null end,
     successful_defenses=case when v_defense then public.rch_court_territories.successful_defenses+1 else 0 end;
   update public.rch_court_takeovers set status='resolved',winning_crew_id=v_winner,
     resolved_match_id=new.id,resolved_at=now() where id=v_ch.id;
  end if;
 end if;
 foreach v_player in array new.home_roster||new.away_roster loop
   v_won:=(v_player=any(new.home_roster) and new.home_score>new.away_score)
     or (v_player=any(new.away_roster) and new.away_score>new.home_score);
   v_reason:=case when v_ch.id is not null and v_won and v_defense then 'takeover_defense'
     when v_ch.id is not null and v_won then 'takeover_win'
     when v_won then 'verified_win' else 'verified_loss' end;
   v_rep:=case when v_reason='takeover_defense' then 90 when v_won then 30 else 10 end;
   insert into public.rch_run_rep_events(match_id,profile_id,court_slug,game_format,reason,rep)
     values(new.id,v_player,v_court,new.game_format,v_reason,v_rep) on conflict do nothing;
   if v_won then
     insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id)
     values(v_player,'first_win',new.id) on conflict do nothing;
     select count(*) into v_wins from public.rch_run_rep_events ev
       where ev.profile_id=v_player and ev.reason in ('verified_win','takeover_win','takeover_defense');
     if v_wins>=5 then
      insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id)
      values(v_player,'run_veteran',new.id) on conflict do nothing;
     end if;
     if v_ch.id is not null then
       insert into public.rch_run_badge_awards(profile_id,badge_code,earned_from_match_id)
       values(v_player,case when v_defense then 'court_defender' else 'takeover_artist' end,new.id)
       on conflict do nothing;
     end if;
   end if;
 end loop;
 return new;
end $$;
revoke all on function public.rch_register_verified_court_match() from public,anon,authenticated;
drop trigger if exists rch_after_verified_court_match on public.run_ranked_matches;
create trigger rch_after_verified_court_match
after update of status on public.run_ranked_matches
for each row when(new.status='verified' and old.status is distinct from new.status)
execute function public.rch_register_verified_court_match();

create or replace function public.get_rch_run_rep_board(p_limit integer default 25)
returns table(profile_id uuid,player_name text,avatar_url text,run_rep bigint,
 games bigint,wins bigint,defenses bigint)
language sql stable security definer set search_path='' as $$
select e.profile_id,coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player'),p.avatar_url,
  sum(e.rep)::bigint,count(*)::bigint,
  count(*) filter(where e.reason in ('verified_win','takeover_win','takeover_defense'))::bigint,
  count(*) filter(where e.reason='takeover_defense')::bigint
from public.rch_run_rep_events e join public.profiles p on p.id=e.profile_id
where p.is_active and not coalesce(p.is_system_account,false)
  and coalesce(p.profile_visibility,'public') not in ('private','only_me')
group by e.profile_id,p.display_name,p.username,p.avatar_url
order by sum(e.rep) desc,count(*) desc,e.profile_id limit least(greatest(coalesce(p_limit,25),1),100)
$$;
revoke all on function public.get_rch_run_rep_board(integer) from public,anon,authenticated;
grant execute on function public.get_rch_run_rep_board(integer) to anon,authenticated;

commit;