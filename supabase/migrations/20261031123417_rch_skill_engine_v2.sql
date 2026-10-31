begin;

-- Skill Engine V2. Competitive skill is derived exclusively from independently
-- certified, individual MATCH receipts. Legacy per-Run claims never migrate.
create table public.rch_match_skill_box_scores (
 match_id uuid not null references public.run_ranked_matches(id) on delete restrict,
 profile_id uuid not null references public.profiles(id) on delete restrict,
 points integer not null check(points between 0 and 250),
 rebounds integer check(rebounds between 0 and 50),
 assists integer check(assists between 0 and 50),
 three_made integer check(three_made between 0 and 50),
 three_attempted integer check(three_attempted between 0 and 80),
 steals integer check(steals between 0 and 30),
 blocks integer check(blocks between 0 and 30),
 turnovers integer check(turnovers between 0 and 40),
 defensive_stops integer check(defensive_stops between 0 and 80),
 source_note text not null check(char_length(source_note) between 10 and 300),
 recorded_by uuid not null references public.profiles(id),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 review_status text not null default 'pending' check(review_status in ('pending','verified','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(match_id,profile_id),
 check(three_made is null or three_attempted is not null),
 check(three_made is null or three_made<=three_attempted),
 check(review_status<>'verified' or (reviewed_by is not null and reviewed_at is not null and reviewed_by<>recorded_by and reviewed_by<>profile_id))
);
create index rch_skill_stats_player_idx on public.rch_match_skill_box_scores(profile_id,review_status,reviewed_at desc);
alter table public.rch_match_skill_box_scores enable row level security;
revoke all on public.rch_match_skill_box_scores from public,anon,authenticated;
grant select on public.rch_match_skill_box_scores to authenticated;
create policy rch_skill_stats_owner_read on public.rch_match_skill_box_scores for select to authenticated
 using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false)
 or exists(
  select 1 from public.run_ranked_matches m join public.runs r on r.id=m.run_id
  where m.id=rch_match_skill_box_scores.match_id and
  (r.host_id=(select auth.uid()) or exists(select 1 from public.rch_run_operators o
   where o.run_id=r.id and o.profile_id=(select auth.uid()) and o.role in ('cohost','scorekeeper')))
 ));
 
-- Immutable human-readable correction ledger; clients cannot forge evidence.
create table public.rch_skill_evidence_corrections (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null,
 profile_id uuid not null,
 reason text not null check(char_length(reason) between 15 and 500),
 revoked_by uuid not null references public.profiles(id),
 revoked_at timestamptz not null default now()
);
alter table public.rch_skill_evidence_corrections enable row level security;
revoke all on public.rch_skill_evidence_corrections from public,anon,authenticated;
grant select on public.rch_skill_evidence_corrections to authenticated;
create policy rch_skill_corrections_owner_read on public.rch_skill_evidence_corrections for select to authenticated
 using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));

-- Versioned catalog. Threshold rules are kept server-side in get_rch_skill_mastery.
create table public.rch_skill_badge_catalog (
 code text primary key,
 title text not null,
 discipline text not null,
 description text not null,
 rule_version integer not null default 2 check(rule_version>=2),
 active boolean not null default true
);
insert into public.rch_skill_badge_catalog(code,title,discipline,description) values
 ('certified_bucket','Certified Bucket','Scoring','Produce a meaningful share of team points in a verified match. Requirements scale with the match format.'),
 ('winning_scorer','Winning Scorer','Scoring','Produce qualifying scoring in a verified match victory.'),
 ('glass_cleaner','Glass Cleaner','Rebounding','Record format-adjusted rebounding production with independent evidence.'),
 ('floor_general','Floor General','Playmaking','Record format-adjusted assists with independent evidence; 1v1 does not qualify.'),
 ('double_double','All-Around Engine','All-Around','Impact two separate statistical categories in a verified match.'),
 ('sniper','Sniper','Shooting','Make two or more threes on at least 40% accuracy with at least four verified attempts.'),
 ('ball_hawk','Ball Hawk','Defense','Record at least two verified steals in one match.'),
 ('rim_protector','Rim Protector','Defense','Record at least two verified blocks in one match.'),
 ('two_way_threat','Two-Way Threat','All-Around','Combine meaningful scoring with verified defensive stops, steals or blocks.')
on conflict(code) do nothing;
alter table public.rch_skill_badge_catalog enable row level security;
revoke all on public.rch_skill_badge_catalog from public,anon,authenticated;
grant select on public.rch_skill_badge_catalog to anon,authenticated;
create policy rch_skill_catalog_public on public.rch_skill_badge_catalog for select to anon,authenticated using(active);

