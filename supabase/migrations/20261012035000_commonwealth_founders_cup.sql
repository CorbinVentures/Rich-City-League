begin;

-- The Commonwealth founding season. Scores never affect ordinary REP, player ratings or league standings.
create table if not exists public.commonwealth_seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null default 'Richmond metro',
  status text not null default 'enrollment' check (status in ('enrollment','active','closed')),
  created_at timestamptz not null default now()
);
insert into public.commonwealth_seasons(slug,name,region,status)
values ('richmond-founding-2026','The Commonwealth · Founding Season','Richmond metro','enrollment')
on conflict(slug) do nothing;

create table if not exists public.commonwealth_sites (
  season_id uuid not null references public.commonwealth_seasons(id) on delete cascade,
  court_slug text not null references public.basketball_locations(slug) on delete restrict,
  primary key(season_id,court_slug)
);
insert into public.commonwealth_sites(season_id,court_slug)
select s.id,l.slug from public.commonwealth_seasons s
join public.basketball_locations l on l.slug in ('pine-camp','battery-park','chimborazo','broad-rock-sports','randolph')
where s.slug='richmond-founding-2026' and l.is_active=true
on conflict do nothing;

create table if not exists public.commonwealth_crews (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.commonwealth_seasons(id) on delete restrict,
  captain_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (length(btrim(name)) between 3 and 36),
  motto text not null default '' check (length(motto)<=160),
  city text not null check (length(btrim(city)) between 2 and 80),
  home_court_slug text not null references public.basketball_locations(slug) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id,season_id),
  unique (season_id,captain_id),
  foreign key (season_id,home_court_slug) references public.commonwealth_sites(season_id,court_slug)
);
create unique index if not exists commonwealth_crew_name_unique
  on public.commonwealth_crews(season_id,lower(btrim(name)));
create index if not exists commonwealth_crew_court_idx on public.commonwealth_crews(home_court_slug);

create table if not exists public.commonwealth_crew_members (
  crew_id uuid not null,
  season_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player' check(role in ('captain','player')),
  joined_at timestamptz not null default now(),
  primary key (crew_id,profile_id),
  unique (season_id,profile_id),
  foreign key (crew_id,season_id) references public.commonwealth_crews(id,season_id) on delete cascade
);
create index if not exists commonwealth_members_profile_idx on public.commonwealth_crew_members(profile_id);

create table if not exists public.commonwealth_join_requests (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.commonwealth_crews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(crew_id,profile_id)
);

