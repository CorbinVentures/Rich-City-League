# Runs Full-Game: Phase 2 Game Day Release

## Delivered scope
- Actual game-day team matchup board in Run Room, with separate RSVPs vs on-site check-ins, formatted roster requirements, unassigned players, captain/host delegation kept in original team-assignment controls.
- Actual Next Up queue positions only among waiting entries, clear on-deck/on-court states; operator transitions still use existing role-authorized database RPCs and their realtime feed.
- Ranked competitive score submission remains separate from confirmed score. Explicit HOME and AWAY verification status, server-authoritative ranked review, realtime refresh, and a double-tap independent confirmation control.
- The game-day journey now listens for your own queue state and verified-match changes. Host route does not advertise a host as a registered player.
- Verified postgame share from actual server receipt; no synthetic games, titles, XP or REP. Manual refresh exists when realtime change events cannot be delivered.
- Corrected UX copy and accessible labels for submitted pickup scores.

## Not yet delivered
- Automated team matchmaking / auto-balancing, public registration waitlist, guaranteed player availability, SMS/OS push from queue, scorekeeper upload rework, live athletic scorekeeping display, official certify UI refactor, haptic/sound effects, rematch scheduling or automatic ranked season flows. These remain subsequent increments; existing original operations screens and backend functions remain active.

## Approval gate
- Automated typecheck, lint, Next build, unit suite and manual HTTP 200 do not constitute physical test coverage.
- Two real logged-in phones, verified 3v3 roster of six different actual people, real hosted public-court permission, offline fallback, weather plan, host scorekeeper, opponent confirmation, dispute flow, server receipt ledger, reliable queue updates, and privacy/photography consent must be proven.
- Nine Game Studio categories independently rated >=8/10 before official pilot. Existing pilot gate and Richmond first event guide stay in force.
