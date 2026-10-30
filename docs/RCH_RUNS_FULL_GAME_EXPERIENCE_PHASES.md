# RCH Runs — Full Game Experience Program

## Product mandate
The cinematic Runs Home is the quality bar for every Runs destination. Keep the installed PWA social-first, but make Runs an immersive, connected, real-world basketball game that retains independent score verification, permitted outdoor Parks & Recreation courts, RLS, player privacy and the explicit pilot 8/10 evidence gate.

## Player journey
PLAY → JOIN → ARRIVE → NEXT UP → SCORE REVIEW → VERIFIED POSTGAME → PLAY AGAIN.

A roster RSVP cannot be described as checked-in; an open-court idea is not a hosted event; a recorded pickup scorecard is not an independently verified competitive result; no awards or ranks can be manufactured by the client.

## Release 1: Shared game language (this PR)
- Add RunsGameChrome to list and detail routes and Crew HQ. Four player destinations: Play, World, Crews, MyPLAYER. Authenticated HUD reads existing World XP/Hooper Level, wallet REP, and verified game count without privileged mutations.
- Match detailed Runs dock to the cinematic four-mode navigation. The World game retains its own dock; avoid duplicate fixed overlays.
- Run room receives a real-world game lifecycle panel: join, on-site check-in, on-deck, independent confirmation; actual roster slots with real player identities; unverified-score warning; verified postgame only from existing get_rch_world_expansion player receipts scoped by run ID.
- Unified responsive contrast, keyboard focus, clear small-screen actions and reduced-motion support.
- Preserve existing host, scorekeeper, referee, check-in, moderation, crew and court APIs. No database migrations or fake Run fixtures.
- No automatic pilot approval. Record independent evidence for each category using the 8/10 gate.

## Release 2: End-to-end game day
1. Game lobby: two-team assignments, roster waitlist, accessible player cards, clear host-issued readiness and verified attendance. Venue permission, weather and actual participation remain distinct from registered count.
2. Game day: Next Up states, on-court game status, score review tasks and opponent confirmation. Display score submission versus certification distinctly.
3. Postgame: one receipt-driven recap, achievement reveal, optional audio/haptics, rematch and share; server-side idempotent XP/REP rewards.

## Release 3: MyPLAYER + Crew HQ + Court Arena
1. Consolidate verified World XP, Hooper Level, competitive Elo by format, spendable REP, badges and certified crowns into one career dashboard; never merge distinct currencies.
2. Crew HQ roster cards, captain-verified challenges, lineups, records, invites, rivalries, home-court identity, territorial title defense.
3. Integrate sourced outdoor-court map pins, venue warnings, verified court status, match history and Court Master records in a unified Arena scene.

## Release 4: Ranked Arena and replay
1. Competitive tiers and history backed by independently verified results; show provisional states and disputes.
2. Persistent weekly goals, opt-in non-competitive culture quests, game scheduling, crew rivalry history and returning-player next actions.
3. Commonwealth Cup eligibility, schedule and verified tournament path; official Rich City League pro season remains November 2027.

## Acceptance and non-negotiables
- Preserve the existing Game Studio 8/10 pilot gate and Richmond first-event go/no-go guide.
- Every release: 320–430px iPhone and Android checks, no double fixed navigation, no horizontal clipping, accessibility and reduced motion.
- Real-account two-device test with at least one genuine hosted 3v3 event and 6 players; independently check score acknowledgments, XP/REP ledger deltas, cancellation and consent; no phantom achievements.
- Score all nine game dimensions at least 8/10 with independent evidence before the official pilot. Code merge and HTTP 200 alone do not constitute game readiness.
- If no real hosted game exists, provide a valid creation/discovery action without fictional opponents or activity.
