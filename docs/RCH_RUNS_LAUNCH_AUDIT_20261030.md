# RCH Runs — first-event end-to-end launch audit
Date: 2026-10-30 (live Supabase production inspection)
Status: **NO-GO: no demonstrated multi-user field test; no upcoming independently hosted game.**

## Production evidence (read-only)
Source: Rich City League production PostgreSQL, table aggregates; no individuals were inspected or modified.

| Signal | Observed |
|---|---:|
| Runs records | 267 |
| Active future open/full listings | 17 |
| Future hosted Runs not recorded in weekend suggestion ledger | **0** |
| Future weekend suggestion listings | **17** |
| Current Run RSVP records (historical and future combined) | 2 |
| Run check-in records (historical and future combined) | 1 |
| Team membership records | 0 |
| Completed Run game records | 0 |
| Independently verified ranked matches | 0 |
| Active Next Up queue records | 0 |
| Competitive rating rows | 0 |
| Run reward event rows | 0 |
| Ranked match result appeals | 0 |

**Important:** no real opponents, game-day readiness, complete attendance, verified ranked result, or XP/REP replay can be asserted from these numbers. The single historical check-in is not proof of an active event.

## Verified engineering finding and fix
**High / trust issue — Next Up server admission:** `public.rch_join_run_queue` formerly accepted a registered player or event host as queue-ready for any open/full Run, as early as seven days before start, without requiring the in-person check-in code; it did not explicitly reject unstaffed weekend suggestion records. **Fix:** server RPC now permits joining only during the same -2h/+6h check-in window, explicitly rejects records in `rch_weekend_circuit_events`, requires a distinct real `run_checkins` row for the caller, and keeps its transaction lock, active-entry uniqueness, rejoin cooldown and per-Run capacity check. Auth and EXECUTE privileges stay restricted.

**Medium / privacy + false negative — Check-in screen:** RLS on `run_checkins` deliberately limits other attendees' visibility; showing unavailable records as `RSVP ONLY` or `NOT CHECKED IN` falsely describes teammates. **Fix:** personal check-in and host-managed check-in remain explicit; other member check-ins are labeled `CHECK-IN NOT VISIBLE`, without broadening attendance data access.

**Medium / false positive — game stepper:** Any unverified event scorecard advanced all visitors to the personal score-confirmation stage. **Fix:** player stages now require own RSVP / check-in for the first steps and a real verified receipt to complete the player journey. Scorecards carry a clear not-proof-of-personal-play statement.

**Resilience:** If the authenticated queue query fails, render an explicit unavailable state rather than silently hiding or showing a fictitious empty list. The check-in UI links back to host-issued court code.

## End-to-end verification matrix (required for field sign-off)
All items below remain **UNTESTED WITH REAL ATHLETES** and are not passed by unit tests or an HTTP 200:

1. Host creates genuine competitive 3v3 event at a permitted *outdoor Parks & Recreation* basketball court; venue access, cancellation and weather contact confirmed.
2. Six distinct real consenting players register. Independent test reviewer verifies roster count; suggestion listings are not accepted as hosted games.
3. Host issues code physically at court. A signed-in iPhone and Android each check in; remote RSVP cannot join Next Up; invalid/expired code fails; duplicate check-in does not yield a second award.
4. Player order in Next Up matches queued checked-in player order after refresh, offline/reconnect and at least one host role transition. A registered no-show cannot queue.
5. Host assigns exactly two teams of three unique players, records a real non-tie game, and opens ranked score review.
6. One actual checked-in player from each opposing team confirms independently; self-confirmation, duplicate result, excluded/out-of-date game, cancelled game, and unauthorized submission fail.
7. Another player disputes a real issue. Officials review it using scoped authorizations; result cannot silently overwrite player rating history.
8. Reconcile server-side player ratings per format, independently verified World XP, REP, badges and crown eligibility against ledgers. No credit from mere RSVP/scout/scorecard; repeat actions must not double award.
9. Confirm actual court, crew and MyPLAYER records update; receipt and relevant share text reflect only the genuine match; future games can be created and rejoined without violating event privacy.
10. Complete 320–430px iOS/Android manual tests (screenshots, legibility, contrast, keyboard, reduced motion, PWA update and reliable offline recovery), guardian/media consent, first aid, emergency ingress and weather protocol.
11. Independent reviewer documents evidence and scores each of **nine** Game Studio dimensions at least 8/10 plus all **eight** operational preconditions.

## Release gate
- CI: TypeScript, lint, production build and automated regression suite must pass.
- Preview: relevant Runs routes respond correctly. No truth about user behavior can be inferred from public HTTP checks.
- Database: apply reviewed migration; confirm deployed RPC contains new on-site and suggestion guards; check unchanged match/rating/reward row counts.
- **Pilot: remains NO-GO** until independent live multi-account field testing. A dry run may be non-ranked, with no invented match records or bypassed attendance.

Relevant source: `docs/RCH_RUNS_GAME_STUDIO_8_OF_10_PILOT_GATE.md`, `src/lib/runs-pilot-quality-gate.ts` and `docs/RCH_RUNS_RICHMOND_FIRST_EVENT_GO_NO_GO.md`.
