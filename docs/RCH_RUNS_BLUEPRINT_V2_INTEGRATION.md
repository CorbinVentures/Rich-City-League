# RCH Runs — Master Game World Blueprint V2 / Integration Contract

**Scope:** Approved master player journey spanning 24 destinations. This document tracks actual code paths and required operating constraints, not fabricated launch readiness.

## Navigation: Five top-level destinations

| Game tab | Primary route | Purpose |
| --- | --- | --- |
| Home | \`/runs\` | Cinematic Game Home, next real Run, My Player HUD and the six-stage full-world index |
| Map | \`/runs/world\` | Accurate Virginia georeferenced courts, city portals, court identity |
| Runs | \`/runs?view=list#rch-upcoming-runs\` | Actual events, filter/registration and competitive operations |
| Vault | \`/runs?mode=vault\` | Earned World XP milestones, badges, separate REP wallet |
| Crew | \`/crews?intent=mine\` | Authentic registered crew profiles, rosters and territory |

Deep Routes under /runs share the five-tab game dock, while the main Runs World retains its own navigation. All links use actual routes and events.

## Six-stage, 24-destination game map

| Stage | Screen | Actual destination |
| --- | --- | --- |
| I | 01 Cinematic Entry | /runs (replay entrance) |
| I | 02 Game Home | /runs |
| I | 03 Virginia World | /runs/world |
| I | 04 Court Arena | /runs/courts/[slug] |
| II | 05 Run Finder | /runs?view=list#rch-upcoming-runs |
| II | 06 Run Lobby | /runs/[id] |
| II | 07 Next Up | /runs/[id]#rch-next-up |
| II | 08 Game Day | /runs/[id]#rch-game-day |
| III | 09 Score Review | /runs/[id]#rch-result-review |
| III | 10 Verified Result | /runs?mode=player#rch-verified-recap |
| III | 11 My Player | /runs?mode=player |
| III | 12 Missions | /runs?mode=missions |
| IV | 13 Badge Collection | /badges |
| IV | 14 Vault & REP | /runs?mode=vault → /rep |
| IV | 15 Crew HQ | /crews?intent=mine |
| IV | 16 Takeovers | /runs?mode=battle |
| V | 17 Court Masters | /runs/courts/[slug]#rch-court-masters |
| V | 18 Leaderboards | /runs?view=list#rch-competition |
| V | 19 Commonwealth Cup | /commonwealth |
| V | 20 Host Operations | /runs/[id]#rch-host-operations |
| VI | 21 Partner Runs | /runs/partners |
| VI | 22 Game Social | /runs/[id]#rch-run-tape |
| VI | 23 Notifications | /notifications |
| VI | 24 Integrity / Appeals | /runs/[id]#rch-appeals |

A route does **not** imply an unearned score, an available event, an approved venue, a member's physical presence, or privileged access. The Game World index sends guests without a selected event back to real event discovery.

## Core visual & interaction rules

- Game Home = personalized identity and a single clear real-basketball action.
- Virginia World = real mapped geometry and user-selected city, not invented precise court pins; gray community leads remain unverified.
- Court Arena = court name, sourced venue, current crew control and crest (if available), 1v1/2v2/3v3 independent Master rankings, actual event schedule and truthful access information.
- Run Lobby = date/location, registration capacity, real roster, join/leave action, queue, check-in, result review, media and staff tooling. Realtime plus manual refresh; counts can change before registration completes.
- Verified result = only opponent-confirmed game outcomes; title/takeover results also require independently authorized official evidence.
- Missions/XP, REP and rank = separate server-backed concepts. No manufactured XP or REP client awards, no pay-to-win titles, no purchased queue priority.
- Partner, host, staff and appeals = reuse authorization and existing rules rather than moving privileged actions into public game modes.
- Screen graphics may animate; game truth is always literal. Reduced-motion and clear, non-color-only states are required.

## Source-of-truth components

- Home: \`RunsCinematicHome\`, \`RunsWorldGame\`, \`RunsJourneyHub\`
- Map: \`AccurateVirginiaMap\`; Court identity: \`runs/courts/[slug]\`, \`CourtMasterTitles\`, \`CourtDominion\`
- Events: \`runs/page.tsx\` legacy list, \`runs/[id]/page.tsx\`, \`RunNextUp\`, \`RunRankedMatchControl\`, \`RunOperationsHQ\`
- Progress: \`RunsWorldJourney\`, \`RunsWorldExpansion\`, \`RunPassport\`, \`RepExchange\`
- Squads: existing \`/crews\` routes and verified takeover/territory ledger
- Cup: \`/commonwealth\`
- Operations: \`/runs/partners\`, \`/runs/hosts\`, \`RunResultAppeals\`

## Release gates and known uncompleted product work

Build gates: TypeScript, lint, production Next build, tests, preview READY, and review of the exact main branch commit. No new SQL migrations for this navigation/UI release.

**Human test gates still required:** mobile Safari PWA/desktop navigation, account sign-in and guest states, real roster check-in with two accounts, full/closed Runs, score confirmation, official role denials, crew challenge/defense, verified XP/REP receipt, accessible motion and third-party map tile fallback.

**Not claimed as complete by navigation integration:** fully bespoke pixel-matched redesign of every external Crew/Badge/Cup/Host/Notification screen, real-time geolocation tracking, augmented reality, new game economic rewards, new partner sponsorship multipliers or future 3D avatars. These require separate approved UI specs, privacy review or verified server-side contracts. The conceptual art and placeholder badge/title/score values are **not** production data.
