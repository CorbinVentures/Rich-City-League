# RCH Runs — Statewide Operating Standard

**Status:** Engineering policy baseline. Competition format-specific rules, age brackets, physical facility permissions, and any fees require separately published event terms.

## 1. Three distinct competition domains

- **Runs:** Year-round Virginia pickup and ranked basketball, local Court Master titles, verified basketball statistics, Run REP, queue operations and legitimate host discovery.
- **Crews:** Player-created teams, local win-rate tables, territory stamps and accepted Takeover challenges. Crew court ownership is not an individual Master title.
- **Commonwealth Cup:** Separate elite qualification and event competition using qualifying verified Runs; qualifying does not grant court ownership.
- **Rich City League:** Separate professional-style league with its own governance, membership, teams, season calendar and event entertainment.

Shared authentication does not imply shared game rules, standings or award entitlements.

## 2. Result evidence and title authority

1. Ranked games are created only for structured competitive formats from 1v1 through 5v5. A host records the final game, both sides independently confirm, and the server applies the format-specific skill change and Run REP.
2. Rostered players must check in. A check-in alone is never proof of physical presence, athletic performance or score accuracy.
3. Approved Court Masters for 1v1, 2v2 and 3v3 require a minimum court history before the first crown. Challenge requests must select the correct court, format and an actual upcoming Run.
4. An accepted Master challenge or crew Takeover cannot resolve without an independent authorized official's matching, score-bound evidence and both sides' normal confirmation.
5. Titles and territory transfers, audit trails and rewards must be transactional and idempotent. Browser clients cannot grant themselves wins, REP, badges, crowns, territory or official designation.
6. Rejected and resubmitted scores invalidate previous title attestations. No verified match history is silently edited.

## 3. Appeals and safety

- Involved competitors and the host can file evidence-based integrity cases within **14 days** of match submission.
- Authorized RCH staff review cases and document their rationale. Pending scores can be rejected for correction and resubmission; verified ratings require a separately audited remediation procedure rather than an undocumented overwrite.
- Hosts manage court conduct and facility rules; RCH staff may revoke a verified event or organizer credential where the operating evidence is inadequate.
- User-generated reports are allegations until reviewed. Do not treat an allegation as a proven violation.
- Do not require live precise geolocation for casual discovery. Court-level presence must not expose a member's live movements, home address, or arrival history to the public.
- Event organizers are responsible for obtaining permission to use facilities and for following venue and applicable local safety requirements.
- Access involving minors must comply with the platform's age and privacy policies, with age-specific event safeguards.

## 4. Next Up and operational reliability

- Next Up has server-authoritative participant entry and host/cohost/scorekeeper state changes.
- Queue order is based on entry, not purchased REP or ratings. Organizers can call, begin or finish queue entries, but these actions do **not** establish a verified final match score.
- A Run cannot retain its RCH Verified designation if its host, location, start time, format or other material details are changed without re-review.
- Community-sourced court records are discovery aids, not official facility approval.
- Realtime status must respect participant-level row policies and the presence of a manual refresh path.

## 5. Meaning of RCH Verified

There are two layers, and neither can be bought with REP:

1. **RCH Verified Host:** A person whose submitted basketball operating experience received human review. Credentials expire and can be suspended.
2. **RCH Verified Run:** A particular scheduled event with a current verified host, acceptable venue provenance or a time-limited physical review, documented venue/rules/safety readiness and an independent official for competitive Runs.

A Verified badge is **not** a criminal background check, insurance assurance, guarantee of safety or attendance, and it does not authenticate future box scores.

## 6. Expansion operating scorecard

Track, by locality and region, the following metrics using real database events and **not invented live presence**:

- Weekly distinct participants in independently verified games
- 28-day repeat participation and session fill-rate
- Number of active courts with repeated verified matches
- Pending scores, median time to verification, appeal rate and confirmed integrity incidents
- Next Up wait times, no-show rates and organizer responsiveness
- Verified Hosts, venue audits requiring renewal, revoked badges and contested credentials
- Master defenses, crew Takeovers and qualification into independent Cup competitions

Statewide expansion should favor a small number of genuinely active, dependable courts over a visually impressive but inactive statewide map.

## 7. Release quality gates

No production release without successful application build/tests, database migrations and authorization tests, Supabase preview, and Vercel checks. Historical league and Runs records must never be backfilled as verified titles without authentic match evidence. A production deployment is a technical milestone, **not** proof of successful physical event operations. Live-player pilot testing and independent official training remain mandatory launch activities.
