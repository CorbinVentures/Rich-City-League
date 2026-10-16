begin;

-- Preserve the existing captain-issued founding challenges as qualifiers.
-- RCH staff alone may seed sanctioned groups and schedule championship fixtures.
alter table public.commonwealth_challenges
  add column if not exists cup_stage text not null default 'qualifier'
    check (cup_stage in ('qualifier','group','round_of_16','quarterfinal','semifinal','final')),
  add column if not exists cup_group text check (cup_group ~ '^[A-H]$');

alter table public.commonwealth_challenges
  add constraint commonwealth_cup_group_stage_check
  check ((cup_stage='group' and cup_group is not null)
      or (cup_stage<>'group' and cup_group is null));

create unique index if not exists commonwealth_one_verified_final_idx
  on public.commonwealth_challenges(season_id)
  where cup_stage='final' and status='verified';

create table public.commonwealth_cup_groups(
  season_id uuid not null references public.commonwealth_seasons(id) on delete restrict,
  group_code text not null check(group_code ~ '^[A-H]$'),
  slot integer not null check(slot between 1 and 4),
  crew_id uuid not null,
  seeded_at timestamptz not null default now(),
  seeded_by uuid not null references public.profiles(id),
  primary key(season_id,group_code,slot),
  unique(season_id,crew_id),
  foreign key (crew_id,season_id) references public.commonwealth_crews(id,season_id)
);

alter table public.commonwealth_cup_groups enable row level security;
revoke all on public.commonwealth_cup_groups from public,anon,authenticated;
grant select on public.commonwealth_cup_groups to anon,authenticated;
create policy public_commonwealth_cup_groups_read on public.commonwealth_cup_groups
  for select to anon,authenticated using(true);

