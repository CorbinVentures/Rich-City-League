begin;

-- RUNS STATEWIDE OS: fair session queuing, traceable integrity cases,
-- private player progress and authorized statewide operations analytics.
-- Social REP, Runs skill and Commonwealth Cup qualification remain separate.

create table public.rch_run_queue (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting'
    check(status in ('waiting','called','playing','completed','left','no_show')),
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  changed_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create unique index rch_run_queue_one_active_member on public.rch_run_queue(run_id,profile_id)
  where status in ('waiting','called','playing');
create index rch_run_queue_next_idx on public.rch_run_queue(run_id,status,joined_at,id);
create index rch_run_queue_member_idx on public.rch_run_queue(profile_id,joined_at desc);

create table public.rch_run_result_cases (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.run_ranked_matches(id) on delete restrict,
  run_id uuid not null references public.runs(id) on delete restrict,
  submitted_by uuid not null references public.profiles(id),
  reason text not null check(reason in ('incorrect_score','ineligible_player','suspected_fraud','conduct','other')),
  details text not null check(char_length(details) between 15 and 1800),
  status text not null default 'open'
    check(status in ('open','under_review','dismissed','correction_requested','escalated')),
  reviewed_by uuid references public.profiles(id),
  resolution_notes text check(resolution_notes is null or char_length(resolution_notes)<=1600),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index rch_run_cases_one_active_match on public.rch_run_result_cases(match_id)
  where status in ('open','under_review');
create index rch_run_cases_ops_idx on public.rch_run_result_cases(status,created_at desc);
create index rch_run_cases_member_idx on public.rch_run_result_cases(submitted_by,created_at desc);

alter table public.rch_run_queue enable row level security;
alter table public.rch_run_result_cases enable row level security;
revoke all on public.rch_run_queue,public.rch_run_result_cases from public,anon,authenticated;
grant select on public.rch_run_queue,public.rch_run_result_cases to authenticated;

create policy rch_queue_run_members_read on public.rch_run_queue for select to authenticated
 using (profile_id=(select auth.uid())
   or exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
   or exists(select 1 from public.run_players rp where rp.run_id=rch_run_queue.run_id and rp.profile_id=(select auth.uid()))
   or exists(select 1 from public.run_checkins ck where ck.run_id=rch_run_queue.run_id and ck.profile_id=(select auth.uid()))
   or exists(select 1 from public.rch_run_operators ro where ro.run_id=rch_run_queue.run_id and ro.profile_id=(select auth.uid()))
   or coalesce(public.is_staff_or_admin(),false));

create policy rch_cases_appropriate_reader on public.rch_run_result_cases for select to authenticated
 using (submitted_by=(select auth.uid()) or reviewed_by=(select auth.uid())
   or exists(select 1 from public.runs r where r.id=run_id and r.host_id=(select auth.uid()))
   or coalesce(public.is_staff_or_admin(),false));

create or replace function public.rch_join_run_queue(p_run uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_run public.runs%rowtype;v_existing uuid;v_latest timestamptz;v_result uuid;
begin
 if v_actor is null then raise exception 'Sign in to join the Next Up queue'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_run::text),79531);
 select * into v_run from public.runs where id=p_run;
 if v_run.id is null or v_run.status not in ('open','full')
   or v_run.starts_at<now()-interval '6 hours' or v_run.starts_at>now()+interval '7 days'
 then raise exception 'This Run is not accepting Next Up entries'; end if;
 if not (v_run.host_id=v_actor
    or exists(select 1 from public.run_players rp where rp.run_id=p_run and rp.profile_id=v_actor)
    or exists(select 1 from public.run_checkins ck where ck.run_id=p_run and ck.profile_id=v_actor))
 then raise exception 'Join or check in to the Run before entering Next Up'; end if;
 select q.id into v_existing from public.rch_run_queue q where q.run_id=p_run
   and q.profile_id=v_actor and q.status in ('waiting','called','playing') limit 1;
 if v_existing is not null then return v_existing; end if;
 select max(joined_at) into v_latest from public.rch_run_queue
   where run_id=p_run and profile_id=v_actor;
 if v_latest>now()-interval '5 minutes' then
   raise exception 'You can rejoin the queue five minutes after leaving'; end if;
 if (select count(*) from public.rch_run_queue where run_id=p_run and status in ('waiting','called','playing'))>=100
 then raise exception 'Next Up is temporarily at maximum queue capacity'; end if;
 insert into public.rch_run_queue(run_id,profile_id,changed_by)
 values(p_run,v_actor,v_actor) returning id into v_result;
 return v_result;
end $$;

create or replace function public.rch_leave_run_queue(p_entry uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_entry public.rch_run_queue%rowtype;
begin
 if v_actor is null then raise exception 'Sign in to leave Next Up'; end if;
 select * into v_entry from public.rch_run_queue where id=p_entry for update;
 if v_entry.id is null or v_entry.profile_id<>v_actor then raise exception 'Not your queue entry'; end if;
 if v_entry.status not in ('waiting','called') then raise exception 'A game in progress must be ended by the Run host'; end if;
 update public.rch_run_queue
  set status='left',changed_by=v_actor,updated_at=now(),completed_at=now()
 where id=p_entry;
end $$;

create or replace function public.rch_manage_run_queue(p_entry uuid,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();q public.rch_run_queue%rowtype;
begin
 if v_actor is null then raise exception 'Sign in as a Run organizer'; end if;
 select * into q from public.rch_run_queue where id=p_entry for update;
 if q.id is null then raise exception 'Queue entry not found'; end if;
 if not (exists(select 1 from public.runs r where r.id=q.run_id and r.host_id=v_actor)
   or exists(select 1 from public.rch_run_operators o where o.run_id=q.run_id
      and o.profile_id=v_actor and o.role in ('cohost','scorekeeper'))
   or coalesce(public.is_staff_or_admin(),false))
 then raise exception 'Only the Run organizer can advance Next Up'; end if;
 if not (
   (q.status='waiting' and p_action in ('called','no_show'))
   or (q.status='called' and p_action in ('playing','waiting','no_show'))
   or (q.status='playing' and p_action='completed')
 ) then raise exception 'Invalid Next Up state transition'; end if;
 update public.rch_run_queue set status=p_action,changed_by=v_actor,updated_at=now(),
   called_at=case when p_action='called' then now() else called_at end,
   completed_at=case when p_action in ('completed','no_show') then now() else null end
 where id=p_entry;
end $$;

create or replace function public.rch_file_run_result_case(
 p_match uuid,p_reason text,p_details text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();m public.run_ranked_matches%rowtype;v_host uuid;v_result uuid;
begin
 if v_actor is null then raise exception 'Sign in to dispute a Run result'; end if;
 if p_reason not in ('incorrect_score','ineligible_player','suspected_fraud','conduct','other')
    or char_length(trim(coalesce(p_details,''))) not between 15 and 1800
 then raise exception 'Choose a reason and describe the issue in 15 to 1800 characters'; end if;
 select * into m from public.run_ranked_matches where id=p_match for update;
 if m.id is null then raise exception 'Ranked match not found'; end if;
 select r.host_id into v_host from public.runs r where r.id=m.run_id;
 if v_actor<>v_host and v_actor<>all(m.home_roster) and v_actor<>all(m.away_roster)
 then raise exception 'Only the host or an involved competitor can dispute this result'; end if;
 if m.submitted_at<now()-interval '14 days' then
   raise exception 'The standard appeal window is 14 days; contact RCH staff for older results'; end if;
 if exists(select 1 from public.rch_run_result_cases c
    where c.match_id=p_match and c.status in ('open','under_review'))
 then raise exception 'This result already has an active integrity case'; end if;
 insert into public.rch_run_result_cases(match_id,run_id,submitted_by,reason,details)
 values(p_match,m.run_id,v_actor,p_reason,trim(p_details)) returning id into v_result;
 return v_result;
end $$;

create or replace function public.rch_review_run_result_case(
 p_case uuid,p_decision text,p_notes text
) returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();c public.rch_run_result_cases%rowtype;v_status text;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only authorized RCH staff can adjudicate match disputes'; end if;
 if p_decision not in ('under_review','dismissed','correction_requested','escalated')
   or char_length(trim(coalesce(p_notes,''))) not between 8 and 1600
 then raise exception 'Choose an adjudication and provide review notes'; end if;
 select * into c from public.rch_run_result_cases where id=p_case for update;
 if c.id is null or c.status not in ('open','under_review') then
   raise exception 'Only open or in-review cases may be adjudicated'; end if;
 select m.status into v_status from public.run_ranked_matches m where m.id=c.match_id for update;
 if p_decision='correction_requested' then
   if v_status='verified' then
     raise exception 'Verified ratings are immutable: escalate for audited correction, never silently rewrite rating history';
   end if;
   update public.run_ranked_matches set status='rejected',rejected_at=now()
     where id=c.match_id and status='pending';
 end if;
 update public.rch_run_result_cases set status=p_decision,resolution_notes=trim(p_notes),
   reviewed_by=v_actor,reviewed_at=now() where id=p_case;
end $$;

-- Player-only basketball passport: social REP is not conflated with skill.
create or replace function public.get_rch_run_passport()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_result jsonb;
begin
 if v_actor is null then raise exception 'Sign in to view your Run Passport'; end if;
 select pg_catalog.jsonb_build_object(
   'ratings',coalesce((select jsonb_agg(to_jsonb(r) order by r.game_format)
     from (select game_format,rating,games,wins,losses,(games<5) as provisional
       from public.run_competitive_ratings where profile_id=v_actor) r),'[]'::jsonb),
   'run_rep',coalesce((select sum(rep) from public.rch_run_rep_events where profile_id=v_actor),0),
   'verified_games',(select count(*) from public.run_ranked_match_players mp
     join public.run_ranked_matches m on m.id=mp.match_id and m.status='verified'
     where mp.profile_id=v_actor),
   'badges',coalesce((select jsonb_agg(b.badge_code order by b.awarded_at)
      from public.rch_run_badge_awards b where b.profile_id=v_actor),'[]'::jsonb),
   'last_results',coalesce((select jsonb_agg(to_jsonb(h) order by h.verified_at desc)
     from (select m.id,m.game_format,m.verified_at,r.court_name,
         mp.rating_before,mp.rating_after,
         case when (mp.side='home' and m.home_score>m.away_score)
           or (mp.side='away' and m.away_score>m.home_score) then true else false end as won
       from public.run_ranked_match_players mp
       join public.run_ranked_matches m on m.id=mp.match_id and m.status='verified'
       join public.runs r on r.id=m.run_id
       where mp.profile_id=v_actor order by m.verified_at desc limit 12) h),'[]'::jsonb),
   'open_appeals',(select count(*) from public.rch_run_result_cases
      where submitted_by=v_actor and status in ('open','under_review'))
 ) into v_result;
 return v_result;
end $$;

-- Admin-only operational aggregate: no raw GPS, private contact info, or names.
create or replace function public.get_rch_runs_intelligence(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_since timestamptz;v_result jsonb;
begin
 if v_actor is null or not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Runs statewide intelligence is restricted to authorized RCH staff'; end if;
 if p_days not in (7,30,90) then raise exception 'Choose a 7, 30 or 90 day period'; end if;
 v_since:=now()-pg_catalog.make_interval(days=>p_days);
 select pg_catalog.jsonb_build_object(
  'days',p_days,
  'scheduled_runs',(select count(*) from public.runs r where r.starts_at>=v_since and r.starts_at<=now()+interval '7 days'),
  'active_hosts',(select count(distinct r.host_id) from public.runs r where r.starts_at>=v_since),
  'verified_matches',(select count(*) from public.run_ranked_matches m where m.status='verified' and m.verified_at>=v_since),
  'verified_players',(select count(distinct mp.profile_id) from public.run_ranked_match_players mp
     join public.run_ranked_matches m on m.id=mp.match_id and m.status='verified' where m.verified_at>=v_since),
  'pending_results',(select count(*) from public.run_ranked_matches m where m.status='pending'),
  'open_cases',(select count(*) from public.rch_run_result_cases c where c.status in ('open','under_review')),
  'active_queue_entries',(select count(*) from public.rch_run_queue q where q.status in ('waiting','called','playing')),
  'claimed_crew_territories',(select count(*) from public.rch_court_territories),
  'courts_with_verified_games',(select count(distinct r.location_slug)
     from public.run_ranked_matches m join public.runs r on r.id=m.run_id
     where m.status='verified' and m.verified_at>=v_since and r.location_slug is not null),
  'regional_activity',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.verified_games desc,x.region)
    from (select coalesce(l.region,'Unmapped') as region,
      count(*) filter(where m.status='verified')::bigint as verified_games,
      count(distinct r.id)::bigint as scheduled_sessions
      from public.runs r left join public.basketball_locations l on l.slug=r.location_slug
      left join public.run_ranked_matches m on m.run_id=r.id and m.verified_at>=v_since
      where r.starts_at>=v_since group by coalesce(l.region,'Unmapped')
      order by verified_games desc,region limit 12) x
  ),'[]'::jsonb)
 ) into v_result;
 return v_result;
end $$;

revoke all on function public.rch_join_run_queue(uuid),
 public.rch_leave_run_queue(uuid),public.rch_manage_run_queue(uuid,text),
 public.rch_file_run_result_case(uuid,text,text),
 public.rch_review_run_result_case(uuid,text,text),
 public.get_rch_run_passport(),public.get_rch_runs_intelligence(integer)
 from public,anon,authenticated;
grant execute on function public.rch_join_run_queue(uuid),
 public.rch_leave_run_queue(uuid),public.rch_manage_run_queue(uuid,text),
 public.rch_file_run_result_case(uuid,text,text),
 public.rch_review_run_result_case(uuid,text,text),
 public.get_rch_run_passport(),public.get_rch_runs_intelligence(integer)
 to authenticated;
commit;
