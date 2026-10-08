-- Social analytics instrumentation for relevance and community health.
-- Only the authenticated profile may create its own activity events.

drop policy if exists "users create own activity" on public.user_activity;

create policy "users create own activity"
on public.user_activity
for insert
with check (profile_id = auth.uid());

create index if not exists user_activity_type_idx
  on public.user_activity (activity_type, created_at desc);

create index if not exists user_activity_entity_idx
  on public.user_activity (entity_type, entity_id, created_at desc);
