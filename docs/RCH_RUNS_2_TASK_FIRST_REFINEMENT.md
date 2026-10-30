# Runs 2.0 — Task-first product refinement and Richmond pilot gates

## Scope
- Player-hosted games and host creation are first, and official outdoor park-court suggestions are clearly distinct from confirmed games.
- Full Rules and cinematic intro are optional. Cinematic replays remain available from the game-world home.
- Game world primary navigation is Play, Courts, Crews, and My Player; Battles and Vault remain accessible contextually without erasing records.
- Approved city court slugs constrain Run queries server-side instead of fetching a 2,000-row statewide list for each city.
- Preserve authentication, consent, verified score/REP/XP rules, true attendance and actual scoreboard history; no database migrations or fictional activity.

## Required acceptance testing
1. Guest iPhone (320/375/390/430px), Android mobile and desktop: /runs loads to Find a Game / Host a Game without a modal. Deep-link /runs/world and /runs?view=world also display immediately.
2. Replay entrance appears **only** after tapping Replay; How It Works and court Rules open and close on request with accessible focus and Escape behavior. Reduced-motion preference suppresses animation.
3. Confirm no horizontal overflow or clipped labels in Play/Courts/Crews/My Player navigation. Verify advanced Battles/Vault reachable via in-context actions; test back navigation.
4. As signed-out and real signed-in pilot accounts, see correct states for confirmed hosted games, player-organized games, suggested unstaffed outdoor courts, full runs, past/cancelled runs, and unavailable loading/errors. Never show park tips as RSVPs for actual games.
5. Map each locality to approved outdoor Parks & Recreation courts and compare city results with the classic list. Verify remote / slow-phone performance and map fallback; no stale or silently truncated matches.
6. Check rewards copy against actual server eligibility: 2× verified REP applies only to independently verified eligible games and stats; no XP or REP from a park suggestion alone.
7. Real event dry run: named host/independent scorekeeper, two distinct real player accounts, valid/invalid/rotated 12-character check-in code, both-sides score confirmation, one-time XP/REP ledgers, weather/permissions/safety, offline fallback and consent.

## Measurement and expansion gates
Track visit → real hosted Run view → RSVP → real attendance → verified result → 30-day return, each as separately defined funnel stages. Record cancel/no-show and support incidents. Do not claim conversion-rate improvements without measured before/after cohorts.

Do not advertise the Richmond Takeover as a staffed, confirmed or ranked event until the separate go/no-go playbook is signed off with field evidence:
`docs/RCH_RUNS_RICHMOND_FIRST_EVENT_GO_NO_GO.md`.

Do not expand automated statewide discovery or promise active local matchmaking until a real market has repeated completed hosted Runs, adequate organizers, verified scores and repeat attendance.

## Not in this PR
- No fake players, RSVP, badges, titles, scores, courts, published highlights, or artificial energy.
- No new backend reward mechanisms, unreviewed RLS/security-definer privilege changes, or production releases.
- Full real-device usability/performance, operational staff signoff, and outdoor park media/permission checks must be demonstrated separately.
