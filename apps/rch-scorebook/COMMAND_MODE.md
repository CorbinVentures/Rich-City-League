# RCH Scorebook Command Mode — visual release

**Product:** the dedicated `https://rch-scorebook.vercel.app/` PWA, not the main RCH website.

## Purpose

The command-center visual layer upgrades the existing official iPad scoring desk to a distinctive RCH broadcast appearance without changing the scoring engine, database, identity, or team rosters. It keeps RCH's navy, white, and blue identity and uses semantic green/red states for made/missed plays.

## Changes

- Broadcast-format sticky official score display with larger numbers and clock, quarter controls and a clearly labeled network-state indicator. The indicator measures browser network reachability, **not** server sync or official live-game status.
- Animation when a score changes between official Scorebook renders; no locally calculated points.
- Selected-player hero within action panel; action buttons grouped by scoring, misses, rebounds, and defense/discipline.
- Play-by-play “last event” recap and last-ten recorded-event strip, built only from the original Scorebook event-feed DOM. When there are no official events, the app explicitly says so rather than inventing data.
- iPad landscape and portrait layouts, touch targets, focus styles, and reduced-motion support.
- Unrecognized stat actions are retained in an “Additional actions” group to avoid accidentally hiding options introduced by the official scorer.

## Implementation

Versioned assets:
- `apps/rch-scorebook/tablet-score-desk.css` and `.js` from the previous iPad release.
- `apps/rch-scorebook/command-mode.css` and `.js` from this release.

Scorebook Vite `public` directory receives those 4 assets. In `index.html`, load `/brand.css`, `/tablet-score-desk.css`, then `/command-mode.css` in order. Load `/src/main.js`, then `/tablet-score-desk.js` and `/command-mode.js` in order. **Do not change the original Vite scorer backend/RPC call paths.**

The standalone Vercel Scorebook project remains deployed from an API-uploaded source bundle. GitHub houses the enhancement assets and tests, but **a GitHub merge alone does not deploy them to Scorebook**. The project should eventually move the full scorer source into GitHub.

## Release and QA

1. Application Quality and Vercel checks must pass before merging.
2. Preview deployed separately; production deploy only after preview Ready and merge.
3. Verify visually on an actual iPad in both orientations. Check home, game selector, roster, every scoring action, Pro/Quick mode, shot chart, play log, starting lineup, and box score.
4. Verify an authorized, isolated test game with actual player rosters before making any claims of certified scoring correctness. Current production contains no active rosters, no recorded plays, and no finalized game history.
5. Verify your installed PWA gets fresh files after a full close/reopen. If the old shell remains, reinstall as a last resort.
