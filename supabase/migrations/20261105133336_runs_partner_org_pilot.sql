begin;

-- Organization approval is a separate trust decision from Verified Host and
-- Verified Run status. Approved partners may publish ordinary Runs; no event,
-- score or venue receives a Verified Run badge through this path.
alter table public.rch_runs_partners
  add column reward_multiplier smallint not null default 1
    check (reward_multiplier in (1,2));
alter table public.rch_runs_partner_sessions
  add column reward_multiplier smallint not null default 1
    check (reward_multiplier in (1,2));

drop policy if exists rch_partner_public_or_owner_read on public.rch_runs_partners;
create policy rch_partner_public_or_owner_read on public.rch_runs_partners
 for select to anon,authenticated using (
  status='approved'
  or owner_id=(select auth.uid())
  or coalesce(public.is_staff_or_admin(),false)
 );

drop policy if exists rch_partner_sessions_scoped_read on public.rch_runs_partner_sessions;
create policy rch_partner_sessions_scoped_read on public.rch_runs_partner_sessions
 for select to anon,authenticated using (
  exists (select 1 from public.rch_runs_partners p
    where p.id=partner_id and (
      p.status='approved'
      or p.owner_id=(select auth.uid())
      or coalesce(public.is_staff_or_admin(),false)))
 );

drop function if exists public.rch_review_runs_partner(uuid,text,text);
create function public.rch_review_runs_partner(
 p_partner uuid,p_decision text,p_note text,p_reward_multiplier smallint default 1
) returns void language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();p public.rch_runs_partners%rowtype;
begin
 if a is null or not coalesce(public.is_staff_or_admin(),false)
 then raise exception 'RCH operations staff only'; end if;
 if p_decision not in ('approved','declined','suspended')
    or char_length(trim(coalesce(p_note,''))) not between 8 and 500
    or p_reward_multiplier not in (1,2)
 then raise exception 'Choose a valid decision, review note and 1x or 2x reward multiplier'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null then raise exception 'Partner not found'; end if;
 if p.owner_id=a then raise exception 'You cannot approve your own organization'; end if;
 update public.rch_runs_partners
 set status=p_decision,
     reward_multiplier=case when p_decision='approved' then p_reward_multiplier else 1 end,
     review_note=trim(p_note),reviewed_by=a,reviewed_at=now(),updated_at=now()
 where id=p_partner;
end $$;

-- Each partner event snapshots the organization-approved reward multiplier.
-- Competitive reward rows still require the existing independent confirmation
-- and stat review pipeline; check-ins and highlights are not multiplied.
create or replace function public.rch_is_partner_reward_eligible(p_run uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.rch_runs_partner_sessions s
  join public.rch_runs_partners p on p.id=s.partner_id
  join public.runs r on r.id=s.run_id
  where s.run_id=p_run and s.reward_multiplier=2
    and p.status='approved' and r.run_type='competitive' and r.status<>'cancelled'
 );
$$;

create or replace function public.rch_create_runs_partner_session(
 p_partner uuid,p_title text,p_location text,p_starts timestamptz,
 p_format text,p_experience text,p_capacity integer,p_price_cents integer,
 p_description text,p_court_slug text
) returns uuid language plpgsql security definer set search_path='' as $$
declare a uuid:=auth.uid();p public.rch_runs_partners%rowtype;
 v_court text;v_run uuid;
begin
 if a is null then raise exception 'Sign in to schedule a Run'; end if;
 select * into p from public.rch_runs_partners where id=p_partner for update;
 if p.id is null or p.status<>'approved'
   or not (p.owner_id=a or exists(select 1 from public.rch_runs_partner_members m
       where m.partner_id=p_partner and m.profile_id=a and m.role='manager'))
 then raise exception 'Approved Runs partner manager access required'; end if;
 if char_length(trim(coalesce(p_title,''))) not between 5 and 120
    or char_length(trim(coalesce(p_location,''))) not between 5 and 300
    or char_length(trim(coalesce(p_description,'')))>1600
    or p_starts is null or p_starts<now()+interval '10 minutes'
    or p_starts>now()+interval '180 days'
    or p_format not in ('1v1','2v2','3v3','4v4','5v5')
    or p_experience not in ('park','rec')
    or p_capacity not between 2 and 50
    or p_price_cents not between 0 and 50000
 then raise exception 'Check the title, location, future date, format, capacity and price'; end if;
 if nullif(trim(coalesce(p_court_slug,'')),'') is not null then
  select name into v_court from public.basketball_locations
   where slug=p_court_slug and is_active;
  if v_court is null then raise exception 'Choose an active mapped court or leave it unlinked'; end if;
 end if;
 insert into public.runs(host_id,title,description,run_type,skill_level,court_name,
  location,starts_at,capacity,max_players,status,game_format,location_slug,allow_fan_checkin)
 values(p.owner_id,trim(p_title),nullif(trim(coalesce(p_description,'')),''),
  'competitive','all',coalesce(v_court,left(trim(p_location),160)),
  trim(p_location),p_starts,p_capacity,p_capacity,'open',p_format,
  nullif(trim(coalesce(p_court_slug,'')),''),true)
 returning id into v_run;
 insert into public.rch_runs_partner_sessions(run_id,partner_id,experience,price_cents,created_by,reward_multiplier)
 values(v_run,p_partner,p_experience,p_price_cents,a,p.reward_multiplier);
 if a<>p.owner_id then
  insert into public.rch_run_operators(run_id,profile_id,role,appointed_by)
  values(v_run,a,'cohost',p.owner_id);
 end if;
 return v_run;
