# Royaltee PR 514 validation — 2026-10-15

Integrated main 07b801c9 without reverting its organization-specific coach dashboard.
Royaltee control requires an active profile plus active owner/manager membership in
royaltee-steppas, or existing RCH administrator authority. A generic cheerleading
staff assignment does not grant Royaltee access. Global roles remain unchanged.

## Changes
- Resolve public-registration and staff-navigation conflicts, retaining withdrawal
  and existing-registration display alongside the new coach dashboard.
- Make overlapping migration policy creation compatible with the earlier PR migration.
- Deny inactive profiles in the shared Royaltee permission helper.
- Allow anonymous execution of the helper for public RLS evaluation; it returns false.
- Route both dashboards through checked registration RPCs, remove direct update grants,
  and lock event before registration when reactivating a cancelled attendee.
- Clear private dashboard/registration state when the signed-in account changes.
- Document unpaid re-registration price refresh; paid/waived records keep their fee.

## Executed validation
- Local TypeScript: pass.
- Local lint: pass with existing repository warnings.
- Local application suite: 54 files, 415 tests passed.
- Preview database jnmyjolmwuomgxpmtbqi: applied combined follow-up SQL and ran
  supabase/tests/royaltee_authorization_test.sql inside one transaction, rolled back.
  pgTAP finish reported 1..30 without failures. Confirmed zero remaining fixture users.
  This validates SQL behavior under authenticated/anonymous database roles, not Auth sign-in.
- Edge warning is unrelated to Royaltee: its feature calls PostgreSQL RPCs and tables;
  the repository Edge Function is rcl-web-push, undeclared in config.toml.

## Required before merge
- Green application, migration, and Vercel checks on the final commit.
- Verify preview frontend points to its intended preview database.
- Real non-admin Royaltee-approved coach sign-in on /league/royaltee/dashboard and
  /league/royaltee/manage; ordinary member denial; /admin and /command denied to coach.
- Browser end-to-end: draft/publish adult event, fee change, adult registration,
  withdrawal/re-registration, roster, manual payment and check-in.
- Concurrent last-seat signups: passed with separate authenticated API sessions; exactly one succeeded.
- Browser age/profile boundaries, closed/cancelled/started events, sign-out/account switch.
- Review results before merge, then production migration and access smoke test.

No production migration or account-role changes were performed during this review.

## Subsequent live preview validation
- All checks passed on 862e43ef; Vercel READY, preview client targets the preview database.
- Three temporary global-fan accounts signed in through real Supabase Auth. Only the
  coach fixture received Royaltee manager membership. Coach permission true, ordinary
  member false, global administrator permission false.
- Live REST tests passed draft denial, publication, adult signup, duplicate idempotency,
  fee snapshots, roster privacy, direct-update denial, RPC payment/check-in, paid
  withdrawal/re-registration, concurrent last-seat protection and closed signup denial.
- Sessions logged out and all temporary Auth users, profiles and event deleted;
  cleanup query confirmed zero remaining.
- Desktop dashboard displays the existing install gate. These routes require the
  installed mobile experience. Authenticated mobile UI and Jennifer's personal
  sign-in remain unverified; API tests do not complete that merge gate.
- Corrected dashboard denial text to match organization-scoped authorization.
