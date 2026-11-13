-- Explicit privileges for server-side RCH Sites access in fresh Supabase environments.
-- service_role BYPASSES RLS but does not automatically receive table ACLs.
-- Prod may inherit these privileges from previous default grants; a brand-new
-- Supabase db reset must receive them reproducibly.
--
-- Do not grant anon/authenticated writes to these operator-controlled records.
grant select, insert, update, delete
  on table public.rch_site_starter_drafts to service_role;

-- Operator-only subscription transitions need a trusted server credential,
-- not Network advertising access or a browser's authenticated role.
grant select, insert, update
  on table public.rch_site_subscriptions to service_role;
grant select
  on table public.rch_site_plan_limits to service_role;
grant select
  on table public.rch_site_booking_quota_rollout to service_role;

-- Intentional: ordinary authenticated customers retain only their existing,
-- row-restricted private starter draft SELECT policy.
-- Subscription and rollout tables have no anon/authenticated grants.
