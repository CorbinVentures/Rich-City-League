begin;

-- Verified real-world skill mastery: no self-reported stats, spendable REP,
-- subscription, or social engagement can upgrade competitive ability badges.
-- Read-only derived progress avoids duplicated/inflated award records.
create or replace function public.get_rch_skill_mastery(p_profile uuid default null)
returns table (
 badge_code text, badge_name text, discipline text, description text,
 qualifying_games bigint, verified_games bigint, tier text, tier_index integer,
 next_target integer, progress_percent integer
)
language sql stable security definer set search_path='' as $$
with allowed_member as (
 select p.id
 from public.profiles p
 where p.id=coalesce(p_profile,(select auth.uid()))
   and p.is_active=true and not coalesce(p.is_system_account,false)
   and (
     p.id=(select auth.uid())
     or coalesce(p.profile_visibility,'public') not in ('private','only_me')
   )
),
verified as (
 select distinct on (s.run_id,s.profile_id)
   s.run_id,s.points,s.rebounds,s.assists,s.won
 from public.run_competitive_box_scores s
 join public.runs r on r.id=s.run_id
 join allowed_member m on m.id=s.profile_id
 where s.review_status='verified'
   and s.reviewed_by is not null
   and s.reviewed_by<>s.profile_id
   and s.reviewed_at is not null
   and r.run_type='competitive'
   and r.status='completed'
   and r.starts_at<=now()
 order by s.run_id,s.profile_id,s.reviewed_at desc,s.id
),
totals as (
 select count(*)::bigint games,
   count(*) filter(where points>=20)::bigint certified_bucket,
   count(*) filter(where points>=15 and won)::bigint winning_scorer,
   count(*) filter(where rebounds>=10)::bigint glass_cleaner,
   count(*) filter(where assists>=10)::bigint floor_general,
   count(*) filter(where (case when points>=10 then 1 else 0 end)
                         +(case when rebounds>=10 then 1 else 0 end)
                         +(case when assists>=10 then 1 else 0 end)>=2)::bigint double_double
 from verified
),
skills as (
 select s.code,s.name,s.discipline,s.description,s.q,t.games from totals t
 cross join lateral (values
  ('certified_bucket'::text,'Certified Bucket'::text,'Scoring'::text,'Score 20+ points in an independently reviewed competitive Run.',t.certified_bucket),
  ('winning_scorer','Winning Scorer','Scoring','Score 15+ points in a verified competitive Run victory.',t.winning_scorer),
  ('glass_cleaner','Glass Cleaner','Rebounding','Record 10+ verified rebounds in a competitive Run.',t.glass_cleaner),
  ('floor_general','Floor General','Playmaking','Record 10+ verified assists in a competitive Run.',t.floor_general),
  ('double_double','Double-Double Club','All-Around','Record double digits in two of points, rebounds and assists in the same verified Run.',t.double_double)
 ) as s(code,name,discipline,description,q)
)
select s.code,s.name,s.discipline,s.description,s.q,s.games,
 case when s.q>=30 then 'legend'
      when s.q>=16 then 'elite'
      when s.q>=8 then 'gold'
      when s.q>=3 then 'silver'
      when s.q>=1 then 'bronze'
      else 'locked' end::text,
 case when s.q>=30 then 5
      when s.q>=16 then 4
      when s.q>=8 then 3
      when s.q>=3 then 2
      when s.q>=1 then 1 else 0 end::integer,
 case when s.q>=30 then 30
      when s.q>=16 then 30
      when s.q>=8 then 16
      when s.q>=3 then 8
      when s.q>=1 then 3 else 1 end::integer,
 case when s.q>=30 then 100
      when s.q>=16 then floor((s.q-16)*100.0/14)::integer
      when s.q>=8 then floor((s.q-8)*100.0/8)::integer
      when s.q>=3 then floor((s.q-3)*100.0/5)::integer
      when s.q>=1 then floor((s.q-1)*100.0/2)::integer
      else 0 end::integer
from skills s
where exists(select 1 from allowed_member)
order by s.code;
$$;
revoke all on function public.get_rch_skill_mastery(uuid) from public,anon,authenticated;
grant execute on function public.get_rch_skill_mastery(uuid) to anon,authenticated;
comment on function public.get_rch_skill_mastery(uuid) is
 'Read-only verified 2K-style skill mastery; public results honor profile visibility, own results remain private, and purchases never influence progress. Bronze=1 Silver=3 Gold=8 Elite=16 Legend=30 qualifying verified Runs.';

commit;
