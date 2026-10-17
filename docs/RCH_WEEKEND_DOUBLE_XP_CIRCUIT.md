# RCH Weekend Double XP Circuit — operating contract

**Goal:** Each participating Virginia city uses four distinct real public outdoor basketball courts to publish two weekend community-drop-in Runs. Week A features courts 1 and 2; Week B features courts 3 and 4; repeat indefinitely. Only independently verified basketball earnings receive 2× Runs REP.

## Schedule and coverage
- October 24, 2026 is the Week A anchor. The next Saturday uses Week B. Saturday at 11 a.m. and Sunday at 3 p.m. in America/New_York.
- A daily 09:15 UTC database cron job maintains eight upcoming weekends. A city/weekend/slot uniqueness constraint avoids duplications even on repeated job execution.
- Richmond and Newport News are seeded from official city park and municipal court records already in the RCH court directory. No other city activates until four *different* eligible public outdoor courts are mapped and configured by staff. North Chesterfield currently has only three matching distinct park locations in the directory.

## Operational disclosure
- These are COMMUNITY drop-in suggestions, NOT guaranteed reserved parks, staff-organized events, tournaments, referee assignments, current court availability, insurance, or evidence that people will attend.
- The RCH admin profile is the database listing owner, not a promise the admin will be on-site.
- Featured events use the platform's existing structured 3v3 format for ranked games; non-ranked pickup is welcome. Independently confirmed 3v3 results require existing staff/host and opposing-team validations.
- Venue permissions, operating hours, weather and safety remain obligations for any organizer attending.

## Verified reward policy
- Featured event records are controlled only by trusted DB logic; users cannot mark their own Run as 2×.
- Server-only BEFORE INSERT triggers double REP on genuinely verified game and reviewed-stat earning rows only if run ID, court and start time match the immutable circuit listing and the Run is not cancelled.
- Normal 10/30/90 verified game REP becomes 20/60/180 on eligible sessions. Stat bonus rises from a maximum of 30 to 60. The existing one-time source identities and wallet ledger avoid repeat credits.
- Standard check-in, highlight, referral, social XP, league and crew rewards remain normal 1×. Player-created Runs always remain normal 1×. Earned ratings, badges and territory transfers follow their existing independent rules.
- Event labels explicitly say "2× VERIFIED REP" rather than promising automatic rewards for simply joining.

## Operator setup
1. Verify access and four distinct municipal/provider-certified outdoor park records per city.
2. Configure city + court slots 1 through 4 in rch_weekend_circuit_courts (staff only), and check court hours for the proposed weekly times.
3. Once all four sites are eligible, the next daily job creates listings; do not repurpose existing Run RSVPs by editing court/time after publishing.
4. Cancel a Run in the existing Runs management flow if weather, public access, staffing or safety require cancellation; the scheduler will not silently replace a cancelled published entry.
5. Track real participation and reviewed outcomes before claiming activity or impact in any locality.

## Release gates
Run test/type-check/lint/build, full migration replay, RLS tests and Vercel preview checks. In a transaction that is rolled back, verify four-court eligibility, one Saturday + one Sunday listing per city, alternating city court slots, no duplicate records on second invocation, and client inability to create featured entries. After release, monitor cron job history and event listing health. Municipal venue access must still be independently verified.
