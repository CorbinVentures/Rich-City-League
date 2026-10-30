# RCH Runs — Game Studio 8/10 Pilot Gate
**Status: NOT CLEARED. This is an evidence-based release gate, not a marketing score.**

The `assessPilot` rule in `src/lib/runs-pilot-quality-gate.ts` returns CLEARED only if **every one of the nine categories** scores at least 8/10 **with an identified independent reviewer and concrete evidence**, plus the eight event operational checks. Scores must never be manually raised simply because code shipped.

| Gaming dimension | Minimum demonstrable pre-pilot criteria for 8/10 | Evidence owner |
|---|---|---|
| World-building/concept | 5 new Richmond basketball players can locate a real, officially sourced outdoor park court without interpreting a court idea as a hosted event | Product UX lead |
| MyPLAYER identity | Signed-in profile displays actual Hooper Level, verified games, earned badges and REP correctly; no contradictions against server receipts; guest view clearly explains sign-up | QA lead |
| Visual game feel | Legible 320px–430px iOS/Android views, reduced-motion compliant, visible feedback for verified outcomes and no synthetic wins | Design QA |
| First-time gameplay | At least 4 of 5 observed novice players independently find a real game or host flow, understand the difference between a suggestion and a hosted event, and explain next action | Field UX lead |
| Progression/rewards | Six-player test reconciles every eligible XP and REP receipt, level progress, earned title, and 2× verified REP copy with protected server ledger; no double awards | Scorekeeper + QA |
| Multiplayer matchmaking | At least one truly hosted 3v3 Run recruits six distinct actual RSVPs, successfully checks in at least six attendees, has two independent opposing score confirmations; zero fabricated opponents | Host + independent QA |
| Crews/territory | Crew creation, invite, roster and home-court selection tested on two accounts; eligibility/official requirements prevent unauthorized territory claim or pay-to-win | Crew QA + official |
| Competitive fairness | Independent two-side confirmation, no unauthorized edit or duplicate reward, verified official/title gate, disputed result correction path and privacy acceptance all pass | Independent official |
| Replayability/retention | A group can schedule its next game from a completed Run, view verifiable history and weekly objectives, and produce a valid shareable result; a measured return cohort must justify claimed retention score | Product analytics |

**Scoring policy:** each category starts **unrated** until independent evidence exists. 8 means the above acceptance criteria pass with zero critical defects; 9 or 10 requires repeated evidence across at least two separate Runs and supported devices. An unfinished event, a passing TypeScript test, or a READY preview cannot convert an unrated category to 8.

### Operational non-negotiables (all mandatory)
- Official park court use, public accessibility, permission and any required waivers/insurance confirmed
- Weather, backup and cancellation communication plan
- First aid, emergency ingress, staff and AED plan
- Six real distinct registered 3v3 players (or two for 1v1), confirmed in person
- Independent official for ranked/court titles and separate scorekeeper
- Signed-in iPhone and Android two-account live test for host code, roster and score confirmations
- Accurate XP/REP ledger, anti-duplicate receipts, appeals and authorization
- Participant/guardian consent, photo rights and privacy review

If any required category is below eight, unrated, lacks evidence, or has a critical defect, the pilot is NO-GO. Staff may conduct **non-ranked closed dry runs** to collect evidence, but must not advertise them as cleared official competitive events.

## Implementation and monitoring
- Quick Play only shows actual hosted future games, not automated park suggestions
- Rookie-friendly and solo filters reuse verified listing criteria
- In-event roster progress counts real registration records; hitting six RSVPs is **not** proof of attendance
- Server-controlled verification is the only source for the post-game recap, match EXP/REP and level progress
- Game-world HUD distinguishes Hooper Level, rank, spendable REP and social XP
- Metrics: discovery visits → game views → real RSVP → attendance → independently verified match → 30-day repeat, plus no-show, time-to-fill, technical defects. Instrument privacy-preserving event telemetry only after defining a legal purpose, deduplication and retention policy.

See `docs/RCH_RUNS_RICHMOND_FIRST_EVENT_GO_NO_GO.md` for the broader original operations checklist. This gate **adds** requirements; it does not override any protection, permission or independent result verification.