create table if not exists public.commonwealth_challenges (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.commonwealth_seasons(id) on delete restrict,
  challenger_id uuid not null,
  defender_id uuid not null,
  court_slug text not null references public.basketball_locations(slug),
  scheduled_at timestamptz not null,
  format text not null check(format in ('3v3','5v5')),
  status text not null default 'proposed' check(status in ('proposed','accepted','declined','cancelled','review','verified','rejected')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  run_id uuid unique references public.runs(id) on delete set null,
  challenger_score integer check(challenger_score between 0 and 200),
  defender_score integer check(defender_score between 0 and 200),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique(id,season_id),
  foreign key (challenger_id,season_id) references public.commonwealth_crews(id,season_id),
  foreign key (defender_id,season_id) references public.commonwealth_crews(id,season_id),
  foreign key (season_id,court_slug) references public.commonwealth_sites(season_id,court_slug),
  check (challenger_id <> defender_id),
  check ((challenger_score is null and defender_score is null) or (challenger_score is not null and defender_score is not null))
);
create index if not exists commonwealth_challenge_season_idx on public.commonwealth_challenges(season_id,status,scheduled_at desc);
create index if not exists commonwealth_challenge_defender_idx on public.commonwealth_challenges(defender_id,status);
create index if not exists commonwealth_challenge_challenger_idx on public.commonwealth_challenges(challenger_id,status);

-- No browser role may write competition records directly. All writes go through authenticated RPC
-- enforcing captain ownership, one-crew-per-season, double-use and independently reviewed scores.
alter table public.commonwealth_seasons enable row level security;
alter table public.commonwealth_sites enable row level security;
alter table public.commonwealth_crews enable row level security;
alter table public.commonwealth_crew_members enable row level security;
alter table public.commonwealth_join_requests enable row level security;
alter table public.commonwealth_challenges enable row level security;

revoke all on public.commonwealth_seasons,public.commonwealth_sites,public.commonwealth_crews,
  public.commonwealth_crew_members,public.commonwealth_join_requests,public.commonwealth_challenges
  from public,anon,authenticated;
grant select on public.commonwealth_seasons,public.commonwealth_sites,public.commonwealth_crews,
  public.commonwealth_challenges to anon,authenticated;
grant select on public.commonwealth_crew_members,public.commonwealth_join_requests to authenticated;

create policy commonwealth_read_seasons on public.commonwealth_seasons for select to anon,authenticated using(true);
create policy commonwealth_read_sites on public.commonwealth_sites for select to anon,authenticated using(true);
create policy commonwealth_read_crews on public.commonwealth_crews for select to anon,authenticated using(true);
create policy commonwealth_read_challenges on public.commonwealth_challenges for select to anon,authenticated using(true);
create policy commonwealth_read_members on public.commonwealth_crew_members for select to authenticated using(true);
create policy commonwealth_read_join_requests on public.commonwealth_join_requests for select to authenticated using(
  profile_id=(select auth.uid()) or exists(select 1 from public.commonwealth_crews c where c.id=crew_id and c.captain_id=(select auth.uid()))
);

create or replace function public.commonwealth_found_crew(p_name text,p_court_slug text,p_motto text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_season uuid; v_crew uuid; v_city text;
begin
  if v_user is null then raise exception 'Sign in to start a crew'; end if;
  if length(btrim(coalesce(p_name,''))) not between 3 and 36 or length(coalesce(p_motto,''))>160 then raise exception 'Check crew name or motto length'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user and p.is_active and not p.is_system_account
    and (p.date_of_birth is null or p.date_of_birth <= current_date-interval '16 years')) then raise exception 'Active member account required'; end if;
  select s.id into v_season from public.commonwealth_seasons s where s.slug='richmond-founding-2026' and s.status in ('enrollment','active');
  if v_season is null then raise exception 'Founding season is not taking crews'; end if;
  select l.locality into v_city from public.commonwealth_sites site
    join public.basketball_locations l on l.slug=site.court_slug
    where site.season_id=v_season and site.court_slug=p_court_slug and l.is_active;
  if v_city is null then raise exception 'Select one of the founding courts'; end if;
  if exists(select 1 from public.commonwealth_crew_members m where m.season_id=v_season and m.profile_id=v_user) then raise exception 'You are already in a crew this season'; end if;
  insert into public.commonwealth_crews(season_id,captain_id,name,motto,city,home_court_slug)
    values (v_season,v_user,btrim(p_name),btrim(coalesce(p_motto,'')),v_city,p_court_slug) returning id into v_crew;
  insert into public.commonwealth_crew_members(crew_id,season_id,profile_id,role)
    values(v_crew,v_season,v_user,'captain');
  return v_crew;
end $$;

create or replace function public.commonwealth_request_to_join(p_crew uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_season uuid; v_id uuid;
begin
  if v_user is null then raise exception 'Sign in to request a roster spot'; end if;
  if not exists(select 1 from public.profiles p where p.id=v_user and p.is_active and not p.is_system_account
    and (p.date_of_birth is null or p.date_of_birth <= current_date-interval '16 years')) then raise exception 'Active member account required'; end if;
  select c.season_id into v_season from public.commonwealth_crews c
    join public.commonwealth_seasons s on s.id=c.season_id where c.id=p_crew and s.status in ('enrollment','active');
  if v_season is null then raise exception 'Crew is not accepting applications'; end if;
  if exists(select 1 from public.commonwealth_crew_members m where m.season_id=v_season and m.profile_id=v_user) then raise exception 'You already belong to a crew this season'; end if;
  if (select count(*) from public.commonwealth_join_requests r join public.commonwealth_crews c on c.id=r.crew_id
    where r.profile_id=v_user and c.season_id=v_season and r.status='pending')>=3 then raise exception 'You have three pending roster requests'; end if;
  insert into public.commonwealth_join_requests(crew_id,profile_id,status)
    values(p_crew,v_user,'pending')
    on conflict(crew_id,profile_id) do update set status='pending',created_at=now(),decided_at=null
      where public.commonwealth_join_requests.status='declined'
    returning id into v_id;
  if v_id is null then raise exception 'Your request is already pending or approved'; end if;
  return v_id;
end $$;

create or replace function public.commonwealth_review_join(p_request uuid,p_approve boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_crew uuid; v_profile uuid; v_season uuid; v_status text;
begin
  select r.crew_id,r.profile_id,c.season_id,r.status
    into v_crew,v_profile,v_season,v_status
    from public.commonwealth_join_requests r join public.commonwealth_crews c on c.id=r.crew_id
    where r.id=p_request and c.captain_id=v_user for update of r;
  if v_crew is null then raise exception 'Only this crew captain can decide'; end if;
  if v_status <> 'pending' then raise exception 'Roster request already decided'; end if;
  if p_approve then
    perform 1 from public.commonwealth_crews c where c.id=v_crew for update;
    if (select count(*) from public.commonwealth_crew_members m where m.crew_id=v_crew)>=12 then raise exception 'Crew roster is full'; end if;
    if exists(select 1 from public.commonwealth_crew_members m where m.season_id=v_season and m.profile_id=v_profile) then raise exception 'Player already belongs to another crew'; end if;
    insert into public.commonwealth_crew_members(crew_id,season_id,profile_id,role) values(v_crew,v_season,v_profile,'player');
  end if;
  update public.commonwealth_join_requests set status=case when p_approve then 'approved' else 'declined' end, decided_at=now() where id=p_request;
  return true;
end $$;

create or replace function public.commonwealth_issue_challenge(
  p_opponent uuid,p_court_slug text,p_start timestamptz,p_format text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_home uuid; v_season uuid; v_id uuid;
begin
  select c.id,c.season_id into v_home,v_season from public.commonwealth_crews c
    join public.commonwealth_seasons s on s.id=c.season_id
    where c.captain_id=v_actor and s.slug='richmond-founding-2026' and s.status in ('enrollment','active');
  if v_home is null then raise exception 'Only a founding crew captain can challenge'; end if;
  if p_opponent=v_home or not exists(select 1 from public.commonwealth_crews c where c.id=p_opponent and c.season_id=v_season) then raise exception 'Choose a different crew this season'; end if;
  if p_format not in ('3v3','5v5') then raise exception 'Choose 3v3 or 5v5'; end if;
  if p_start is null or p_start<now()+interval '1 hour' or p_start>now()+interval '60 days' then raise exception 'Propose a time between one hour and 60 days from now'; end if;
  if not exists(select 1 from public.commonwealth_sites site where site.season_id=v_season and site.court_slug=p_court_slug) then raise exception 'Select a pilot competition court'; end if;
  if exists(select 1 from public.commonwealth_challenges ch
    where ch.challenger_id=v_home and ch.defender_id=p_opponent and ch.status in ('proposed','accepted','review') and ch.scheduled_at between p_start-interval '2 hours' and p_start+interval '2 hours') then raise exception 'An overlapping challenge already exists'; end if;
  insert into public.commonwealth_challenges(season_id,challenger_id,defender_id,court_slug,scheduled_at,format,created_by)
    values(v_season,v_home,p_opponent,p_court_slug,p_start,p_format,v_actor) returning id into v_id;
  return v_id;
end $$;

create or replace function public.commonwealth_respond_challenge(p_challenge uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  update public.commonwealth_challenges ch
    set status=case when p_accept then 'accepted' else 'declined' end,decided_at=now()
    from public.commonwealth_crews c
    where ch.id=p_challenge and ch.status='proposed' and ch.defender_id=c.id and c.captain_id=v_actor
      and ch.scheduled_at>now()
    returning true into p_accept;
  if not found then raise exception 'Only the invited captain may respond to an upcoming challenge'; end if;
  return true;
end $$;

create or replace function public.commonwealth_attach_run(p_challenge uuid,p_run uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_ch public.commonwealth_challenges%rowtype;
begin
  select * into v_ch from public.commonwealth_challenges where id=p_challenge for update;
  if v_ch.id is null or v_ch.status<>'accepted' then raise exception 'Challenge must be accepted first'; end if;
  if not exists(select 1 from public.commonwealth_crews c
    where c.id in (v_ch.challenger_id,v_ch.defender_id) and c.captain_id=v_actor) then raise exception 'Only captains can link a run'; end if;
  if not exists(select 1 from public.runs r
    where r.id=p_run and r.host_id=v_actor and r.run_type='competitive'
      and r.location_slug=v_ch.court_slug and r.status<>'cancelled'
      and r.starts_at between v_ch.scheduled_at-interval '24 hours' and v_ch.scheduled_at+interval '24 hours')
    then raise exception 'Link a competitive Run hosted by you at this court near challenge time'; end if;
  update public.commonwealth_challenges set run_id=p_run where id=p_challenge;
  return true;
end $$;

create or replace function public.commonwealth_submit_result(p_challenge uuid,p_home_score integer,p_away_score integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_ch public.commonwealth_challenges%rowtype; v_required integer;
begin
  select * into v_ch from public.commonwealth_challenges where id=p_challenge for update;
  if v_ch.id is null or v_ch.status not in ('accepted','rejected') then raise exception 'Challenge is not awaiting results'; end if;
  if v_ch.scheduled_at>now() or v_ch.scheduled_at<now()-interval '30 days' then raise exception 'Results are submitted after scheduled play, within 30 days'; end if;
  if not exists(select 1 from public.commonwealth_crews c where c.id in (v_ch.challenger_id,v_ch.defender_id) and c.captain_id=v_actor) then raise exception 'Only competing captains submit results'; end if;
  if p_home_score is null or p_away_score is null or p_home_score not between 0 and 200 or p_away_score not between 0 and 200 or p_home_score=p_away_score then raise exception 'Enter valid non-tied scores'; end if;
  if v_ch.run_id is null or not exists (select 1 from public.runs r where r.id=v_ch.run_id and r.run_type='competitive' and r.status<>'cancelled' and r.starts_at<=now()) then raise exception 'Link a real competitive Run before submitting results'; end if;
  v_required:=case when v_ch.format='3v3' then 3 else 5 end;
  if (select count(*) from public.commonwealth_crew_members m where m.crew_id=v_ch.challenger_id)<v_required
    or (select count(*) from public.commonwealth_crew_members m where m.crew_id=v_ch.defender_id)<v_required then raise exception 'Both crews must have enough rostered players for this format'; end if;
  update public.commonwealth_challenges set status='review',challenger_score=p_home_score,defender_score=p_away_score,
    submitted_by=v_actor,submitted_at=now(),reviewed_by=null,reviewed_at=null
    where id=p_challenge;
  return true;
end $$;

create or replace function public.commonwealth_review_result(p_challenge uuid,p_approve boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_ch public.commonwealth_challenges%rowtype;
begin
  if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then raise exception 'Only an authorized RCH reviewer may verify results'; end if;
  select * into v_ch from public.commonwealth_challenges where id=p_challenge for update;
  if v_ch.id is null or v_ch.status<>'review' or v_ch.submitted_by is null then raise exception 'No pending results to review'; end if;
  if v_actor=v_ch.submitted_by
    or exists(select 1 from public.commonwealth_crews c where c.id in (v_ch.challenger_id,v_ch.defender_id) and c.captain_id=v_actor)
    or exists(select 1 from public.commonwealth_crew_members m where m.crew_id in (v_ch.challenger_id,v_ch.defender_id) and m.profile_id=v_actor)
    then raise exception 'A participant cannot verify their own contest'; end if;
  update public.commonwealth_challenges set status=case when p_approve then 'verified' else 'rejected' end,
    reviewed_by=v_actor,reviewed_at=now() where id=p_challenge;
  return true;
end $$;

create or replace view public.commonwealth_standings with (security_invoker=true) as
select c.id,c.season_id,c.name,c.city,c.home_court_slug,c.created_at,
  count(g.id)::integer as games,
  count(g.id) filter (where (g.challenger_id=c.id and g.challenger_score>g.defender_score)
    or (g.defender_id=c.id and g.defender_score>g.challenger_score))::integer as wins,
  count(g.id) filter (where (g.challenger_id=c.id and g.challenger_score<g.defender_score)
    or (g.defender_id=c.id and g.defender_score<g.challenger_score))::integer as losses,
  (3*count(g.id) filter (where (g.challenger_id=c.id and g.challenger_score>g.defender_score)
    or (g.defender_id=c.id and g.defender_score>g.challenger_score)))::integer as points,
  coalesce(sum(case when g.challenger_id=c.id then g.challenger_score else g.defender_score end),0)::integer as points_for,
  coalesce(sum(case when g.challenger_id=c.id then g.defender_score else g.challenger_score end),0)::integer as points_against
from public.commonwealth_crews c
left join public.commonwealth_challenges g on g.status='verified' and (g.challenger_id=c.id or g.defender_id=c.id)
group by c.id,c.season_id,c.name,c.city,c.home_court_slug,c.created_at;
revoke all on public.commonwealth_standings from public,anon,authenticated;
grant select on public.commonwealth_standings to anon,authenticated;

revoke all on function public.commonwealth_found_crew(text,text,text) from public,anon,authenticated;
revoke all on function public.commonwealth_request_to_join(uuid) from public,anon,authenticated;
revoke all on function public.commonwealth_review_join(uuid,boolean) from public,anon,authenticated;
revoke all on function public.commonwealth_issue_challenge(uuid,text,timestamptz,text) from public,anon,authenticated;
revoke all on function public.commonwealth_respond_challenge(uuid,boolean) from public,anon,authenticated;
revoke all on function public.commonwealth_attach_run(uuid,uuid) from public,anon,authenticated;
revoke all on function public.commonwealth_submit_result(uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.commonwealth_review_result(uuid,boolean) from public,anon,authenticated;
grant execute on function public.commonwealth_found_crew(text,text,text),
  public.commonwealth_request_to_join(uuid),public.commonwealth_review_join(uuid,boolean),
  public.commonwealth_issue_challenge(uuid,text,timestamptz,text),
  public.commonwealth_respond_challenge(uuid,boolean),public.commonwealth_attach_run(uuid,uuid),
  public.commonwealth_submit_result(uuid,integer,integer),public.commonwealth_review_result(uuid,boolean)
  to authenticated;

comment on table public.commonwealth_challenges is
  'Only RCH-reviewed, run-linked and sufficiently rostered games count toward Commonwealth Cup rankings; competition points never grant REP.';
commit;