end $$;

create or replace function public.rch_issue_run_checkin_code(p_run uuid)
returns text language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_run public.runs%rowtype;
 v_code text;
 v_salt text;
begin
 if v_actor is null then raise exception 'Sign in as the event host'; end if;
 select * into v_run from public.runs where id=p_run for update;
 if v_run.id is null then raise exception 'Run not found'; end if;
 if v_actor<>v_run.host_id and not coalesce(public.is_staff_or_admin(),false)
   and not exists(select 1 from public.rch_runs_partner_sessions ps
     join public.rch_runs_partner_members pm on pm.partner_id=ps.partner_id
     join public.rch_runs_partners p on p.id=ps.partner_id and p.status='approved'
     where ps.run_id=p_run and pm.profile_id=v_actor and pm.role='manager') then
   raise exception 'Only the host, approved partner manager or RCH staff may issue a court check-in code';
 end if;
 if v_run.status not in ('open','full') then raise exception 'This Run is not accepting live attendance'; end if;
 if exists(select 1 from public.rch_weekend_circuit_events e where e.run_id=p_run) then
   raise exception 'Unstaffed court suggestions cannot issue attendance codes';
 end if;
 if now()<v_run.starts_at-interval '12 hours'
    or now()>v_run.starts_at+interval '6 hours' then
   raise exception 'Issue the in-person event code within 12 hours of start';
 end if;
 -- Twelve random hexadecimal symbols: 48 bits. Salted and hashed at rest.
 v_code:=upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,12));
 v_salt:=pg_catalog.gen_random_uuid()::text;
 insert into public.rch_run_checkin_codes(run_id,code_hash,code_salt,issued_by,issued_at,expires_at)
 values(p_run,encode(pg_catalog.sha256(pg_catalog.convert_to(v_salt||':'||v_code,'UTF8')),'hex'),
        v_salt,v_actor,now(),v_run.starts_at+interval '6 hours')
 on conflict (run_id) do update set
  code_hash=excluded.code_hash,code_salt=excluded.code_salt,
  issued_by=excluded.issued_by,issued_at=excluded.issued_at,expires_at=excluded.expires_at;
 return v_code;
end $fn$;


create or replace function public.check_in_to_run(p_run uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); r public.runs%rowtype; checkin_id uuid; awarded boolean; v_reward integer:=15;
begin
  if actor is null then raise exception 'Sign in to check in'; end if;
  select * into r from public.runs where id=p_run;
  if r.id is null or r.status='cancelled' then raise exception 'Run is unavailable'; end if;
  if now() < r.starts_at - interval '2 hours' or now() > r.starts_at + interval '6 hours' then
    raise exception 'Check-in opens 2 hours before the run and closes 6 hours after start';
  end if;
  if not r.allow_fan_checkin and actor<>r.host_id and not exists(select 1 from public.run_players rp where rp.run_id=p_run and rp.profile_id=actor) then
    raise exception 'This run only allows participant check-ins';
  end if;
  insert into public.run_checkins(run_id,profile_id) values(p_run,actor)
    on conflict(run_id,profile_id) do update set checked_in_at=public.run_checkins.checked_in_at
    returning id into checkin_id;
  if public.rch_is_partner_reward_eligible(p_run) then v_reward:=30; end if;
  awarded:=public.award_run_rep(actor,v_reward,'run_checkin','run_checkin',checkin_id);
  perform public.unlock_run_badges(actor);
  return case when awarded then v_reward else 0 end;
end $$;
grant execute on function public.check_in_to_run(uuid) to authenticated;


