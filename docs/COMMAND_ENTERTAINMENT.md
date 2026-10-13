# Entertainment department

Open `/command#entertainment` as an active league administrator. The department uses the same private Command Center access model and audit history.

## Plan and run an event

1. Choose a full-game, cheer/dance, halftime or offsite playbook. Create a named event with a time window, location and manager. Optionally link an official game; verify the imported time and venue.
2. Add performers or squads, contact information, booking state, fee/deposit, agreement references, permissions, arrival instructions, technical requirements and backups. Earlier event contacts can be copied, but confirmation and payment records reset.
3. Edit the run sheet. Every segment has placement, GO trigger, operator, performance duration, floor-reset allowance, asset link, announcer directions and fallback. Confirm actual timeout and halftime allowances with league officials.
4. Assign crew work, relative deadlines and blockers. Complete logistics evidence, access, technical needs and weather/cancellation planning. A not-needed control still requires a reason.
5. Save, resolve readiness items, then mark show-ready. Editing a ready plan returns it to planning. The database also enforces readiness, timing and game-schedule alignment.
6. Open show control. Start one cue at a time, finish/clear the floor, or skip with a reason. The server records cue timestamps and audits the operator. The planning timer includes reset time; officials and the official clock control play. Other saved workspaces refresh every 15 seconds while open, without replacing unsaved edits. Planning fields lock during live control; performer check-in remains available.
7. Complete or skip all cues before completing the event. Record expenses with receipt/ledger references, observed attendance with a counting source, and lessons for the next event. Cancelled events stop an active cue with a recorded reason.

## Assistance tools

- Full-game, cheer/dance, halftime and offsite starter playbooks.
- Timing checks for individual timeouts, the combined halftime show and offsite run-sheet duration.
- Readiness gaps, due assignments, budget variance, capacity variance and official-game rescheduling flags.
- Overlap warnings for matching performer names across noncancelled events. These are review prompts; travel time and identities still need staff confirmation.
- Reusable booking contacts, prewritten announcer/backup prompts and a downloadable text crew packet.
- Planned cost calculations include performer fees once; deposits are part of the fee. Actual payment totals include deposits. Blank actuals remain unknown, and partial totals are labelled as entered costs.

## Scope and controls

This is internal management, not an automated booking, messaging, payments, ticketing or media-playback service. Staff attach links/references to existing agreements and assets. Event accounting does not create duplicate Financial Office ledger entries. Official game records, clocks and results are never changed.

Events use optimistic revisions to reject conflicting saves. Download the crew packet before reloading if another operator has edited the event. No local browser storage contains private performer contacts. There is no client delete permission; cancellation and audited changes preserve history.

## Verification

13 focused tests plus the existing application suite cover playbooks, timing, fee/deposit math, overlap flags, deadline shifts, readiness, sourced actuals, countdown and briefing exports. Rollback-only database tests verify admin creation, readiness rejection, stale revisions, the complete show lifecycle, server cue timestamps, single-live-cue enforcement, completion gates, audit and nonadmin isolation. Signed-in visual/browser validation is separate from these checks.
