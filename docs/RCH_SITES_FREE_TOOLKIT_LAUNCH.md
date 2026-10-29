# RCH Sites Free Basketball Toolkit — implementation and release checklist

**Status:** Feature branch only. Do not merge or deploy without CI, staging migration/RLS tests, security review and explicit release approval. The server-side environment flag `RCH_SITES_TOOLKIT_ENABLED` defaults OFF.

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
6. Test 100 monthly registrations followed by concurrent 101st and 102nd; verify one-email deduplication, bad-origin request denial, spam protection, and sensible rate limiting.
7. Exercise Free with no Stripe subscription, and ensure paid-tier entitlement state is not used to block Free.
8. Confirm no regression in existing booking appointments, PayPal merchant links, official scoring, main PWA, website publication, and organization verification.
9. Complete a legal/privacy and anti-bot review, especially retention, deletion and minor data boundaries; do not enable in production until mitigations pass.
10. Only after approval set `RCH_SITES_TOOLKIT_ENABLED=true` in a controlled environment; validate actual migrated backend first. No automatic rollout from merging this branch.

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
