begin;

-- RCH Court Passport: a member's private, GPS-assisted court visits.
-- Coordinates are checked transiently in the RPC and are never stored.
create table if not exists public.court_checkins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  court_slug text not null references public.basketball_locations(slug) on update cascade on delete cascade,
  checked_in_on date not null,
  checked_in_at timestamptz not null default now(),
  unique (profile_id, court_slug, checked_in_on)
);

create index if not exists court_checkins_member_date_idx on public.court_checkins(profile_id, checked_in_on desc);
create index if not exists court_checkins_member_court_idx on public.court_checkins(profile_id, court_slug);

alter table public.court_checkins enable row level security;
revoke all on table public.court_checkins from public, anon, authenticated;
grant select on table public.court_checkins to authenticated;

drop policy if exists "members view own court checkins" on public.court_checkins;
create policy "members view own court checkins" on public.court_checkins
  for select to authenticated using (profile_id = (select auth.uid()));

insert into public.badges(name,description,category,icon,tier,requirement_type,requirement_value,is_active)
values
 ('Court Explorer','Check in at your first verified RCH basketball court.','community','📍','bronze','unique_courts',1,true),
 ('Court Hopper','Check in at five different verified basketball courts.','community','🏀','silver','unique_courts',5,true),
 ('Virginia Circuit','Check in at fifteen different verified basketball courts.','community','🏆','gold','unique_courts',15,true)
on conflict(name) do update
set description=excluded.description,category=excluded.category,icon=excluded.icon,tier=excluded.tier,
 requirement_type=excluded.requirement_type,requirement_value=excluded.requirement_value,is_active=true,updated_at=now();

-- Caller must be physically close to a verified, geocoded court.
-- SECURTY DEFINER is required to prevent direct inserts/REP spoofing;
-- function body validates auth.uid(), inputs and per-member quotas.
create or replace function public.check_in_to_court(
  p_court_slug text,
  p_lat double precision,
  p_lon double precision,
  p_accuracy double precision
)
returns table(rep_awarded integer, courts_visited bigint, unlocked_badges text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  court public.basketball_locations%rowtype;
  distance_m double precision;
  local_today date := (now() at time zone 'America/New_York')::date;
  daily_count integer;
  checkin_id uuid;
  reward_amount integer := 0;
  visited bigint;
  new_badges text;
begin
  if actor is null then raise exception 'Sign in to check in'; end if;
  if p_court_slug is null or length(p_court_slug) > 140 then raise exception 'Invalid court'; end if;
  if p_lat is null or p_lon is null or p_accuracy is null
    or not (p_lat between -90 and 90)
    or not (p_lon between -180 and 180)
    or not (p_accuracy between 0 and 100)
    or not isfinite(p_lat) or not isfinite(p_lon) or not isfinite(p_accuracy)
  then raise exception 'Please enable precise location and try again'; end if;

  select * into court from public.basketball_locations
  where slug=p_court_slug and is_active=true and latitude is not null and longitude is not null
    and verification_status in ('official','provider') and latitude between -90 and 90 and longitude between -180 and 180;
  if not found then raise exception 'This court is not currently eligible for GPS check-ins'; end if;

  distance_m := 6371000.0 * acos(least(1.0,greatest(-1.0,
    sin(radians(court.latitude))*sin(radians(p_lat))
    + cos(radians(court.latitude))*cos(radians(p_lat))*cos(radians(p_lon-court.longitude))
  )));
  if distance_m > 200 then raise exception 'You must be within 200 meters of the court to check in'; end if;

  -- Lock user to serialize concurrent check-ins so the daily cap cannot be raced.
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'Member profile not found'; end if;

  -- Repeat check-ins on the same calendar day do not pay REP twice.
  if exists(select 1 from public.court_checkins c where c.profile_id=actor
      and c.court_slug=p_court_slug and c.checked_in_on=local_today) then
    return query select 0::integer,
      (select count(distinct c.court_slug) from public.court_checkins c where c.profile_id=actor),
      null::text;
    return;
  end if;

  select count(*) into daily_count from public.court_checkins c
    where c.profile_id=actor and c.checked_in_on=local_today;
  if daily_count >= 3 then raise exception 'Daily court check-in limit reached (3 courts)'; end if;

  insert into public.court_checkins(profile_id,court_slug,checked_in_on)
    values(actor,p_court_slug,local_today) returning id into checkin_id;
  if public.award_run_rep(actor,10,'court_checkin','court_checkin',checkin_id) then
    reward_amount := 10;
  end if;

  select count(distinct c.court_slug) into visited from public.court_checkins c where c.profile_id=actor;

  with earned as (
    insert into public.fan_badges(profile_id,badge_id)
    select actor,b.id from public.badges b
    where b.is_active=true and b.requirement_type='unique_courts'
      and visited>=b.requirement_value
    on conflict(profile_id,badge_id) do nothing
    returning badge_id
  )
  select string_agg(b.name, ', ' order by b.requirement_value)
    into new_badges from earned e join public.badges b on b.id=e.badge_id;

  return query select reward_amount,visited,new_badges;
end $$;

revoke all on function public.check_in_to_court(text,double precision,double precision,double precision) from public, anon, authenticated;
grant execute on function public.check_in_to_court(text,double precision,double precision,double precision) to authenticated;

commit;