begin;

-- The circuit is a PLATFORM-LISTED community pickup opportunity. It is not a
-- reservation or promise of an RCH-staffed event. Competitive credits continue
-- to require independently confirmed game results.
create table public.rch_weekend_circuit_courts (
  city text not null check(length(trim(city)) between 2 and 70),
  slot smallint not null check(slot between 1 and 4),
  court_slug text not null unique references public.basketball_locations(slug) on update cascade on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(city,slot)
);
create table public.rch_weekend_circuit_events (
  run_id uuid primary key references public.runs(id) on delete restrict,
  city text not null,
  weekend_start date not null,
  slot smallint not null check(slot between 1 and 4),
  court_slug text not null references public.basketball_locations(slug),
  starts_at timestamptz not null,
  xp_multiplier integer not null default 2 check(xp_multiplier=2),
  bonus_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(city,weekend_start,slot),
  unique(city,weekend_start,court_slug)
);
create index rch_weekend_events_upcoming_idx on public.rch_weekend_circuit_events(starts_at,city);

alter table public.rch_weekend_circuit_courts enable row level security;
alter table public.rch_weekend_circuit_events enable row level security;
revoke all on public.rch_weekend_circuit_courts,public.rch_weekend_circuit_events from public,anon,authenticated;
grant select on public.rch_weekend_circuit_courts,public.rch_weekend_circuit_events to anon,authenticated;
create policy rch_weekend_courts_read on public.rch_weekend_circuit_courts
  for select to anon,authenticated using(true);
create policy rch_weekend_events_read on public.rch_weekend_circuit_events
  for select to anon,authenticated using(true);
-- Staff can configure the city's four-court pool. Clients cannot mint featured
-- event rows or award themselves multipliers.
grant insert,update,delete on public.rch_weekend_circuit_courts to authenticated;
create policy rch_weekend_courts_staff_insert on public.rch_weekend_circuit_courts
  for insert to authenticated with check(coalesce(public.is_staff_or_admin(),false));
create policy rch_weekend_courts_staff_update on public.rch_weekend_circuit_courts
  for update to authenticated using(coalesce(public.is_staff_or_admin(),false))
  with check(coalesce(public.is_staff_or_admin(),false));
create policy rch_weekend_courts_staff_delete on public.rch_weekend_circuit_courts
  for delete to authenticated using(coalesce(public.is_staff_or_admin(),false));

-- Production directory contains municipal GIS imports that a fresh Supabase
-- preview may not have. Seed ONLY sites present and eligible in THIS database;
-- cities with fewer than four valid park slots are never activated.
insert into public.rch_weekend_circuit_courts(city,slot,court_slug)
select v.city,v.slot,v.court_slug
from (values
 ('Richmond',1,'alice-fitz-park'),
 ('Richmond',2,'chimborazo'),
 ('Richmond',3,'fonticello'),
 ('Richmond',4,'providence'),
 ('Newport News',1,'va-newport-news-gis-2'),
 ('Newport News',2,'va-newport-news-gis-3'),
 ('Newport News',3,'va-newport-news-gis-30'),
 ('Newport News',4,'va-newport-news-gis-37')
) as v(city,slot,court_slug)
join public.basketball_locations l on l.slug=v.court_slug
where l.is_active and l.venue_type='outdoor' and l.access_type='public'
  and l.verification_status in ('official','provider')
  and l.name ~* '(park|playground)'
on conflict do nothing;

-- Stable anchor: 2026-10-24 = week A (slots 1,2), 2026-10-31 = week B
-- (slots 3,4). Saturday 11am, Sunday 3pm, America/New_York, year-round.
-- A city is activated ONLY with four distinct active public outdoor sites.
create or replace function public.rch_generate_weekend_circuit(p_weeks integer default 8)
returns integer language plpgsql security definer set search_path='' as $circuit$
declare
 v_saturday date;
 v_today date := (now() at time zone 'America/New_York')::date;
 v_city text; v_slot integer; v_day integer; v_offset integer;
 v_court public.basketball_locations%rowtype;
 v_start timestamptz; v_admin uuid; v_id uuid; v_created integer:=0;
