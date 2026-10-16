begin;

-- Runs remains a separate competition domain; these tables extend its existing
-- verified-match, court, crew and territory records without awarding historical results.
create table if not exists public.rch_run_operators (
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('cohost','scorekeeper','official')),
  appointed_by uuid not null references public.profiles(id),
  appointed_at timestamptz not null default now(),
  primary key(run_id,profile_id)
);
create index if not exists rch_run_operators_profile_idx on public.rch_run_operators(profile_id,role,run_id);

create table if not exists public.rch_run_operations (
  run_id uuid not null references public.runs(id) on delete cascade,
  task_code text not null check (task_code in (
    'venue_confirmed','rules_briefed','teams_assigned','official_assigned',
    'safety_reviewed','scores_reconciled','postgame_complete'
  )),
  completed boolean not null default false,
  note text not null default '' check (length(note)<=300),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key(run_id,task_code)
);

create table if not exists public.rch_run_ops_audit (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  event_name text not null check (event_name in ('operator_appointed','operator_removed','readiness_updated','title_attested')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rch_run_ops_audit_run_idx on public.rch_run_ops_audit(run_id,created_at desc);

create table if not exists public.rch_run_title_attestations (
  match_id uuid primary key references public.run_ranked_matches(id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete restrict,
  official_id uuid not null references public.profiles(id) on delete restrict,
  home_crew_id uuid not null references public.commonwealth_crews(id) on delete restrict,
  away_crew_id uuid not null references public.commonwealth_crews(id) on delete restrict,
  home_score integer not null,
  away_score integer not null,
  note text not null default '' check (length(note)<=300),
  attested_at timestamptz not null default now()
);
create index if not exists rch_run_title_attestations_run_idx on public.rch_run_title_attestations(run_id);

alter table public.rch_run_operators enable row level security;
alter table public.rch_run_operations enable row level security;
alter table public.rch_run_ops_audit enable row level security;
alter table public.rch_run_title_attestations enable row level security;
revoke all on public.rch_run_operators,public.rch_run_operations,
  public.rch_run_ops_audit,public.rch_run_title_attestations from public,anon,authenticated;
grant select on public.rch_run_operators,public.rch_run_operations,
  public.rch_run_ops_audit,public.rch_run_title_attestations to authenticated;

create policy rch_ops_operator_read on public.rch_run_operators for select to authenticated
  using (profile_id=(select auth.uid())
    or exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
    or coalesce(public.is_staff_or_admin(),false));

-- Let appointed officials see pending game evidence without granting global access.
create policy rch_ranked_appointed_official_read on public.run_ranked_matches for select to authenticated
  using (exists(select 1 from public.rch_run_operators o where o.run_id=run_ranked_matches.run_id
    and o.profile_id=(select auth.uid()) and o.role='official'));

create policy rch_ops_task_read on public.rch_run_operations for select to authenticated
  using (exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
    or exists(select 1 from public.rch_run_operators o where o.run_id=rch_run_operations.run_id and o.profile_id=(select auth.uid()))
    or coalesce(public.is_staff_or_admin(),false));

create policy rch_ops_audit_read on public.rch_run_ops_audit for select to authenticated
  using (exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
    or coalesce(public.is_staff_or_admin(),false));

create policy rch_ops_attestation_read on public.rch_run_title_attestations for select to authenticated
  using (official_id=(select auth.uid()) or coalesce(public.is_staff_or_admin(),false)
    or exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
    or exists(select 1 from public.run_ranked_matches m where m.id=match_id
      and ((select auth.uid())=any(m.home_roster) or (select auth.uid())=any(m.away_roster))));

create or replace function public.rch_manage_run_operator(
  p_run uuid,p_profile uuid,p_role text,p_enable boolean default true
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_host uuid;
begin
 if v_actor is null then raise exception 'Sign in to manage run operations'; end if;
 select host_id into v_host from public.runs where id=p_run for update;
 if v_host is null then raise exception 'Run not found'; end if;
 if v_actor<>v_host and not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only the run host or RCH staff can appoint officials'; end if;
 if p_profile=v_host then raise exception 'The host already has organizer access'; end if;
 if p_role not in ('cohost','scorekeeper','official') then raise exception 'Invalid run operator role'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_profile and p.is_active and not coalesce(p.is_system_account,false))
 then raise exception 'Choose an active member profile'; end if;
 if p_enable then
  insert into public.rch_run_operators(run_id,profile_id,role,appointed_by)
    values(p_run,p_profile,p_role,v_actor)
    on conflict(run_id,profile_id) do update
       set role=excluded.role,appointed_by=excluded.appointed_by,appointed_at=now();
 else
  delete from public.rch_run_operators where run_id=p_run and profile_id=p_profile;
 end if;
 if not p_enable and p_role='official' and not exists (
    select 1 from public.rch_run_operators where run_id=p_run and role='official'
 ) then
    update public.rch_run_operations set completed=false,updated_by=v_actor,updated_at=now()
      where run_id=p_run and task_code='official_assigned';
 end if;
 insert into public.rch_run_ops_audit(run_id,actor_id,event_name,details)
   values(p_run,v_actor,case when p_enable then 'operator_appointed' else 'operator_removed' end,
     pg_catalog.jsonb_build_object('profile_id',p_profile,'role',p_role));
end $$;

create or replace function public.rch_set_run_operation(
 p_run uuid,p_task text,p_complete boolean,p_note text default ''
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Sign in to update run readiness'; end if;
 if not (
   exists(select 1 from public.runs r where r.id=p_run and r.host_id=v_actor)
   or exists(select 1 from public.rch_run_operators o where o.run_id=p_run and o.profile_id=v_actor)
   or coalesce(public.is_staff_or_admin(),false)
 ) then raise exception 'No assigned run operations role'; end if;
 if p_task not in ('venue_confirmed','rules_briefed','teams_assigned','official_assigned',
   'safety_reviewed','scores_reconciled','postgame_complete') then raise exception 'Unknown readiness task'; end if;
 if length(coalesce(p_note,''))>300 then raise exception 'Keep run notes under 300 characters'; end if;
 if p_task='official_assigned' and p_complete and not exists (
    select 1 from public.rch_run_operators o where o.run_id=p_run and o.role='official'
 ) then raise exception 'Appoint an independent official first'; end if;
 if p_task='teams_assigned' and p_complete and
   (select count(*) from public.run_teams t where t.run_id=p_run)<2
 then raise exception 'Create two teams before marking teams ready'; end if;
 insert into public.rch_run_operations(run_id,task_code,completed,note,updated_by)
 values(p_run,p_task,coalesce(p_complete,false),coalesce(p_note,''),v_actor)
 on conflict(run_id,task_code) do update
   set completed=excluded.completed,note=excluded.note,updated_by=excluded.updated_by,updated_at=now();
 insert into public.rch_run_ops_audit(run_id,actor_id,event_name,details)
 values(p_run,v_actor,'readiness_updated',pg_catalog.jsonb_build_object('task',p_task,'completed',p_complete));
end $$;

-- Championship officials are distinct from competitors and must not be a
-- member of either participating crew (including a non-playing captain).
create or replace function public.rch_certify_ranked_title_match(
 p_match uuid,p_note text default ''
) returns void language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();m public.run_ranked_matches%rowtype;
 v_home_crew uuid;v_away_crew uuid;
begin
 if v_actor is null then raise exception 'Sign in as an independent official'; end if;
 select * into m from public.run_ranked_matches where id=p_match for update;
 if m.id is null or m.status<>'pending' then raise exception 'Only a pending match can be certified'; end if;
 if v_actor=m.submitted_by or v_actor=any(m.home_roster) or v_actor=any(m.away_roster)
 then raise exception 'Players and the submitter cannot certify their match'; end if;
 if not (coalesce(public.is_staff_or_admin(),false)
    or exists(select 1 from public.rch_run_operators o
      where o.run_id=m.run_id and o.profile_id=v_actor and o.role='official'))
 then raise exception 'RCH staff or an appointed independent official is required'; end if;
 select h.crew_id,a.crew_id into v_home_crew,v_away_crew
  from public.rch_run_crew_teams h
  join public.rch_run_crew_teams a on a.run_id=h.run_id and a.run_team_id=m.away_team_id
  where h.run_id=m.run_id and h.run_team_id=m.home_team_id;
 if v_home_crew is null or v_away_crew is null or v_home_crew=v_away_crew then
    raise exception 'Both independent crews must be attached to the match'; end if;
 if exists(select 1 from public.commonwealth_crew_members cm
      where cm.profile_id=v_actor and cm.crew_id in (v_home_crew,v_away_crew))
 then raise exception 'An official may not belong to either competing crew'; end if;
 if not exists(select 1 from public.rch_court_takeovers c
      where c.run_id=m.run_id and c.status='accepted'
      and c.accepted_at<=m.submitted_at
      and ((c.challenger_crew_id=v_home_crew and c.defender_crew_id=v_away_crew)
        or (c.challenger_crew_id=v_away_crew and c.defender_crew_id=v_home_crew)))
 then raise exception 'No accepted Takeover is attached to this match'; end if;
 if length(coalesce(p_note,''))>300 then raise exception 'Keep official notes under 300 characters'; end if;
 insert into public.rch_run_title_attestations(
   match_id,run_id,official_id,home_crew_id,away_crew_id,home_score,away_score,note
 )
 values(m.id,m.run_id,v_actor,v_home_crew,v_away_crew,m.home_score,m.away_score,coalesce(p_note,''))
 on conflict(match_id) do nothing;
 insert into public.rch_run_ops_audit(run_id,actor_id,event_name,details)
 values(m.run_id,v_actor,'title_attested',pg_catalog.jsonb_build_object('match_id',m.id));
end $$;

-- This is a defensive backstop: match verification and resulting territory
-- transfers fail in the SAME transaction if the required referee proof is absent.
create or replace function public.rch_guard_verified_title_integrity()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_home uuid;v_away uuid;
begin
 if old.status='rejected' and new.status='pending' then
   delete from public.rch_run_title_attestations where match_id=new.id;
 end if;
 if new.status='rejected' and old.status is distinct from 'rejected' then
   delete from public.rch_run_title_attestations where match_id=new.id;
 end if;
 if new.status='verified' and old.status is distinct from 'verified' then
   if (select count(*) from public.run_ranked_matches other
       where other.status='verified' and other.game_format=new.game_format
         and other.verified_at>now()-interval '7 days'
         and ( (other.home_roster=new.home_roster and other.away_roster=new.away_roster)
            or (other.home_roster=new.away_roster and other.away_roster=new.home_roster)))>=8
   then raise exception 'Repeated match limit: these same rosters have eight rated games this week'; end if;
   select h.crew_id,a.crew_id into v_home,v_away
     from public.rch_run_crew_teams h
     join public.rch_run_crew_teams a on a.run_id=h.run_id and a.run_team_id=new.away_team_id
     where h.run_id=new.run_id and h.run_team_id=new.home_team_id;
   if exists(select 1 from public.rch_court_takeovers c where c.run_id=new.run_id
      and c.status='accepted' and c.accepted_at<=new.submitted_at
      and ((c.challenger_crew_id=v_home and c.defender_crew_id=v_away)
        or (c.challenger_crew_id=v_away and c.defender_crew_id=v_home)))
      and not exists(select 1 from public.rch_run_title_attestations att
        where att.match_id=new.id and att.home_crew_id=v_home and att.away_crew_id=v_away
          and att.home_score=new.home_score and att.away_score=new.away_score
          and not exists(select 1 from public.commonwealth_crew_members cm
            where cm.profile_id=att.official_id and cm.crew_id in (v_home,v_away)))
   then raise exception 'Takeover title result requires current independent official evidence for the exact crews and score'; end if;
 end if;
 return new;
end $$;
drop trigger if exists rch_before_verified_title_integrity on public.run_ranked_matches;
create trigger rch_before_verified_title_integrity
before update of status on public.run_ranked_matches
for each row execute function public.rch_guard_verified_title_integrity();

-- Never allow a host to rewrite verified crew opponents after ranked submission.
-- This also prevents retroactively declaring a previously completed generic match a crew match.
create or replace function public.rch_guard_run_crew_assignment()
returns trigger language plpgsql security definer set search_path='' as $
declare v_id uuid;
begin
 v_id:=case when tg_op='DELETE' then old.run_team_id else new.run_team_id end;
 if exists(select 1 from public.run_ranked_matches m where m.status in ('pending','verified')
    and (m.home_team_id=v_id or m.away_team_id=v_id)) then
    raise exception 'Crew lineup is locked after a ranked match is submitted';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $;
drop trigger if exists rch_guard_crew_assignment on public.rch_run_crew_teams;
create trigger rch_guard_crew_assignment
before insert or update or delete on public.rch_run_crew_teams
for each row execute function public.rch_guard_run_crew_assignment();

revoke all on function public.rch_guard_run_crew_assignment() from public,anon,authenticated;
revoke all on function public.rch_manage_run_operator(uuid,uuid,text,boolean),
 public.rch_set_run_operation(uuid,text,boolean,text),
 public.rch_certify_ranked_title_match(uuid,text),
 public.rch_guard_verified_title_integrity() from public,anon,authenticated;
grant execute on function public.rch_manage_run_operator(uuid,uuid,text,boolean),
 public.rch_set_run_operation(uuid,text,boolean,text),
 public.rch_certify_ranked_title_match(uuid,text) to authenticated;

comment on table public.rch_run_title_attestations is
 'Independent certification required for accepted crew Takeovers; never created by an unverified player score.';
commit;
