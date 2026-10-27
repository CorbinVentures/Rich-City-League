# RCH Sites Phase 1 — staging, dependency and rollback checklist

**Status: draft PR only; NOT APPROVED for production migration, merge or deployment.**

This phase builds on Phase 0 (PR #617) with staged plan records, serialized booking limits, owner-visible quota usage and DB regression tests. PR #618 includes the earlier commits until #617 merges.

## Current behavior versus proposed

- Current live API: free services, manually created future slots; API-only ceilings of 20 total services and 120 upcoming open slots; database prevents overlapping slots and duplicate confirmed bookings.
- Proposed new Free limits: 2 active services, 30 future open slots, 25 bookings created per UTC calendar month. Amateur: 15 / 150 / 150. Professional: 60 / 600 / 600.
- New private tables: public.rch_site_subscriptions and public.rch_site_plan_limits. RLS enabled with no anon/authenticated table privileges; billing and plan changes require trusted server credentials.
- New invoker triggers serialize writes per organization using a subscription row lock, enforcing quotas based on real database counts. Canceled bookings still count as current-month usage.
- Owner booking dashboard receives plan name, billing status, limits and server-measured counts but never customer payment information or provider subscription reference.
- Custom-domain verification, recurring staff calendars, independent competition portals, youth registrations and marketing sends are not in this PR.

## Approval and rollout gates

1. Prepare verified production backup and explicit rollback window; do not apply migration to production from this draft PR.
2. First run all migrations plus full pgTAP suite (including new quota test and existing RCH Sites tests) against isolated local/staging Supabase.
3. The staged SQL currently enforces new Free limits immediately if applied. Existing users over 2 active services / 30 future slots retain records and cancellation access, but cannot add resources until below limits. Inventory and notify affected customers; consider grandfathering/release flag before actual production rollout.
4. Coordinate database and application changes. API code depends on new tables and should not deploy first. Migration-first temporarily exposes the stricter database cap without the improved application error message.
5. Run parallel creation tests for services/slots/bookings at quota boundaries (SQL row lock must serialize); also verify idempotency, cancellation and UTC rollover.
6. Test unauthorized users, revoked members, other organizations and role escalations. Plans cannot be assigned by Network tier or public tier-interest forms.
7. Verify the existing organization-wide no-overlap booking rule remains; multi-staff simultaneous calendar support is deferred.
8. Paid RCH Sites subscription checkout, billing webhook verification, youth portals and organization PayPal integrations remain **disabled**. Customer PayPal links are still external and unverified by RCH.
9. Verify existing Website Studio, published subsites, PWA social home, cancellations and account rights are unaffected.
10. Explicitly approve any merge, production migration and prices only after QA results and customer-impact audit.

## Rollback

- Before merge: discard/revise the draft branch. The production database is unchanged.
- After applying the migration: do not drop tables while new application code depends on them. Coordinate disabling new quota triggers with restoring the old API caps, and only remove tables after verifying there are no consumers.
- Never delete appointments, media or existing customer data as a quota reconciliation technique.

## Known limits of branch validation

GitHub TypeScript/lint/build/Vitest checks do not execute actual PostgreSQL trigger concurrency cases. Supabase CI runs local migrations/pgTAP, but real parallel-client staging tests and affected-customer inventory are separate release gates. The Supabase CLI is unavailable in this execution container, so this SQL migration was staged in the repository using its migration filename convention; it has not been applied directly to a project.