begin
 if p_weeks not between 1 and 12 then raise exception 'Weeks must be 1 to 12'; end if;
 perform pg_catalog.pg_advisory_xact_lock(748213,20261024);
 select p.id into v_admin from public.profiles p where p.role::text='admin'
   and p.is_active and not coalesce(p.is_system_account,false) order by p.id limit 1;
 if v_admin is null then return 0; end if;
 v_saturday:=v_today-(extract(isodow from v_today)::integer-1)+5;
 for v_offset in 0..p_weeks-1 loop
   for v_city in
     select c.city from public.rch_weekend_circuit_courts c
     join public.basketball_locations l on l.slug=c.court_slug
     where c.active and l.is_active and l.venue_type='outdoor'
       and l.access_type='public' and l.verification_status in ('official','provider')
       and l.name ~* '(park|playground)'
     group by c.city having count(*)=4 and count(distinct c.court_slug)=4
     order by c.city
   loop
     for v_day in 0..1 loop
       v_slot:=case when (((v_saturday+v_offset*7)-date '2026-10-24')/7)%2=0
                    then v_day+1 else v_day+3 end;
       select l.* into v_court
       from public.rch_weekend_circuit_courts c
       join public.basketball_locations l on l.slug=c.court_slug
       where c.city=v_city and c.slot=v_slot and c.active;
       if v_court.slug is null then continue; end if;
       v_start:=((v_saturday+v_offset*7+v_day)
                 + case when v_day=0 then time '11:00' else time '15:00' end)
                 at time zone 'America/New_York';
       if v_start<=now() then continue; end if;
       if exists(select 1 from public.rch_weekend_circuit_events e
         where e.city=v_city and e.weekend_start=v_saturday+v_offset*7 and e.slot=v_slot)
       then continue; end if;
       insert into public.runs(
         host_id,title,description,run_type,skill_level,game_format,
         court_name,location,location_slug,starts_at,capacity,max_players,
         status,allow_fan_checkin
       ) values (
         v_admin,'RCH Weekend Double XP • '||v_court.name,
         'Recurring community drop-in at a public park. This is a suggested meetup, not a reserved court or a guaranteed RCH-staffed session. Check park hours and availability. Double Runs REP applies only to independently confirmed competitive game and reviewed stat rewards; ordinary check-ins, highlights and player-hosted Runs are 1x. 3v3 is the ranked format for this listing; casual pickup is welcome.',
         'competitive','all','3v3',
         v_court.name,v_court.name||', '||v_city||', VA',v_court.slug,v_start,18,18,
         'open',true
       ) returning id into v_id;
       insert into public.rch_weekend_circuit_events(
         run_id,city,weekend_start,slot,court_slug,starts_at
       ) values (v_id,v_city,v_saturday+v_offset*7,v_slot,v_court.slug,v_start);
       v_created:=v_created+1;
     end loop;
   end loop;
 end loop;
 return v_created;
end $circuit$;
revoke all on function public.rch_generate_weekend_circuit(integer) from public,anon,authenticated;

-- Immutable identity/time/court snapshot disallows changing a normal Run to
-- a featured Run after publication; excluded if Run is cancelled or modified.
create or replace function public.rch_is_weekend_bonus_eligible(p_run uuid)
returns boolean language sql stable security definer set search_path='' as $eligible$
 select exists(
   select 1 from public.rch_weekend_circuit_events e
   join public.runs r on r.id=e.run_id
   where e.run_id=p_run and e.bonus_enabled and e.xp_multiplier=2
     and r.location_slug=e.court_slug and r.starts_at=e.starts_at
     and r.run_type='competitive' and r.status<>'cancelled'
     and (r.starts_at at time zone 'America/New_York')::date
       = e.weekend_start+case when e.slot in (1,3) then 0 else 1 end
 );
$eligible$;
revoke all on function public.rch_is_weekend_bonus_eligible(uuid) from public,anon,authenticated;

-- Apply 2x BEFORE writing the existing, idempotent, verified game/stat earning
-- rows. The existing AFTER INSERT wallet ledger sees the correctly doubled
-- amount; no client grant or additional payable credit is introduced.
alter table public.rch_run_rep_events drop constraint if exists rch_run_rep_events_rep_check;
alter table public.rch_run_rep_events
  add constraint rch_run_rep_events_rep_check check(rep between 0 and 300);
alter table public.rch_run_stat_rewards drop constraint if exists rch_run_stat_rewards_rep_bonus_check;
alter table public.rch_run_stat_rewards
  add constraint rch_run_stat_rewards_rep_bonus_check check(rep_bonus between 0 and 60);

create or replace function public.rch_weekend_double_verified_game()
returns trigger language plpgsql security definer set search_path='' as $bonus$
declare v_run uuid;
begin
 select m.run_id into v_run from public.run_ranked_matches m where m.id=new.match_id;
 if public.rch_is_weekend_bonus_eligible(v_run) then new.rep:=new.rep*2; end if;
 return new;
end $bonus$;
create or replace function public.rch_weekend_double_reviewed_stats()
returns trigger language plpgsql security definer set search_path='' as $bonus$
declare v_run uuid;
begin
 select s.run_id into v_run from public.run_competitive_box_scores s where s.id=new.submission_id;
 if public.rch_is_weekend_bonus_eligible(v_run) then new.rep_bonus:=new.rep_bonus*2; end if;
 return new;
end $bonus$;
revoke all on function public.rch_weekend_double_verified_game(),
 public.rch_weekend_double_reviewed_stats() from public,anon,authenticated;
create trigger rch_weekend_double_game_before_insert
 before insert on public.rch_run_rep_events for each row execute function public.rch_weekend_double_verified_game();
create trigger rch_weekend_double_stats_before_insert
 before insert on public.rch_run_stat_rewards for each row execute function public.rch_weekend_double_reviewed_stats();

-- UTC job schedule, event dates and DST translated in America/New_York.
-- Scheduled every day to keep the next eight weekends populated.
select cron.schedule('rch-weekend-double-xp-circuit', '15 9 * * *',
  'select public.rch_generate_weekend_circuit(8);');
select public.rch_generate_weekend_circuit(8);
commit;
