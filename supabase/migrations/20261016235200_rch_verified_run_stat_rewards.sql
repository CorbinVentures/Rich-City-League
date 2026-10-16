begin;

-- Stat performance is independently reviewed once per Run. Credit a small
-- separate Run REP bonus once per verified submission, never based on raw claims.
create table if not exists public.rch_run_stat_rewards (
  submission_id uuid primary key references public.run_competitive_box_scores(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  court_slug text references public.basketball_locations(slug),
  rep_bonus integer not null check(rep_bonus between 0 and 30),
  credited_at timestamptz not null default now()
);
create index if not exists rch_stat_rewards_by_player on public.rch_run_stat_rewards(profile_id,credited_at desc);
alter table public.rch_run_stat_rewards enable row level security;
revoke all on public.rch_run_stat_rewards from public,anon,authenticated;
grant select on public.rch_run_stat_rewards to authenticated;
create policy rch_stat_rewards_owner on public.rch_run_stat_rewards for select to authenticated
  using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));

create table if not exists public.rch_run_stat_badges (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_code text not null check(badge_code in ('scorer_20','glass_cleaner','floor_general')),
  submission_id uuid not null references public.run_competitive_box_scores(id) on delete restrict,
  earned_at timestamptz not null default now(),
  primary key(profile_id,badge_code)
);
alter table public.rch_run_stat_badges enable row level security;
revoke all on public.rch_run_stat_badges from public,anon,authenticated;
grant select on public.rch_run_stat_badges to authenticated;
create policy rch_stat_badges_owner on public.rch_run_stat_badges for select to authenticated
  using(profile_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false));

create or replace function public.rch_reward_verified_run_stats()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_court text;v_bonus integer;
begin
 if new.review_status<>'verified' then return new; end if;
 select r.location_slug into v_court from public.runs r where r.id=new.run_id;
 -- 3 REP per 5 points, 2 per 3 rebounds, 2 per 3 assists.
 -- 30 REP maximum per independently reviewed Run; one submission per player/Run.
 v_bonus:=least(30,(new.points/5)*3+(new.rebounds/3)*2+(new.assists/3)*2);
 insert into public.rch_run_stat_rewards(submission_id,profile_id,court_slug,rep_bonus)
   values(new.id,new.profile_id,v_court,v_bonus) on conflict(submission_id) do nothing;
 if new.points>=20 then
  insert into public.rch_run_stat_badges(profile_id,badge_code,submission_id)
   values(new.profile_id,'scorer_20',new.id) on conflict do nothing;
 end if;
 if new.rebounds>=10 then
  insert into public.rch_run_stat_badges(profile_id,badge_code,submission_id)
   values(new.profile_id,'glass_cleaner',new.id) on conflict do nothing;
 end if;
 if new.assists>=10 then
  insert into public.rch_run_stat_badges(profile_id,badge_code,submission_id)
   values(new.profile_id,'floor_general',new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.rch_reward_verified_run_stats() from public,anon,authenticated;
drop trigger if exists rch_after_verified_run_box_score on public.run_competitive_box_scores;
create trigger rch_after_verified_run_box_score
after update of review_status on public.run_competitive_box_scores
for each row when(new.review_status='verified' and old.review_status is distinct from new.review_status)
execute function public.rch_reward_verified_run_stats();

-- Existing genuinely reviewed stats earn their one-time bonus, without any
-- artificial new games or matches. Old unverified claims remain ineligible.
insert into public.rch_run_stat_rewards(submission_id,profile_id,court_slug,rep_bonus)
select s.id,s.profile_id,r.location_slug,least(30,(s.points/5)*3+(s.rebounds/3)*2+(s.assists/3)*2)
from public.run_competitive_box_scores s join public.runs r on r.id=s.run_id
where s.review_status='verified' and r.status<>'cancelled'
on conflict(submission_id) do nothing;
insert into public.rch_run_stat_badges(profile_id,badge_code,submission_id)
select distinct on(profile_id,badge_code) profile_id,badge_code,submission_id from (
 select s.profile_id,'scorer_20'::text badge_code,s.id submission_id,s.reviewed_at
  from public.run_competitive_box_scores s where s.review_status='verified' and s.points>=20
 union all
 select s.profile_id,'glass_cleaner'::text,s.id,s.reviewed_at
  from public.run_competitive_box_scores s where s.review_status='verified' and s.rebounds>=10
 union all
 select s.profile_id,'floor_general'::text,s.id,s.reviewed_at
  from public.run_competitive_box_scores s where s.review_status='verified' and s.assists>=10
) x
order by profile_id,badge_code,reviewed_at nulls last,submission_id
on conflict do nothing;

-- One real Run scoreboard, independent of crew ownership and Cup points.
create or replace function public.get_rch_run_rep_board(p_limit integer default 25)
returns table(profile_id uuid,player_name text,avatar_url text,run_rep bigint,
 games bigint,wins bigint,defenses bigint)
language sql stable security definer set search_path='' as $$
with games as (
 select e.profile_id,sum(e.rep)::bigint as total,count(*)::bigint as played,
  count(*) filter(where e.reason in ('verified_win','takeover_win','takeover_defense'))::bigint as victories,
  count(*) filter(where e.reason='takeover_defense')::bigint as stops
 from public.rch_run_rep_events e group by e.profile_id
), stats as (
 select s.profile_id,sum(s.rep_bonus)::bigint as bonus from public.rch_run_stat_rewards s group by s.profile_id
), combined as (
 select coalesce(g.profile_id,s.profile_id) as id,
  coalesce(g.total,0)+coalesce(s.bonus,0) as rep,
  coalesce(g.played,0) as played,coalesce(g.victories,0) as victorious,coalesce(g.stops,0) as stops
 from games g full join stats s on s.profile_id=g.profile_id
)
select z.id,coalesce(nullif(p.display_name,''),nullif(p.username::text,''),'RCH Player'),p.avatar_url,
 z.rep,z.played,z.victorious,z.stops
from combined z join public.profiles p on p.id=z.id
where p.is_active and not coalesce(p.is_system_account,false)
  and coalesce(p.profile_visibility,'public') not in ('private','only_me')
order by z.rep desc,z.played desc,z.id limit least(greatest(coalesce(p_limit,25),1),100)
$$;
revoke all on function public.get_rch_run_rep_board(integer) from public,anon,authenticated;
grant execute on function public.get_rch_run_rep_board(integer) to anon,authenticated;

commit;