-- Exactly four possible crews per group; seeding cannot be changed once group play has begun.
create function public.commonwealth_seed_cup_group(p_season uuid,p_group text,p_slot integer,p_crew uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
    raise exception 'RCH staff approval is required to seed a Cup group';
  end if;
  if p_group !~ '^[A-H]$' or p_slot not between 1 and 4 then
    raise exception 'Select an official group A–H and seed position 1–4';
  end if;
  if not exists(select 1 from public.commonwealth_seasons s where s.id=p_season and s.status in ('enrollment','active')) then
    raise exception 'This Cup season is not accepting seeds';
  end if;
  if not exists(select 1 from public.commonwealth_crews c where c.id=p_crew and c.season_id=p_season) then
    raise exception 'Crew does not belong to this Cup season';
  end if;
  if exists(select 1 from public.commonwealth_challenges ch
    where ch.season_id=p_season and ch.cup_stage<>'qualifier' and ch.status not in ('declined','cancelled','rejected')) then
    raise exception 'Cup groups are locked after sanctioned group or knockout fixtures begin';
  end if;
  -- Staff must remove/reconcile an existing entry deliberately, never silently reseed.
  insert into public.commonwealth_cup_groups(season_id,group_code,slot,crew_id,seeded_by)
    values(p_season,p_group,p_slot,p_crew,v_actor);
  return true;
end $$;

create function public.commonwealth_schedule_cup_fixture(
  p_season uuid,p_challenger uuid,p_defender uuid,p_court text,
  p_start timestamptz,p_format text,p_stage text,p_group text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_id uuid;
begin
  if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
    raise exception 'Only RCH staff may schedule sanctioned Cup fixtures';
  end if;
  if not exists(select 1 from public.commonwealth_seasons s where s.id=p_season and s.status='active') then
    raise exception 'Activate the season before scheduling Cup stages';
  end if;
  if p_challenger=p_defender or p_challenger is null or p_defender is null then
    raise exception 'Choose two different crews';
  end if;
  if not exists(select 1 from public.commonwealth_crews c where c.id=p_challenger and c.season_id=p_season)
    or not exists(select 1 from public.commonwealth_crews c where c.id=p_defender and c.season_id=p_season) then
    raise exception 'Crews must compete within the same season';
  end if;
  if p_stage not in ('group','round_of_16','quarterfinal','semifinal','final') then
    raise exception 'Choose a sanctioned group or knockout stage';
  end if;
  if p_format not in ('3v3','5v5') then raise exception 'Cup fixtures use 3v3 or 5v5'; end if;
  if p_start is null or p_start<now()+interval '1 hour' or p_start>now()+interval '60 days' then
    raise exception 'Cup fixtures must be scheduled one hour to 60 days ahead';
  end if;
  if not exists(select 1 from public.commonwealth_sites site
      where site.season_id=p_season and site.court_slug=p_court) then
    raise exception 'Choose an approved Cup court';
  end if;
  if p_stage='group' then
    if p_group is null or p_group !~ '^[A-H]$' or
      (select count(*) from public.commonwealth_cup_groups g
       where g.season_id=p_season and g.group_code=p_group
         and g.crew_id in (p_challenger,p_defender))<>2 then
      raise exception 'Both crews must be assigned to the same official group';
    end if;
  elsif p_group is not null then
    raise exception 'Knockout fixtures cannot carry a group code';
  end if;
  if exists(select 1 from public.commonwealth_challenges ch
    where ch.season_id=p_season and ch.cup_stage=p_stage
      and ch.challenger_id in (p_challenger,p_defender)
      and ch.defender_id in (p_challenger,p_defender)
      and ch.status in ('accepted','review','verified')) then
    raise exception 'This stage already has a fixture between these crews';
  end if;
  insert into public.commonwealth_challenges(
    season_id,challenger_id,defender_id,court_slug,scheduled_at,format,
    status,created_by,decided_at,cup_stage,cup_group
  ) values (
    p_season,p_challenger,p_defender,p_court,p_start,p_format,
    'accepted',v_actor,now(),p_stage,p_group
  ) returning id into v_id;
  return v_id;
end $$;

create or replace view public.commonwealth_cup_group_standings
  with (security_invoker=true) as
select g.season_id,g.group_code,g.slot,g.crew_id,c.name,c.city,
  count(ch.id)::integer as games,
  count(ch.id) filter(where (ch.challenger_id=c.id and ch.challenger_score>ch.defender_score)
    or (ch.defender_id=c.id and ch.defender_score>ch.challenger_score))::integer as wins,
  count(ch.id) filter(where (ch.challenger_id=c.id and ch.challenger_score<ch.defender_score)
    or (ch.defender_id=c.id and ch.defender_score<ch.challenger_score))::integer as losses,
  (3*count(ch.id) filter(where (ch.challenger_id=c.id and ch.challenger_score>ch.defender_score)
    or (ch.defender_id=c.id and ch.defender_score>ch.challenger_score)))::integer as points,
  coalesce(sum(case when ch.challenger_id=c.id then ch.challenger_score else ch.defender_score end),0)::integer as points_for,
  coalesce(sum(case when ch.challenger_id=c.id then ch.defender_score else ch.challenger_score end),0)::integer as points_against
from public.commonwealth_cup_groups g
join public.commonwealth_crews c on c.id=g.crew_id
left join public.commonwealth_challenges ch
  on ch.season_id=g.season_id and ch.cup_stage='group' and ch.cup_group=g.group_code
  and ch.status='verified' and (ch.challenger_id=g.crew_id or ch.defender_id=g.crew_id)
group by g.season_id,g.group_code,g.slot,g.crew_id,c.name,c.city;

revoke all on public.commonwealth_cup_group_standings from public,anon,authenticated;
grant select on public.commonwealth_cup_group_standings to anon,authenticated;
revoke all on function public.commonwealth_seed_cup_group(uuid,text,integer,uuid),
  public.commonwealth_schedule_cup_fixture(uuid,uuid,uuid,text,timestamptz,text,text,text)
  from public,anon,authenticated;
grant execute on function public.commonwealth_seed_cup_group(uuid,text,integer,uuid),
  public.commonwealth_schedule_cup_fixture(uuid,uuid,uuid,text,timestamptz,text,text,text)
  to authenticated;

comment on table public.commonwealth_cup_groups is
  'Official World Cup-style group slots; future knockout games use commonwealth_challenges.cup_stage. No fabricated group fixtures or results.';
commit;
