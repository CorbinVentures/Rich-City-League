begin;

-- Production ledger reconciliation marker.
-- `native_post_reposts` was applied a second time through the idempotent
-- Supabase migration API while verifying the production rollout. The schema
-- change itself is fully represented by 20260928205922_native_post_reposts.sql.
-- Keep this no-op marker so local/source migration history matches the live
-- Supabase ledger and future migration pushes do not report remote-only drift.

commit;
