-- Extend privacy-aware tab session funnel without collecting names, emails or device IDs.
alter table public.rch_conversion_events drop constraint if exists rch_conversion_events_event_type_check;
alter table public.rch_conversion_events add constraint rch_conversion_events_event_type_check
  check (event_type in ('home_view','first_action_click','join_click','signup_view','signup_account_continue','signup_role_continue','signup_submitted','signup_created','signup_failed'));
alter table public.rch_conversion_events drop constraint if exists rch_conversion_events_context_check;
alter table public.rch_conversion_events add constraint rch_conversion_events_context_check
  check (context in ('home_hero','home_benefits','home_footer','header','welcome','audience_player','audience_fan','audience_coach','audience_creator','audience_organizer','email','oauth','unknown'));
drop policy if exists "Allow bounded anonymous funnel events" on public.rch_conversion_events;
create policy "Allow bounded anonymous funnel events" on public.rch_conversion_events for insert to anon,authenticated
  with check (session_id is not null and event_type in ('home_view','first_action_click','join_click','signup_view','signup_account_continue','signup_role_continue','signup_submitted','signup_created','signup_failed'));
