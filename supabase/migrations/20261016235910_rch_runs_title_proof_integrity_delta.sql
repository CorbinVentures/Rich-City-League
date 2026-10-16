begin;
-- Reconciles preview databases which already recorded the older 20261016235900
-- migration revision. Also safe to execute after the current fresh-install version.
alter table public.rch_run_title_attestations
 add column if not exists home_crew_id uuid references public.commonwealth_crews(id) on delete restrict,
 add column if not exists away_crew_id uuid references public.commonwealth_crews(id) on delete restrict,
 add column if not exists home_score integer,
 add column if not exists away_score integer;

-- Never retroactively bless evidence that was not bound to the actual match.
do $$ begin
 if exists(select 1 from public.rch_run_title_attestations a
    where a.home_crew_id is null or a.away_crew_id is null
      or a.home_score is null or a.away_score is null) then
  raise exception 'Manual review required for title attestations created before exact-score certification';
 end if;
end $$;

alter table public.rch_run_title_attestations
 alter column home_crew_id set not null,
 alter column away_crew_id set not null,
 alter column home_score set not null,
 alter column away_score set not null;

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
    or exists(select 1 from public.commonwealth_crews cr
      where cr.id in (v_home_crew,v_away_crew) and cr.captain_id=v_actor)
 then raise exception 'An official may not belong to or captain either competing crew'; end if;
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
            where cm.profile_id=att.official_id and cm.crew_id in (v_home,v_away))
          and not exists(select 1 from public.commonwealth_crews cr
            where cr.id in (v_home,v_away) and cr.captain_id=att.official_id))
   then raise exception 'Takeover title result requires current independent official evidence for the exact crews and score'; end if;
 end if;
 return new;
end $$;

create or replace function public.rch_guard_run_crew_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 v_id:=case when tg_op='DELETE' then old.run_team_id else new.run_team_id end;
 if exists(select 1 from public.run_ranked_matches m where m.status in ('pending','verified')
    and (m.home_team_id=v_id or m.away_team_id=v_id)) then
    raise exception 'Crew lineup is locked after a ranked match is submitted';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;

drop trigger if exists rch_before_verified_title_integrity on public.run_ranked_matches;
create trigger rch_before_verified_title_integrity
 before update of status on public.run_ranked_matches for each row
 execute function public.rch_guard_verified_title_integrity();

drop trigger if exists rch_guard_crew_assignment on public.rch_run_crew_teams;
create trigger rch_guard_crew_assignment
 before insert or update or delete on public.rch_run_crew_teams for each row
 execute function public.rch_guard_run_crew_assignment();

revoke all on function public.rch_guard_run_crew_assignment() from public,anon,authenticated;
revoke all on function public.rch_manage_run_operator(uuid,uuid,text,boolean),
 public.rch_certify_ranked_title_match(uuid,text),
 public.rch_guard_verified_title_integrity() from public,anon,authenticated;
grant execute on function public.rch_manage_run_operator(uuid,uuid,text,boolean),
 public.rch_certify_ranked_title_match(uuid,text) to authenticated;
commit;
