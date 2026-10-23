# RCH PWA Activation — Phase 1

## Implemented scope
Member experience only. The standalone Scorebook and private Command Center PWAs are untouched.

- Installed manifest and authenticated root handoff use /social. /today remains a separate dashboard.
- Pulse presents a dismissible first-device orientation after the existing explicit city selector; new members can find actual Runs listings, Clips or Discover.
- For You scoring uses the viewer's expressly chosen city as a weak relevance signal. A mention is never proof of an event or author location. Following and Trending are unaffected.
- RCH Today no longer labels unfiltered community posts as Richmond-only.
- Runs distinguishes real event discovery from cinematic world play. Scheduled event links say VIEW RUN DETAILS.
- No schema migrations, RLS, authentication, scorebook, admin, or server-side scoring changes.

## Pre-merge QA checklist
1. On an installed, authenticated iPhone PWA, check icon launch, site-home button and /today navigation. They must land on Pulse, Pulse and Today respectively.
2. On fresh device storage, check city selector and first-visit links. Dismiss and reopen. A post permalink must not show orientation.
3. Select Richmond, Fredericksburg, Charlottesville, Norfolk, Roanoke, then All Virginia; verify For You changes only based on explicit city mentions and Following/Trending remain independent.
4. Navigate from discovery to the real event list. Confirm run time, host, availability and truthful empty states. Open World and skip the cinematic intro.
5. Verify screen sizes, keyboard and screen reader flow, reduced motion, dock stacking, and iPad rotation.
6. Verify route guards, account setup, REP progress, media, and Scorebook handoff are unchanged.
7. Check npm run type-check, npm test, and Vercel preview before merging.

## Release gate
A ready preview or source-code tests do not certify installed-device behavior. Merge to production only after QA.