-- A host, assigned scorekeeper or staff records verified match statistics.
-- Not the player; no direct client writes and no self-verified receipts.
create function public.rch_submit_match_skill_stats(
 p_match uuid,p_player uuid,p_points integer,p_rebounds integer,p_assists integer,
 p_three_made integer,p_three_attempted integer,p_steals integer,
 p_blocks integer,p_turnovers integer,p_defensive_stops integer,p_source_note text
) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();m public.run_ranked_matches%rowtype;r public.runs%rowtype;
 v_side text;v_team_score integer;
begin
 if actor is null then raise exception 'Sign in as an authorized scorekeeper';end if;
 select * into m from public.run_ranked_matches where id=p_match for update;
 if not found or m.status<>'verified' or m.verified_at is null
 then raise exception 'An independently verified match is required';end if;
 select * into r from public.runs where id=m.run_id;
 if r.run_type<>'competitive' or r.status<>'completed' or r.starts_at>now()
    or r.status='cancelled' then raise exception 'The competitive Run must be completed';end if;
 if not (actor=r.host_id or coalesce(public.is_staff_or_admin(),false)
   or exists(select 1 from public.rch_run_operators o where o.run_id=r.id
       and o.profile_id=actor and o.role in ('scorekeeper','cohost')))
 then raise exception 'Only an authorized event scorekeeper may record a skill receipt';end if;
 if actor=p_player then raise exception 'A player cannot record their own mastery evidence';end if;
 select side into v_side from public.run_ranked_match_players
  where match_id=p_match and profile_id=p_player;
 if v_side is null or not exists(select 1 from public.run_checkins c
    where c.run_id=m.run_id and c.profile_id=p_player)
 then raise exception 'The player must be on the verified roster and checked in';end if;
 v_team_score:=case when v_side='home' then m.home_score else m.away_score end;
 if p_points is null or p_points<0 or p_points>v_team_score
    or p_rebounds is not null and p_rebounds not between 0 and 50
    or p_assists is not null and p_assists not between 0 and 50
    or p_three_made is not null and p_three_made not between 0 and 50
    or p_three_attempted is not null and p_three_attempted not between 0 and 80
    or p_three_made is not null and (p_three_attempted is null or p_three_made>p_three_attempted)
    or p_steals is not null and p_steals not between 0 and 30
    or p_blocks is not null and p_blocks not between 0 and 30
    or p_turnovers is not null and p_turnovers not between 0 and 40
    or p_defensive_stops is not null and p_defensive_stops not between 0 and 80
    or char_length(trim(coalesce(p_source_note,''))) not between 10 and 300
 then raise exception 'Invalid or incomplete match-specific statistical evidence';end if;
 if m.game_format='1v1' and coalesce(p_assists,0)>0
 then raise exception '1v1 cannot generate assists';end if;
 insert into public.rch_match_skill_box_scores
 (match_id,profile_id,points,rebounds,assists,three_made,three_attempted,steals,blocks,turnovers,defensive_stops,source_note,recorded_by)
 values(p_match,p_player,p_points,p_rebounds,p_assists,p_three_made,p_three_attempted,p_steals,p_blocks,p_turnovers,p_defensive_stops,trim(p_source_note),actor)
 on conflict(match_id,profile_id) do update set
 points=excluded.points,rebounds=excluded.rebounds,assists=excluded.assists,
 three_made=excluded.three_made,three_attempted=excluded.three_attempted,
 steals=excluded.steals,blocks=excluded.blocks,turnovers=excluded.turnovers,
 defensive_stops=excluded.defensive_stops,source_note=excluded.source_note,
 recorded_by=excluded.recorded_by,review_status='pending',reviewed_by=null,reviewed_at=null,updated_at=now()
 where public.rch_match_skill_box_scores.review_status in ('pending','rejected');
 if not found then raise exception 'Verified evidence is locked; use the audited correction process';end if;
end $$;

