-- Richmond first-event safety gate: physically assisted check-ins and reward controls.
-- The original check_in_to_run grants XP (legacy) for any signed-in caller inside
-- the time window, without in-person proof. Keep its implementation for legacy
-- award idempotency, but route every member through host-issued court codes.

begin;

create table if not exists public.rch_run_checkin_codes (
 run_id uuid primary key references public.runs(id) on delete cascade,
 code_hash text not null,
 code_salt text not null,
 issued_by uuid not null references public.profiles(id),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null
);
alter table public.rch_run_checkin_codes enable row level security;
revoke all on public.rch_run_checkin_codes from public,anon,authenticated;
grant all on public.rch_run_checkin_codes to service_role;

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
 if v_actor<>v_run.host_id and not coalesce(public.is_staff_or_admin(),false) then
   raise exception 'Only the host or RCH staff may issue a court check-in code';
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

-- The legacy check-in is inaccessible directly to browser users. Existing
-- caller function remains intact so its idempotent XP / badge ledger works.
revoke all on function public.check_in_to_run(uuid) from public,anon,authenticated;

create or replace function public.rch_check_in_with_code(p_run uuid,p_code text)
returns integer language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_run public.runs%rowtype;
 v_token public.rch_run_checkin_codes%rowtype;
begin
 if v_actor is null then raise exception 'Sign in to check in'; end if;
 select * into v_run from public.runs where id=p_run;
 if v_run.id is null or v_run.status not in ('open','full') then
   raise exception 'This Run is not active';
 end if;
 if exists(select 1 from public.rch_weekend_circuit_events e where e.run_id=p_run) then
   raise exception 'This is a court suggestion, not a hosted Run';
 end if;
 if not exists(select 1 from public.run_players p where p.run_id=p_run and p.profile_id=v_actor)
   and v_run.host_id<>v_actor then
   raise exception 'Register for this Run before checking in';
 end if;
 if now()<v_run.starts_at-interval '2 hours'
    or now()>v_run.starts_at+interval '6 hours' then
   raise exception 'Check-in opens 2 hours before the Run and closes 6 hours after its start';
 end if;
 select * into v_token from public.rch_run_checkin_codes
  where run_id=p_run and expires_at>now();
 if v_token.run_id is null or p_code is null or length(trim(p_code))<>12
    or encode(pg_catalog.sha256(pg_catalog.convert_to(v_token.code_salt||':'||upper(trim(p_code)),'UTF8')),'hex')
      <>v_token.code_hash then
   raise exception 'Invalid or expired court code. Ask the host for the current code';
 end if;
 return public.check_in_to_run(p_run);
end $fn$;

create or replace function public.rch_claim_checked_in_run_highlight(p_run uuid)
returns table(rep_awarded integer,post_id uuid)
language plpgsql security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();v_run public.runs%rowtype;
begin
 if v_actor is null then raise exception 'Sign in to claim a highlight'; end if;
 select * into v_run from public.runs where id=p_run;
 if v_run.id is null or v_run.status='cancelled'
    or exists(select 1 from public.rch_weekend_circuit_events e where e.run_id=p_run) then
   raise exception 'Highlights are rewarded only for actual hosted Runs';
 end if;
 if not exists(select 1 from public.run_checkins c where c.run_id=p_run and c.profile_id=v_actor) then
   raise exception 'Complete your in-person court check-in before claiming highlight REP';
 end if;
 return query select * from public.claim_latest_run_highlight(p_run);
end $fn$;

revoke all on function public.claim_latest_run_highlight(uuid) from public,anon,authenticated;
revoke all on function public.rch_issue_run_checkin_code(uuid) from public,anon,authenticated;
revoke all on function public.rch_check_in_with_code(uuid,text) from public,anon,authenticated;
revoke all on function public.rch_claim_checked_in_run_highlight(uuid) from public,anon,authenticated;
grant execute on function public.rch_issue_run_checkin_code(uuid),
 public.rch_check_in_with_code(uuid,text),
 public.rch_claim_checked_in_run_highlight(uuid) to authenticated;

-- Stop a host from marking a future, unstaffed or cancelled event as played.
-- A Run Room game is an *unverified scorecard*: ranked results still require
-- independent checked-in player confirmations through the existing RPC.
create or replace function public.rch_guard_first_event_game_record()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_run public.runs%rowtype;
begin
 if tg_op='UPDATE' and exists(
  select 1 from public.run_ranked_matches m
  where m.game_id=old.id and m.status in ('pending','verified')
 ) and (
   new.home_score is distinct from old.home_score
   or new.away_score is distinct from old.away_score
   or new.home_run_team_id is distinct from old.home_run_team_id
   or new.away_run_team_id is distinct from old.away_run_team_id
 ) then
   raise exception 'Score is under ranked review; resolve the review before editing';
 end if;
 if new.status <> 'completed' then return new; end if;
 select * into v_run from public.runs where id=new.run_id;
 if v_run.id is null or v_run.status not in ('open','full','completed') then
   raise exception 'Cannot record a completed game for an unavailable Run';
 end if;
 if exists(select 1 from public.rch_weekend_circuit_events e where e.run_id=new.run_id) then
   raise exception 'Cannot record completed games on suggested open courts';
 end if;
 if now()<v_run.starts_at-interval '2 hours' or now()>v_run.starts_at+interval '14 days' then
   raise exception 'Completed game recording is only available near an actual past Run';
 end if;
 if not exists(select 1 from public.run_teams t where t.id=new.home_run_team_id and t.run_id=new.run_id)
   or not exists(select 1 from public.run_teams t where t.id=new.away_run_team_id and t.run_id=new.run_id)
   or new.home_run_team_id=new.away_run_team_id then
   raise exception 'Select two different teams registered for this Run';
 end if;
 if new.home_score<0 or new.away_score<0 or new.home_score>200 or new.away_score>200 then
   raise exception 'Scores must be between 0 and 200';
 end if;
 return new;
end $fn$;
revoke all on function public.rch_guard_first_event_game_record() from public,anon,authenticated;
drop trigger if exists rch_first_event_game_record_guard on public.run_games;
create trigger rch_first_event_game_record_guard
 before insert or update on public.run_games for each row
 execute function public.rch_guard_first_event_game_record();

commit;
