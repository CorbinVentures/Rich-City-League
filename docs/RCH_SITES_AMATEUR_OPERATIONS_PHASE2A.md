# RCH Sites — Amateur basketball operations Phase 2A

**Status:** Pull request only, not an instruction to apply migrations or enable production features.

## What is implemented

- A separate `/network/dashboard/sites/programs` organization manager experience for adult basketball **training, teams, camps and tryouts**.
- Private adult registration records (existing RCH profile IDs, **not** copies of birthdays, emails, payment details or social messages).
- Public adult self-enrollment at `/sites/[slug]/programs`, available only to a published, verified organization with an active Amateur/Professional website subscription and enabled private rollout.
- Team rosters reuse program registrations; staff-assigned group workout and practice sessions use a per-coach no-overlap database constraint.
- Program and roster capacity, active paid-through periods and age 18+ are enforced **inside the database**, not only the web UI.
- Private coach/roster names appear only to approved owners/managers via the authenticated server API. Public listing returns only program names, types, maximum capacities and session times.
- Distinct from official RCL competition stats, player REP, RCH TV, RCH Network advertising and PayPal Business links.

## Current constraints

- **No youth registration.** A DOB from the existing profile is checked at sign-up and in the database. No new date of birth is collected, and the platform does not independently verify identity.
- Program types: `training`, `team`, `tryout`, `camp`.
- Program registration counts apply across all scheduled sessions; session-by-session attendance tracking, automated reminders, waitlists, recurring series and independent leagues remain deferred.
- An Amateur plan may have up to **3 open non-team programs, 5 open teams, and 100 distinct active adult participants**. Professional supports 20 programs, 40 teams and 500 distinct adults. A program's individual capacity is at most 100.
- Authorized coaches are active adult network organization staff in `owner`, `manager`, or `editor` roles. Managers create schedules; coaches are not given organization manager permissions by this release.
- Dates for sessions are entered in the local browser timezone, saved as exact UTC timestamps, and limited to 2–180 days ahead.
- A paid or past-due plan blocks new registrations and sessions, but participants can still withdraw.
- No public links are injected into existing organization microsites automatically. The manager can share the adult registration URL for a published site.

## Separate authorization gates

1. The manager must have a confirmed RCH identity, completed active profile, appropriate MFA and **active owner/manager membership** in a verified claimed organization.
2. The server reads the **RCH Sites subscription** and Stripe-derived end of the paid period; it does not trust client tier or Network advertising tier.
3. The private `rch_site_amateur_rollout.enabled` value must be `true` **and** `pilot_organization_id` must equal the requested organization. The migration sets `enabled=false` and the pilot ID to null.
4. The service-role API checks the organization on every read and write; the new `public` tables enable RLS, grant no browser Data API permissions and contain no permissive RLS policies.
5. An invoker DB trigger locks the private subscription and program rows for quota/capacity checks and rejects underage registrations and unauthorized coach assignments. A composite FK rejects cross-tenant program associations.

## Required staging and release sequence

1. Capture database backup and review the new SQL migration under `supabase/migrations/20261029001500_rch_sites_amateur_program_operations.sql`.
2. Apply it **only to a disposable local/staging database**, with the existing migrations in order. Run the full pgTAP suite, especially `supabase/tests/rch_sites_amateur_program_operations_test.sql`; execute parallel requests for the final capacity spot and same coach/time.
3. Confirm the existing registration/booking tables and RCH Sites subscriptions are unaffected.
4. Run TypeScript, lint, Next.js build, Vitest, and authenticated owner/member browser tests on a Vercel preview. Verify mobile, mixed organization accounts, subscription expiry and revoked staff.
5. After separately approving migration in production, keep `rch_site_amateur_rollout.enabled=false`. Deploy application code safely; default routes report the pilot as not yet enabled.
6. Pilot only an explicitly approved verified organization: an authorized operator sets `enabled=true` **and** `pilot_organization_id` to that organization's UUID **after** staging validation and production migration review. All other organizations remain blocked. Do not enable in this PR.
7. Monitor platform queries, capacity conflicts and cost. Revoke the rollout flag immediately to stop new enrollments/session creations if issues occur. Keep existing records and participants' withdrawal path intact.

## QA for merge readiness

- [ ] GitHub TypeScript/lint/build/Vitest
- [ ] Local/staging migration execution and pgTAP
- [ ] Isolated authenticated browser lifecycle
- [ ] Vercel preview on final SHA
- [ ] Confirm separate approval for production migration and rollout enablement

No production database records, subscriptions or rollout flags should be mutated in this development PR.
