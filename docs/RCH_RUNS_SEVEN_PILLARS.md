# RCH Runs — Seven-Pillar Product Contract

Purpose: a real-world basketball network that is simple for a first-time solo player, valuable for recurring athletes and instantly shareable without manufacturing status or game results.

## Non-negotiables

1. **High shareability.** Every real Run card gets a visible share button. Native share sheet first; copied invite includes real court, format, schedule and canonical Run Room URL. Public Run Room has a run-specific social preview. Publishing photos/videos attaches them to the Run and the basketball social timeline.
2. **Badge familiarity.** Use the existing 3-D medal/crest design and actual catalog tiers (bronze, silver, gold, etc.), with a clear distinction between *available to earn* and *earned*. Never imply a badge or competitive title was awarded before the backend awards it.
3. **Clean, accessible UI.** A new player can find an open roster spot without understanding REP, court dominion, sponsored operations or fantasy. Run cards lead with game, court, schedule, available spots, Join, and Share. Advanced facilities are behind disclosure. Buttons target at least 44px, have accessible labels and support keyboard.
4. **Real street culture.** Surface actual published clips tied to real Run Rooms. Let the courts and local players supply the culture; do not manufacture fictional highlights, caricatures, event attendance, or rankings. Published posts are still user-generated claims, not independent verification of specific people.
5. **Social flex.** Highlight sharing and an explicit player-triggered Run Passport share action expose **only existing, earned** badges, verified games and Run REP. No automated publishing of private performance statistics.
6. **Notable guests / celebrity sightings.** Never convert a rumored appearance, photo, face resemblance, or user-submitted post into a verified celebrity claim. Court photos require explicit publishing permission attestation; no tracking or exposing someone's live location. A verified guest badge or celebrity-specific alert **must not launch** without an editorial review workflow, explicit guest authorization and an after-event publication delay. At this stage, content may be shared only as a general *community court moment*, never as an independently verified celebrity sighting.
7. **Solo-friendly matchmaking & progression payoff.** Filter real open slots and rank by beginner/all-skill, community/social runs and time while leaving all eligible options accessible. A player registers individually using the existing RSVP system; no automatic teammate assignment or guaranteed spot. Check-in and highlight REP continue to use existing validated RPCs. Competitive ratings, titles and season drafting remain independently verified.

## Acceptance / regression checks

- Single-row mobile navigation and compact Runs actions remain intact.
- Solo filter never shows cancelled, full or past Runs as joinable; no fabricated players or events.
- Sharing URLs include the actual Run ID and metadata has only public event fields.
- Badge chase must show *available to earn*, not claim badges are already earned.
- Public court moments are sourced from `posts` with `status='published'` and non-null `run_id`, under current database RLS.
- Media uploader cannot publish without a permission attestation; status is not upgraded to "celebrity verified" by any upload.
- Run Passport share occurs only on explicit click and uses returned Run REP, verified-game and badge counts.
- No new REP/XP awards, ranking scores, celebrity verification or season draft eligibility are introduced by the UI layer.

## Follow-on functionality requiring a separate authorized backend scope

A real guest-feature / celebrity-sighting system would need verified opt-in appearances, administrator editorial review, consent evidence retention and removal, non-real-time release dates, clear source attribution, appeal/takedown controls, and anti-impersonation checks. Treat it as *unreleased* until these safeguards exist.
