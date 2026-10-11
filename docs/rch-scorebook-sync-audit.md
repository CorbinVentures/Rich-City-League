# RCH Scorebook synchronization audit

## Authoritative flow
The **standalone Scorebook** and main **Rich City Hoops** website use the same Supabase project and official `public.games`, `public.game_events`, `public.player_game_stats`, `public.team_game_stats` and `public.standings` data.

- Official plays are inserted through `record_game_event`. It locks the game row, validates game and roster access, inserts the event, rebuilds score and player/team statistical projections, then recalculates lineup segments inside one database transaction.
- The scored `games` row is the authoritative Realtime signal. Scored games now transition from `scheduled` to `live` on the first official play, so Live Game Center listings reflect an active Scorebook.
- Main RCH Game Center and Standings screens now refresh on any published game change, on foreground return and every 15 seconds while visible.
- Public game detail uses dynamic server rendering (not a stale 60-second snapshot), and its score component refreshes score directly on Realtime updates and polls every 12 seconds. It refreshes its server-rendered box score when the official `updated_at` changes.
- The separate Scorebook beta currently refreshes its selected game data approximately every 15 seconds and upon foreground return; its existing event RPCs and stats views point to this same backend. This is **eventual, not guaranteed instant, synchronization**.

## Production read-only audit, 2026-10-11

- 86 scheduled games, zero active game events and zero completed games.
- 0 player game statistics rows; 0 team game statistics rows.
- 0 active roster assignments and 0 team-coach assignments. 174 active players.
- The result reconciliation query found **zero mismatches among zero scored games**. This is not evidence of a passed live scoring scenario.
- Supabase Realtime publication includes `games`; other statistic tables are fetched after each official games update.

## Verification gates before 100% claim

1. Assign verified team-season rosters and correct coach permissions to an isolated, authorized **test game**.
2. With two scoring/fan devices open, check a 2PT make, a 3PT make, a miss, rebounds, an assist, a substitution and undo across both UI surfaces; verify one event and correctly projected player/team figures for each.
3. Verify live transition: scheduled game moves to live after the first play and appears in the Live Game Center.
4. Finalize the test game; confirm site standings, player results, postgame records and final state match Scorebook, and confirm final/locked RPC edits are rejected.
5. Disconnect/reconnect one client during test; confirm the same official scores reload without duplicate events or locally guessed results.
6. Validate concurrent scorer handling and idempotency. The current RPC uses a game row lock and increasing sequence numbers, but the client lacks an explicit per-action idempotency token; two independent legitimate scorers can still score the same real-world play twice.

**No real game results were inserted or changed during this audit.**
