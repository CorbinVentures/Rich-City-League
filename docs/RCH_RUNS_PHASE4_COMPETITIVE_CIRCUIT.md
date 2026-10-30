# RCH Runs Full-Game Phase 4 — Competitive Circuit and Replayability

## Delivered
- An integrated four-mode **Competitive Circuit** at `/runs?view=world&mode=season`, with a visible but non-intrusive entrance from Game Home, plus deep links from MyPLAYER, Crew HQ, Court Arena, and full game guide. The four primary Game Home destinations stay unchanged.
- **Ranked:** Reuses the real server-authoritative `get_ranked_run_ladder` for independently verified ratings, format-specific standings and provisional status. Player replay archive derives read-only from their existing `get_rch_world_expansion` **verified match receipts**, with deduplication, defensive validation, chronological order, optional format filtering and links to source Run Rooms. No synthetic players, ratings or additional XP/REP are created.
- **Rivalries:** Reuses `WorldBattleScene` and real `rch_court_takeovers` challenges from the chosen World city/courts. Empty city is a clear selection prompt; no fake opponents, results or crew territory transfers.
- **Weekly:** Reuses existing server-backed `WorldJourney` weekly objective counters, not client clicks or hypothetical attendance. Scouting a court remains a private discovery record, not proof of visiting, playing, or rated success.
- **Cup Path:** Explicitly distinguishes an illustrative planned pathway (previously proposed November–December qualifying and January Cup) from actual tournament eligibility and bookings. Cup qualification remains controlled by its own official program. Distinct pro league planned November 2027.
- Reponsive design at 390px and below, reduced-motion and keyboard focus safeguards, no extra bottom tabs, pure unit tests and integration assertions.

## Limits not yet delivered
This release does **not** create database seasons, ladder resets, a season points ledger, automatic rival matchmaking, sanctioned Cup qualifiers or official qualification algorithms, server-side streak rewards, tournament brackets, scheduled notifications, physical court reservations, new rewards or pro-league games. Those require independently specified competitive rules, safety, backend authorization, and operational validation.

## Gate before first official Richmond pilot
The existing independent nine-category >=8/10 field test remains NO-GO. Require a genuine hosted event at an authorized Parks & Recreation outdoor court; test with real consenting participants and two independent phones, actual check-in, operator actions, two-team score confirmation, ranked receipt idempotency, reconnect/offline states, privacy, and accurate results on MyPLAYER, the ladder, and the circuit. Code review, passing CI, preview HTTP 200 and READY production **do not prove** on-court operational readiness.

## Follow-up product priorities
1. Define formal season/version policy, carry-over and skill-rating integrity with player consent.
2. Introduce server-side eligibility explanations, clear dispute handling, approved Cup qualifiers and verified tournament brackets only with administrator approval.
3. Validate live queue notification opt-in, refresh/visibility and two-device result workflows before adding haptics, replay animations or other cosmetic features.
