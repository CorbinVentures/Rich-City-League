# RCH Scorebook · Standalone PWA (Beta)
Dedicated app: https://rch-scorebook.vercel.app/

## Architecture
- Own installable PWA, separate Vercel project `rch-scorebook`, shared official RCH Supabase database.
- Uses RCH email/password authentication, checks `has_game_iq_access` and account role (coach/admin).
- Mutations use existing database RPCs: `record_game_event`, `void_game_event`, `set_starting_lineup`, `record_substitution`, `finalize_game_scorebook`.
- No browser-managed fake production scores. Quick and Pro modes use the same official event stream.
- Server-side row security and RPC authorization remain authoritative.

## Known readiness gaps
- At the initial inspection, no active rosters were assigned and no team-coach assignments existed. Admins must assign verified players to official season rosters before player-level scoring can be exercised.
- The dedicated app deliberately disables offline official event submission to avoid duplicated or unordered stats. Read-only shell and some cached state can remain offline; it does NOT provide offline score syncing.
- The on-device clock is a local timer; it is not a synchronized authoritative game clock.
- Basic Game IQ screen uses actual recorded statistics. The separate app does not yet integrate the main site's AI Coach server endpoints.
- Verification still needed with a real authorized scorer and test game: sign-in, game visibility, roster selection, 2PT/3PT/FT, undo, substitutions, box score, final locking, permissions, iPhone PWA install.
- Because iOS treats different PWA origins as separate apps, opening the Scorebook URL from RCH may open Safari instead of an already installed PWA.
- The original `/portal/scorebook` implementation remains in the repository as a rollback/fallback; this PR updates major navigation entry points rather than deleting it.

## Release gate
Do not finalize a production contest to test. Use a test game and validate score reconciliation, duplicate prevention, multiple scorers, and role policy before retiring the original editor.
