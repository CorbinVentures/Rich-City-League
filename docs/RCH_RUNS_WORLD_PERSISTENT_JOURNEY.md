# Runs World — Persistent Basketball Journey

## Player experience
- World: city portals, real verified courts, real upcoming Runs, gold crowns for crew-owned parks, purple challenged courts, and gold-blue double REP courts.
- Court Arenas: verified Court Master ladders, crews, scheduled games, and real challenges; no fake winners.
- Missions: daily court scouting and weekly registration, verified matches and wins. Progress persists on the user's RCH account.
- Vault: authentic verified-basketball milestones plus opt-in court stamp journal. Scouting is an app action, not a physical check-in.
- My Player: independent persistent World XP and level based exclusively on independently verified real games, wins and distinct played-at courts.

## Durable data and controls
- New rch_world_court_scouts table is owned by profile ID with read-only owner RLS.
- All writes pass through the authenticated RPC rch_world_scout_court and validate active official/provider, public, outdoor court.
- Authenticated private get_rch_world_journey computes progression from verified ranked match data and safe registrations.
- World XP = 120 per verified match + 60 per verified win + 25 per distinct verified played-at court.
- World level = 1 + floor(sqrt(XP/180)); derived display only, never deposited in the spendable REP wallet.
- Mission completion cannot change basketball rating, match status, crew title, trophy, or REP.
- Weekly reset uses America/New_York; daily scout tasks also use America/New_York.

## Operational and location limitations
- Map pins appear only for real, recorded court coordinates. Location choice is manual unless user opts into existing device-city functionality.
- Public park listings are never a promise of organized attendance, staffing, exclusive court rights or a legal permit.
- Unverified results do not count and an uncompleted battle remains pending.
- Full AR camera overlays, continuous GPS and real-time multiplayer 3D avatars are separate future features, not falsely claimed in this milestone.

## Validation
- BEGIN/ROLLBACK migration dry run succeeded in connected production database (no live schema mutation).
- Database role-grant check: authenticated may call scout RPC, anon may not, and authenticated cannot insert scout rows directly.
- Unit tests cover XP, missions, court state markers, location precision and UI integration.