create or replace function public.submit_ranked_run_result(p_game uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_game public.run_games%rowtype;
  v_run public.runs%rowtype;
  v_size integer;
  v_home uuid[];
  v_away uuid[];
  v_id uuid;
begin
  if v_actor is null then raise exception 'Sign in to submit a result'; end if;
  select * into v_game from public.run_games where id=p_game for update;
  if not found then raise exception 'Game not found'; end if;
  select * into v_run from public.runs where id=v_game.run_id;
  if v_actor<>v_run.host_id and not coalesce(public.is_staff_or_admin(),false)
     and not exists (
       select 1 from public.rch_runs_partner_sessions ps
       join public.rch_runs_partner_members pm on pm.partner_id=ps.partner_id
       where ps.run_id=v_run.id and pm.profile_id=v_actor and pm.role='manager'
     ) then
    raise exception 'Only the run host, approved partner manager or RCH staff can submit game results';
  end if;
  if v_run.run_type<>'competitive' or v_run.status='cancelled'
     or v_run.game_format not in ('1v1','2v2','3v3','4v4','5v5') then
    raise exception 'Only structured 1v1–5v5 competitive runs are rated';
  end if;
  if v_game.status<>'completed' or v_game.home_score=v_game.away_score
     or v_run.starts_at>now() or v_run.starts_at<now()-interval '14 days' then
    raise exception 'Complete a non-tied game within 14 days of the run';
  end if;
  v_size:=split_part(v_run.game_format,'v',1)::integer;
  select array_agg(m.profile_id order by m.profile_id) into v_home
    from public.run_team_members m where m.run_id=v_run.id and m.run_team_id=v_game.home_run_team_id;
  select array_agg(m.profile_id order by m.profile_id) into v_away
    from public.run_team_members m where m.run_id=v_run.id and m.run_team_id=v_game.away_run_team_id;
  if coalesce(array_length(v_home,1),0)<>v_size or coalesce(array_length(v_away,1),0)<>v_size then
    raise exception 'Both teams need exactly % assigned players before submitting',v_size;
  end if;
  if (select count(*) from public.run_checkins c
      where c.run_id=v_run.id and c.profile_id=any(v_home))<>v_size
    or (select count(*) from public.run_checkins c
      where c.run_id=v_run.id and c.profile_id=any(v_away))<>v_size then
    raise exception 'Each rostered player must check in before the result can be rated';
  end if;
  if exists(select 1 from public.run_ranked_matches m
      where m.run_id=v_run.id and m.status='verified'
        and m.home_team_id in (v_game.home_run_team_id,v_game.away_run_team_id)
        and m.away_team_id in (v_game.home_run_team_id,v_game.away_run_team_id)
      group by m.run_id having count(*)>=3) then
    raise exception 'At most three games between these teams per run can affect ratings';
  end if;
  insert into public.run_ranked_matches(
    game_id,run_id,game_format,home_team_id,away_team_id,home_score,away_score,home_roster,away_roster,submitted_by
  ) values (
    p_game,v_run.id,v_run.game_format,v_game.home_run_team_id,v_game.away_run_team_id,
    v_game.home_score,v_game.away_score,v_home,v_away,v_actor
  )
  on conflict (game_id) do update set
    home_score=excluded.home_score,away_score=excluded.away_score,
    home_roster=excluded.home_roster,away_roster=excluded.away_roster,
    status='pending',home_confirmed_by=null,away_confirmed_by=null,
    submitted_by=excluded.submitted_by,submitted_at=now(),rejected_at=null
    where public.run_ranked_matches.status='rejected'
  returning id into v_id;
  if v_id is null then raise exception 'This game already has an open or verified review'; end if;
  return v_id;
end $$;


create or replace function public.rch_weekend_double_verified_game()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_run uuid;
begin
 select m.run_id into v_run from public.run_ranked_matches m where m.id=new.match_id;
 if public.rch_is_weekend_bonus_eligible(v_run)
    or public.rch_is_partner_reward_eligible(v_run) then new.rep:=new.rep*2; end if;
 return new;
end $$;

create or replace function public.rch_weekend_double_reviewed_stats()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_run uuid;
begin
 select s.run_id into v_run from public.run_competitive_box_scores s where s.id=new.submission_id;
 if public.rch_is_weekend_bonus_eligible(v_run)
    or public.rch_is_partner_reward_eligible(v_run) then new.rep_bonus:=new.rep_bonus*2; end if;
 return new;
end $$;

revoke all on function public.rch_review_runs_partner(uuid,text,text,smallint),
 public.rch_create_runs_partner_session(uuid,text,text,timestamptz,text,text,integer,integer,text,text),
 public.rch_is_partner_reward_eligible(uuid),
 public.rch_weekend_double_verified_game(),
 public.rch_weekend_double_reviewed_stats()
 from public,anon,authenticated;
grant execute on function public.rch_review_runs_partner(uuid,text,text,smallint),
 public.rch_create_runs_partner_session(uuid,text,text,timestamptz,text,text,integer,integer,text,text)
 to authenticated;
commit;
