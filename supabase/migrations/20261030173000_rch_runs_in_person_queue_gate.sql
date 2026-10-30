-- Richmond Runs launch audit: make Next Up reflect actual checked-in attendees.
-- No changes to existing registration, check-in, match or reward ledgers.
-- A park suggestion is NOT a hosted game; a registration is NOT on-site attendance.
create or replace function public.rch_join_run_queue(p_run uuid)
returns uuid language plpgsql security definer set search_path='' as $queue$
declare
 v_actor uuid:=auth.uid();
 v_run public.runs%rowtype;
 v_existing uuid;
 v_latest timestamptz;
 v_result uuid;
begin
 if v_actor is null then raise exception 'Sign in to join the Next Up queue'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_run::text),79531);
 select * into v_run from public.runs where id=p_run;
 if v_run.id is null or v_run.status not in ('open','full')
   or now()<v_run.starts_at-interval '2 hours'
   or now()>v_run.starts_at+interval '6 hours'
 then raise exception 'Next Up opens at the court on game day (2 hours before through 6 hours after the start)'; end if;
 if exists(select 1 from public.rch_weekend_circuit_events e where e.run_id=p_run) then
   raise exception 'This is an open-court suggestion, not a hosted game'; end if;
 if not exists(select 1 from public.run_checkins ck where ck.run_id=p_run and ck.profile_id=v_actor) then
   raise exception 'Check in at the court with the host code before joining Next Up'; end if;
 select q.id into v_existing from public.rch_run_queue q where q.run_id=p_run
   and q.profile_id=v_actor and q.status in ('waiting','called','playing') limit 1;
 if v_existing is not null then return v_existing; end if;
 select max(joined_at) into v_latest from public.rch_run_queue
   where run_id=p_run and profile_id=v_actor;
 if v_latest>now()-interval '5 minutes' then
   raise exception 'You can rejoin the queue five minutes after leaving'; end if;
 if (select count(*) from public.rch_run_queue
      where run_id=p_run and status in ('waiting','called','playing'))>=100 then
   raise exception 'Next Up is temporarily at maximum queue capacity'; end if;
 insert into public.rch_run_queue(run_id,profile_id,changed_by)
   values(p_run,v_actor,v_actor) returning id into v_result;
 return v_result;
end $queue$;

revoke all on function public.rch_join_run_queue(uuid) from public,anon;
grant execute on function public.rch_join_run_queue(uuid) to authenticated,service_role;
