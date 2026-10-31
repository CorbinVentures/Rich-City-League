# Rich City League roster integrity — verified database guard
**Date:** October 30, 2026  
**Source migration:** `supabase/migrations/20261030232834_rcl_one_active_team_per_player_per_season.sql`  
**Live project:** Rich City League, Supabase project `eoamxxvxswzudqwtbxvo`

## Purpose
A player must not have concurrent active roster assignments to different clubs **in the same season**. Release/reassignment histories remain preserved. A legal move to a new team must first close the prior membership by setting `left_at` and then create the new club membership. Existing roster records cannot be silently moved by changing the parent team-season's season or team ID.

This invariant applies to any season; it does not impose a permanent 12-player roster cap or declare any specific team admitted to the proposed November 2027 professional season.

## Implemented
1. A database trigger on `public.rosters` enforces the single-active-club rule for inserts and updates of player ID, team-season ID or release timestamp.
2. To avoid a race between simultaneous picks or coach signings, assignments for the same player and season are serialized with transaction-scoped Postgres advisory locks.
3. The lookup is performed by a restricted `SECURITY DEFINER` function in the unexposed `private` schema so coach RLS cannot hide another club's membership from this integrity check.
4. Another trigger rejects changes to `public.team_seasons.team_id` or `.season_id` if any roster history refers to that row.
5. The privileged trigger functions are not directly executable by public, anonymous or authenticated roles.

## Verification performed against live database
- Existing rows before migration: **0** in `public.rosters`; **0** same-season cross-club conflicts.
- Migration was applied by Supabase's migration action as version **20261030232834**.
- Trigger existence and security-definer location were verified through Postgres catalogs.
- A single explicit database transaction exercised:
  - first active membership succeeds;
  - a second active same-season, different-team membership raises SQLSTATE 23505;
  - moving the team-season identity once history exists raises SQLSTATE 23514;
  - setting `left_at` on the first assignment and then adding the athlete to the other club succeeds.
- The entire transaction was rolled back. Post-test roster count remained **0**.

## Remaining important gates
- This guard is **not** a Commissioner-approved player transfer protocol and does not verify signed contracts, injury permissions or payment. Those still require Basketball Operations and legal approval.
- Roster caps, waived-player priority, trade windows and age verification are separate policy decisions. Do not encode a proposed 12-player cap as a permanent global database restriction.
- Existing Draft Night readiness and eligibility RPCs should be rehearsed with representative test-season data; no official 2027 player selections or game records were generated here.
- Scorebook and Fantasy correction/lineup behavior must be tested end-to-end with authorized test fixtures before pilot opening night.

## Rollback and incident handling
Do not delete roster records to force a transfer; close the old record with its legitimate release timestamp and maintain a transaction log. If a valid assignment is unexpectedly rejected, inspect active memberships for **the same player and season** and review the proposed transaction rather than bypassing the trigger. Any migration rollback must be a controlled DBA action; dropping these guards without replacement reopens an integrity gap.
