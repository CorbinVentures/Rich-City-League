# 2027–28 Rich City League — inaugural basketball operations and roster policy
**Executive implementation baseline · 30 October 2026 · FOR REVIEW / NOT YET BINDING**

This operational plan accompanies `RCL_2027_28_COMPETITION_RULEBOOK_DRAFT.md`. An engineering preflight never substitutes for a commissioner signature or executed player, franchise, venue, insurance and labor arrangements. Existing team identities are not stripped of legacy status, and no historical season is renamed or overwritten.

## A. Recommended inaugural competition
- **Six** qualified clubs; don't confuse the twelve existing public identities with signed 2027–28 admissions. No teams are automatically removed or granted a franchise.
- Two regular-season games against each opponent, **one at home and one away**. Six teams × ten games ÷ two = **30** regular-season fixtures.
- Four playoff entrants. Proposed semi-finals: seed 1 v 4 and 2 v 3; championship matchup. The length, venues, prize and any third-place fixture require written approval.
- No divisions required for a six-team single table. Expansion to eight or twelve is a separate business decision based on geography, venue availability, finances and verified team commitments.
- Game rules: current FIBA 2026 is an **option** only where all venues have required officials, timing and shot-clock infrastructure; if not, select and consistently implement another complete sanctioned code before official play. See separate game-rules appendix.

## B. Club-admission gates
**Prospective → Diligence → Conditional → Admitted → Suspended/Withdrawn** is a proposed business process, not an existing database status.

**Documentation required before admission:**
1. Executed operating agreement with legal owner, primary contact, manager and head coach.
2. Approved team operating budget with identified payer for player compensation (if any), uniforms, venues, officials, staffing, insurance, transportation, marketing and production.
3. Venue reservation/contract, backup access and local travel feasibility.
4. General liability and other required insurance review; venue insurance requirements and player injury policy.
5. League-approved code of conduct, safeguarding and incident-response contacts.
6. Sponsorship and team branding rights, data and media delivery responsibilities.
7. Financial cure, forfeiture, suspension, withdrawal, refund and orderly replacement procedures.
8. Signed participation and publication acknowledgments.

**Launch threshold** is 6 admitted clubs, not 6 active `teams` records. A team-season database assignment is technical metadata only.

## C. Proposed roster maximum and approved acquisition channels
- **12 active roster places per admitted team** is the recommended planning cap; the commissioner must ratify the final number and minimum game-day eligibility.
- Club selection and athlete registration are separate from a signed player agreement. Draft selection **cannot alone guarantee an enforceable player obligation**; review the existing draft RPC's immediate roster assignment before opening the first official draft.
- Four-round draft with six clubs = 24 selection opportunities. With all clubs initially empty and a twelve-place cap, there would remain 48 places across the six teams. These must be assigned through a published free-agent, returning-player or other legally authorized process.
- For twelve clubs the existing preseason four-round snake preview represents 48 selections against a hypothetical 144 places (96 remaining). It remains a **preview** and is not transferable automatically to a six-club official season.
- Pre-approved eligible prospect pool must contain at least one unassigned, eligible active athlete for each scheduled live draft selection. Official `season_draft_readiness` RPC is authoritative for technical roster capacity and order.
- A player's assignment may not be active simultaneously on two official club rosters for the same season. Injured, suspended or ineligible players may not be misreported as game eligible; roster status and game eligibility are distinct fields.
- **Free agency**: commissioner-approved post-draft signings, with signed agreement, verified athlete identity and an audit entry. Prior clubs cannot claim perpetual rights through social followers, game clips, XP or prior Runs affiliation.
- **Trades**: prohibit until the league publishes a specific window, affected-player consent/contract policy, receiving club capacity, anti-collusion criteria and appeal procedure. App UI controls alone cannot create transaction authority.
- **Waivers/releases/injury replacements**: pending detailed league priority rules; no silent acquisition or backdated player eligibility. Every roster move needs a reason, effective timestamp, approving officer, player notice and audit record.

## D. Official player identity and eligibility
- Do not grant official draft eligibility from attendance alone. Staff verify age/identity, consent, contractual eligibility, disciplinary status and required tryout evaluations.
- An age-18 competition baseline remains subject to legal/insurance review; social platform registration policy is separate.
- NCAA-participating athletes must obtain their own compliance-office guidance before professional commitments or benefits.
- Player addresses, legal identity documents, evaluations and private injury records do not appear in public profiles or Fantasy.
- Verify official club roster at a published cutoff before each fixture; commissioner-approved late substitutions require documented exceptions.

## E. Games, incidents and statistics
- Facility certification, insurance, officials, score clock, shot clock where required, AED, emergency plan and clean court must pass a documented pregame inspection.
- Independent scorebook verification before an official final result; retain original recorded event, who changed it, why, reviewer and timestamp.
- Publication of Fantasy points must follow the same season-identified final official game record. Historical games, Runs or Commonwealth Cup do not automatically generate professional Fantasy scores.
- Publish in advance the timing and standing for protests, suspensions, correction appeals and roster forfeits.

## F. Draft, Fantasy and finance boundaries
- The formal draft may open only after confirmed official season, admitted clubs, signed rules, authorized coach assignments, certified player pool, complete order, correct roster capacity and mock-event tests.
- The displayed preseason allocation remains marked NOT LIVE until those prerequisites have been met.
- Initial Fantasy product is free-entry; salary-cap vs exclusive fantasy-player ownership is not yet chosen. A roster picker does not constitute an exclusive fantasy draft.
- No Fantasy season or private Fantasy league should activate from an imported season or from a non-RCL league.
- RCL headquarters and each club maintain **separate P&Ls**. No proposed revenue split creates equity, territory rights, profit guarantees or an automatic obligation to absorb venue/staff/insurance expense.
- No exact November 2027 opening day, team salary schedule or prize purse has been approved.

## G. Operational acceptance tests
1. Six signed club files recorded and independently approved; a seventh non-admitted club cannot be included in an official schedule.
2. 30 distinct regular-season fixtures; each admitted club has five home and five away fixtures, facing every other club once in each location.
3. No duplicate active player across same-season official rosters. Rejected changes must not partially update transactions or roster history.
4. A roster already at its maximum cannot accept a new draft/free-agent assignment.
5. An eligible player already on an official roster cannot be drafted again.
6. A draft with missing authorized coach, order, prospect or signed rules cannot proceed.
7. The server-side draft preflight returns zero blockers before the Commissioner **separately** grants live activation.
8. Official scorebook corrects disputed statistics without losing the original and independently approves the revision.
9. Historical seasons and non-RCL competitions do not activate 2027–28 Fantasy.
10. No system presents the pilot as official professional league play before approval.

## H. Outstanding implementation and approval decisions
- Commissioner and counsel: league legal status, player payment/classification, insurance, contracts, age policy and franchise agreements.
- Basketball Operations: chosen game rules, officiating and minimum playable roster, acquired player rights, returnee rules, trade/waiver policy, playoff and tiebreakers.
- Finance: actual venue/official/travel expenses and sponsor funding; documented contingent capital.
- Technology: a **database-level** season-specific roster exclusivity guard, auditable signed approvals, immutable Scorebook corrections, official-season ID scoping for write RPCs, and fully tested prelaunch workflow. These are not complete merely because a visual preflight exists.
- Fantasy: choose one fair manager roster allocation model, enforce it server-side, and confirm compliance before release.

**Production instruction:** no seed team/season/draft/roster data, no automatic announcement, and no live player selection until all approved gates are satisfied.
