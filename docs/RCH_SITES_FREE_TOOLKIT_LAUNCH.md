# RCH Sites Free Basketball Toolkit — implementation and release checklist

**Status:** Free toolkit source was merged in PR #633; customer rollout is still OFF. The registration hardening PR must pass CI and isolated staging tests before enabling. A merged GitHub migration does NOT establish that the production Supabase migration was applied. The server-side environment flag `RCH_SITES_TOOLKIT_ENABLED` and client navigation flag `NEXT_PUBLIC_RCH_SITES_TOOLKIT_ENABLED` default OFF. An independent `RCH_SITES_REGISTRATION_RATE_SECRET` (random, at least 32 characters; never `NEXT_PUBLIC`) is mandatory before opening registration.

## Scope committed
- `/network/dashboard/sites/toolkit`: authorized organization selector, working single round-robin Schedule Studio (explicit published public schedule page), team-name/Roster Builder, fixed adult-interest registration form and QR sharing, printable Game Day Pack, budget projections and CSV exports.
- `/sites/{slug}/toolkit-register`: public form for adult interest submissions on a verified, published organization's site when that organization explicitly opens the form.
- `/api/rch-sites/toolkit`: verified owner/manager CRUD, server-side validated Free limits, optimistic revision matching and server-only storage.
- `/api/rch-sites/toolkit/registration`: guarded public submission, single entry per email and a serialized per-organization monthly limit.
- Migration for tenant-specific toolkit documents and contact submissions; pgTAP access tests.

## Product contract
- Free: 8 team names, 1 managed roster with up to 20 players, one single round-robin schedule, 100 adult-interest submissions/month, one saved budget and printable game-day packets.
- Paid tier enhancements (not activated in this PR): multiple managed teams, additional seasons, double round-robin/multiple venues, staff scheduling, custom registration questions and advanced budget/fairness optimization.
- Existing RCH Sites plan pricing, subscriptions, Network tiers, official league, REP, RCH TV, and independent PayPal arrangements are untouched.
- Registration is for adult interest, not medical intake, payment, confirmed game admission or youth enrollment. No minor personal details should be entered in roster or registration MVP.
- Consent is recorded as timestamps, organizations must handle information responsibly, and RCH must finalize retention/deletion policy before release.

## Validation required to enable
1. Apply migration to an **isolated staging project only**, inspect privileges and run `npm run test:rls`. Test multiple organizations; signed-out users and revoked managers must not access tenant data.
2. Run `npm run type-check`, `npm run lint`, `npm test`, `npm run build` and release browser suites on the final commit.
3. Manual flow: claim/verify organization -> save two rosters -> generate 8-team schedule -> edit and save -> export CSV -> create adult form -> publish site -> scan QR -> submit -> review in owner dashboard -> create/print packet -> budget and CSV.
4. Validate two distinct organization accounts and an anonymous visitor. Ensure public endpoints never expose internal rosters, emails, budget, or unpublished sites.
5. Confirm schedules reject duplicate games, team/court overlaps, malformed dates, and obsolete edits. Confirm conflicting writes report revision 409.
6. Test the atomic 100/month contact limit, per-visitor 5/hour and 12/day attempt limits, and per-organization 60/hour limit; verify concurrent submissions, deduplication, invalid origin denial, missing secret failure, and malformed proxy-IP rejection. Confirm Postgres `cron.job` includes `rch-site-toolkit-privacy-cleanup` and expiry deletes 90-day contacts and 72-hour pseudonymous attempt counters.
7. Exercise Free with no Stripe subscription, and ensure paid-tier entitlement state is not used to block Free.
8. Confirm no regression in existing booking appointments, PayPal merchant links, official scoring, main PWA, website publication, and organization verification.
9. Verify adult-only consent and revised privacy terms, organization-manager deletion, 90-day automatic contact expiry, 72-hour fingerprint expiry, and explicit support/contact route for deletion; do not activate public intake without passing staging abuse/retention tests.
10. Only after approval and **production migration verification**, configure the HMAC rate secret and set both `RCH_SITES_TOOLKIT_ENABLED=true` and `NEXT_PUBLIC_RCH_SITES_TOOLKIT_ENABLED=true` in the intended environment. Redeploy with the verified Vercel environment. First enable for a small pilot, then assess live logs before broader release. No automatic rollout from merging branches.

## Implementation follow-ups
- Dedicated organization-controlled deletion/export request flow for adult registrations and privacy policy language.
- Real paid-tier features should extend `RCH_SITE_PLAN_TIERS`, `RCH_SITE_FEATURE_KEYS`, `RCH_SITE_RELEASED_FEATURES` and server-entitlement checks with separate migrations/tests. Do not treat paid pricing preference in onboarding as entitlement.
- Separate document versioning for post-publish schedule edits and packet invalidation.
- Stronger bot mitigation, per-IP throttling, waitlists and configurable form fields before broad public exposure.
- Keep a migration rollback and operational recovery runbook for each production release.

## Known release limitations
- This PR does **not** implement paid-tier advanced workflows.
- Game-day packet prints to PDF through the browser; it does not generate or store a file on the server.
- Public registration form has fixed adult name/email fields; youth/guardian registrations require a separate reviewed system.
- Organization manager changes use optimistic revision checks; the registration table has an atomic monthly quota trigger.
- Unfinished features are withheld by the server release gate; a visible UI link is not proof of release.

## Launch-readiness discovery (October 29, 2026)

Production Vercel commit `91ced23d4e7a2951f7c2aad8485c5c0b30628053` is READY, but production Supabase did **not** yet contain `rch_site_toolkit` or `rch_site_toolkit_registrations` at the initial review; migration `20261029012000` was not recorded. Production Vercel had no toolkit rollout variables at that time. Do not turn on the features before migrating and testing the backend. The registration hardening migration depends on the original toolkit migration and pg_cron. These are release gates, not production features silently activated by code merge.
