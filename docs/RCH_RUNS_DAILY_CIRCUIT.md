# Runs Daily Circuit — release contract

## Purpose
Rich City Hoops should be worth checking each day because there is a real basketball
decision to make: which Run can I attend, who is playing, what court should my crew
challenge, and how has my *verified* performance changed? Do not optimize
compulsive app use, screen time, false streaks or notification clicks.

## Ranking v1 (maximum 100 points)
The candidate retrieval layer supplies up to 100 current Runs, public,
non-cancelled, with legitimate venue information. Server-authorized RLS always
takes precedence. The client uses:
- **28** points: proximity to a voluntarily selected Virginia city (coarse, not GPS)
- **17**: explicit 1v1/2v2/3v3/4v4/5v5 format preference
- **11**: the chosen competitive/social/training play style
- **15**: actual event date, with near-term opportunities prioritized
- **12**: whether a player can actually join (real slots, non-full status)
- **8**: a court the user explicitly watches (or **4** for a previously attended court)
- **4**: an already joined Run
- **3**: staff-verified Run (**1.5** for a human-approved host)
- **2**: deterministic daily exploration of alternative courts/hosts.

These are relative scores, not probabilities of attendance or game outcomes.
The displayed first six recommendations are diversified by host and mapped court.
The Daily Circuit features no more than three actionable, available Runs: a
strong next option, a host/court outside that pick, and an additional opportunity.

Daily rotation uses **America/New_York calendar boundaries**. It does **not**
award REP or status for logging in, and does not punish missed days. No fake
rivalry, invented crowd, generated game score, or false scarcity is permitted.

## Player controls
Format/style are explicit, not inferred from sensitive attributes. A member can
watch up to 12 mapped basketball courts and remove them anytime. These preferences
are protected by owner-only RLS and written through a validated RPC. Logged-out
sessions can explore without entering a profile or granting device location.
The user's existing selected-city radius remains a soft preference, not a hard
exclusion of rural or statewide opportunities.

## Competitive truth
- Existing opponent-confirmed ratings, official score reviews, REP ledger,
  verified skill mastery, court master titles and crew takeovers remain unchanged.
- The dashboard can display existing verified rating, wins, check-in-derived
  attended courts and current title records, but cannot assert a player is a
  court master without an authoritative title.
- Published Runs are not automatically independently verified.
- A host credential alone is not a guarantee of personal safety or venue access.
- Ads and sponsor placements are separate from this organic scorer.

## Validation and rollout
Use CI TypeScript, lint, full build, Vitest, Supabase full migration replay and
authorization tests; release after preview deploy is READY. Do not claim that
human users were tested until real signed-in members verify their own controls.

Measure **weekly members who return and complete a meaningful Run action**:
join, actual check-in, verified game, deliberate watched-court update, real
opponent confirmation, or a real organizer event. Compare to a chronological
baseline/holdout before claiming a retention gain. Track D1/D7/D30 return
*with meaningful action*, RSVP-to-check-in conversion, opportunities with
open spots by city, distinct organizers surfaced, low-capacity mistakes,
visibility complaints, notification opt-outs and latency. Do not reward
repeated refreshes or mere impressions.

## Next phase (not pretended to ship here)
- Real opt-in event notifications for watched courts/crew invitations, with
  quiet hours and per-member caps.
- Validated player-versus-player challenges tied to actual court master titles.
- Logged, consented A/B test comparing the new Daily Circuit to upcoming
  chronological order, with user ability to disable personalization.
- Organizer self-service schedule improvements and more complete statewide
  candidate retrieval beyond the first 100 public Run records.