-- Separate human confirmation. Match winner is calculated from the official
-- verified score, never from an independent "won" toggle.
create function public.rch_review_match_skill_stats(p_match uuid,p_player uuid,p_approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();s public.rch_match_skill_box_scores%rowtype;
 m public.run_ranked_matches%rowtype;r public.runs%rowtype;
 v_side text;v_team_score integer;v_approved_points integer;
begin
 if actor is null then raise exception 'Sign in to review evidence';end if;
 select * into s from public.rch_match_skill_box_scores
  where match_id=p_match and profile_id=p_player for update;
 if not found or s.review_status<>'pending' then raise exception 'No pending score to review';end if;
 select * into m from public.run_ranked_matches where id=p_match;
 select * into r from public.runs where id=m.run_id;
 if actor=s.recorded_by or actor=s.profile_id then
   raise exception 'Evidence requires a different independent reviewer';end if;
 if not (actor=r.host_id or coalesce(public.is_staff_or_admin(),false)
   or exists(select 1 from public.rch_run_operators o where o.run_id=m.run_id
     and o.profile_id=actor and o.role in ('scorekeeper','cohost')))
 then raise exception 'Unauthorized match reviewer';end if;
 if m.status<>'verified' or m.verified_at is null or r.status<>'completed'
 then raise exception 'Only final verified competitive games qualify';end if;
 if p_approve then
  select mp.side into v_side from public.run_ranked_match_players mp
   where mp.match_id=p_match and mp.profile_id=p_player;
  if v_side is null then raise exception 'Player is not on the official verified roster';end if;
  v_team_score:=case when v_side='home' then m.home_score else m.away_score end;
  select coalesce(sum(other.points),0)::integer into v_approved_points
  from public.rch_match_skill_box_scores other
  join public.run_ranked_match_players teammate
   on teammate.match_id=other.match_id and teammate.profile_id=other.profile_id
  where other.match_id=p_match and other.profile_id<>p_player
    and other.review_status='verified' and teammate.side=v_side;
  if v_approved_points+s.points>v_team_score then
   raise exception 'Approved teammate points exceed the final official score';end if;
  if m.game_format='1v1' and s.points<>v_team_score then
   raise exception '1v1 points must equal the independently verified game score';end if;
 end if;
 update public.rch_match_skill_box_scores set
 review_status=case when p_approve then 'verified' else 'rejected' end,
 reviewed_by=actor,reviewed_at=now(),updated_at=now()
 where match_id=p_match and profile_id=p_player;
end $$;

create function public.rch_revoke_match_skill_stats(p_match uuid,p_player uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();s public.rch_match_skill_box_scores%rowtype;
begin
 if actor is null or not coalesce(public.is_staff_or_admin(),false)
 then raise exception 'Only RCH staff can revoke verified skill evidence';end if;
 if char_length(trim(coalesce(p_reason,''))) not between 15 and 500
 then raise exception 'Provide an audit reason of 15 to 500 characters';end if;
 select * into s from public.rch_match_skill_box_scores
 where match_id=p_match and profile_id=p_player for update;
 if not found or s.review_status<>'verified' then raise exception 'No verified receipt to revoke';end if;
 update public.rch_match_skill_box_scores set review_status='rejected',
 reviewed_by=actor,reviewed_at=now(),updated_at=now()
 where match_id=p_match and profile_id=p_player;
 insert into public.rch_skill_evidence_corrections(match_id,profile_id,reason,revoked_by)
 values(p_match,p_player,trim(p_reason),actor);
end $$;
revoke all on function public.rch_submit_match_skill_stats(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer,text),
 public.rch_review_match_skill_stats(uuid,uuid,boolean),
 public.rch_revoke_match_skill_stats(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.rch_submit_match_skill_stats(uuid,uuid,integer,integer,integer,integer,integer,integer,integer,integer,integer,text),
 public.rch_review_match_skill_stats(uuid,uuid,boolean),
 public.rch_revoke_match_skill_stats(uuid,uuid,text) to authenticated;

-- Supersede the old single-game stat badges: retain historical receipts as
-- legacy achievements, but never mint new basketball mastery from them.
create or replace function public.rch_reward_verified_run_stats()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_court text;v_bonus integer;
begin
 if new.review_status<>'verified' then return new;end if;
 select r.location_slug into v_court from public.runs r where r.id=new.run_id;
 v_bonus:=least(30,(new.points/5)*3+(new.rebounds/3)*2+(new.assists/3)*2);
 insert into public.rch_run_stat_rewards(submission_id,profile_id,court_slug,rep_bonus)
 values(new.id,new.profile_id,v_court,v_bonus) on conflict(submission_id) do nothing;
 return new;
end $$;
revoke all on function public.rch_reward_verified_run_stats() from public,anon,authenticated;

drop function if exists public.get_rch_skill_mastery(uuid);
create function public.get_rch_skill_mastery(p_profile uuid default null)
returns table (
 badge_code text,badge_name text,discipline text,description text,
 qualifying_games bigint,verified_games bigint,tier text,tier_index integer,
 next_target integer,progress_percent integer,qualifying_sessions bigint,
 next_sessions integer,rule_version integer
)
language sql stable security definer set search_path='' as $$
with allowed as (
 select p.id from public.profiles p where p.id=coalesce(p_profile,(select auth.uid()))
 and p.is_active and not coalesce(p.is_system_account,false)
 and (p.id=(select auth.uid()) or coalesce(p.profile_visibility,'public') not in ('private','only_me'))
), evidence as (
 select s.*,m.run_id,m.game_format,m.home_score,m.away_score,mp.side,
 case when mp.side='home' then m.home_score else m.away_score end as team_score,
 case when mp.side='home' then m.home_score>m.away_score else m.away_score>m.home_score end as won
 from public.rch_match_skill_box_scores s
 join allowed a on a.id=s.profile_id
 join public.run_ranked_matches m on m.id=s.match_id
 join public.run_ranked_match_players mp on mp.match_id=m.id and mp.profile_id=s.profile_id
 join public.runs r on r.id=m.run_id
 where s.review_status='verified' and s.reviewed_by<>s.recorded_by
 and s.reviewed_by<>s.profile_id and s.reviewed_at is not null
 and m.status='verified' and m.verified_at is not null
 and r.run_type='competitive' and r.status='completed' and r.starts_at<=now()
 and exists(select 1 from public.run_checkins c where c.run_id=m.run_id and c.profile_id=s.profile_id)
), scored as (
 select e.*,
 (e.points>=case e.game_format when '1v1' then 7 when '2v2' then 7 when '3v3' then 7 when '4v4' then 9 else 10 end
 and (e.game_format='1v1' or e.points*100>=e.team_score*30)) as good_scoring,
 (e.rebounds is not null and e.rebounds>=case e.game_format when '1v1' then 5 when '2v2' then 5 when '3v3' then 6 when '4v4' then 7 else 8 end) as good_glass,
 (e.game_format<>'1v1' and e.assists is not null
 and e.assists>=case e.game_format when '2v2' then 3 when '3v3' then 4 when '4v4' then 5 else 6 end) as good_creation
 from evidence e
), qualifications as (
 select x.run_id,x.match_id,b.code,
 case b.code
 when 'certified_bucket' then x.good_scoring
 when 'winning_scorer' then x.good_scoring and x.won
 when 'glass_cleaner' then x.good_glass
 when 'floor_general' then x.good_creation
 when 'double_double' then (case when x.good_scoring then 1 else 0 end +
                              case when x.good_glass then 1 else 0 end +
                              case when x.good_creation then 1 else 0 end)>=2
 when 'sniper' then x.three_made>=2 and x.three_attempted>=4
                         and x.three_made*100>=x.three_attempted*40
 when 'ball_hawk' then x.steals>=2
 when 'rim_protector' then x.blocks>=2
 when 'two_way_threat' then x.good_scoring
                         and (coalesce(x.steals,0)>=2 or coalesce(x.blocks,0)>=2
                              or coalesce(x.defensive_stops,0)>=3)
 else false end as qualified
 from scored x cross join public.rch_skill_badge_catalog b where b.active
), totals as (
 select b.code,b.title,b.discipline,b.description,b.rule_version,
 count(distinct q.match_id) filter(where q.qualified)::bigint as q,
 count(distinct q.run_id) filter(where q.qualified)::bigint as sessions,
 (select count(*) from evidence)::bigint as verified_count
 from public.rch_skill_badge_catalog b left join qualifications q on q.code=b.code
 where b.active
 group by b.code,b.title,b.discipline,b.description,b.rule_version
), tiers as (
 select t.*,
 case when q>=75 and sessions>=20 then 5
 when q>=40 and sessions>=12 then 4
 when q>=20 and sessions>=8 then 3
 when q>=8 and sessions>=4 then 2
 when q>=3 and sessions>=2 then 1 else 0 end as current_tier
 from totals t
)
select t.code,t.title,t.discipline,t.description,t.q,t.verified_count,
 (array['locked','bronze','silver','gold','hall_of_fame','legend'])[t.current_tier+1]::text,
 t.current_tier::integer,
 (array[3,8,20,40,75,75])[t.current_tier+1]::integer,
 case when t.current_tier=5 then 100
 else least(99,floor(100.0*t.q/
 (array[3,8,20,40,75,75])[t.current_tier+1])::integer) end,
 t.sessions,
 (array[2,4,8,12,20,20])[t.current_tier+1]::integer,
 t.rule_version
from tiers t where exists(select 1 from allowed)
order by t.discipline,t.title
$$;
revoke all on function public.get_rch_skill_mastery(uuid) from public,anon,authenticated;
grant execute on function public.get_rch_skill_mastery(uuid) to anon,authenticated;
comment on function public.get_rch_skill_mastery(uuid) is
 'Skill V2: only independently approved match-specific official evidence; format-sensitive requirements, 3/8/20/40/75 matches across 2/4/8/12/20 Run sessions. No participation, legacy box scores, XP, REP or purchases qualify.';
commit;