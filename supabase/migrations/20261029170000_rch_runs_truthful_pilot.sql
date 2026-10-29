-- RCH Runs truth-in-listings pilot — 2026-10-29
-- Preserves existing RSVPs, check-ins, verified results, court records and
-- reward receipts. A municipal park record is not a hosted basketball event.
begin;

-- Richmond is the supervised pilot market. Keep public court discovery statewide,
-- but pause generation of unstaffed weekend Run records outside Richmond.
update public.rch_weekend_circuit_courts
set active=false
where city <> 'Richmond' and active;

-- Do not cancel anyone's RSVP or attendance, nor any event with actual game
-- evidence. Unattended automated listings outside the pilot no longer promise
-- near-term activity in the hosted Runs funnel.
update public.runs r set status='cancelled', updated_at=now()
from public.rch_weekend_circuit_events e
where e.run_id=r.id and e.city <> 'Richmond'
  and r.starts_at>now() and r.status in ('open','full')
  and not exists(select 1 from public.run_players p where p.run_id=r.id)
  and not exists(select 1 from public.run_checkins c where c.run_id=r.id)
  and not exists(select 1 from public.run_games g where g.run_id=r.id)
  and not exists(select 1 from public.run_ranked_matches m where m.run_id=r.id);

-- Expire unstaffed, unplayed circuit suggestions after their advertised window.
-- Recorded participant activity is never reclassified as a non-event by automation.
create or replace function public.rch_expire_abandoned_circuit_runs()
returns integer language plpgsql security definer set search_path='' as $expire$
declare v_changed integer;
begin
 update public.runs r set status='cancelled', updated_at=now()
 from public.rch_weekend_circuit_events e
 where e.run_id=r.id and r.status in ('open','full')
   and r.starts_at<now()-interval '12 hours'
   and not exists(select 1 from public.run_players p where p.run_id=r.id)
   and not exists(select 1 from public.run_checkins c where c.run_id=r.id)
   and not exists(select 1 from public.run_games g where g.run_id=r.id)
   and not exists(select 1 from public.run_ranked_matches m where m.run_id=r.id);
 get diagnostics v_changed=row_count;
 return v_changed;
end $expire$;
revoke all on function public.rch_expire_abandoned_circuit_runs() from public,anon,authenticated;

-- Existing generator creates a Run then inserts its circuit ledger row.
-- Rename at that insertion boundary without changing the original generator,
-- RSVP identity, bonus eligibility or immutable court/date snapshot.
create or replace function public.rch_label_weekend_circuit_suggestion()
returns trigger language plpgsql security definer set search_path='' as $label$
begin
 update public.runs r
 set title='Weekend Court Suggestion · '||r.location,
     updated_at=now()
 where r.id=new.run_id
   and r.title like 'RCH Weekend Double XP %';
 return new;
end $label$;
revoke all on function public.rch_label_weekend_circuit_suggestion() from public,anon,authenticated;
drop trigger if exists rch_weekend_circuit_truthful_label on public.rch_weekend_circuit_events;
create trigger rch_weekend_circuit_truthful_label
 after insert on public.rch_weekend_circuit_events for each row
 execute function public.rch_label_weekend_circuit_suggestion();

update public.runs r
set title='Weekend Court Suggestion · '||r.location,
    updated_at=now()
from public.rch_weekend_circuit_events e
where e.run_id=r.id and r.title like 'RCH Weekend Double XP %';

select cron.schedule(
 'rch-expire-abandoned-circuit-runs',
 '30 10 * * *',
 'select public.rch_expire_abandoned_circuit_runs();'
);
select public.rch_expire_abandoned_circuit_runs();
commit;
