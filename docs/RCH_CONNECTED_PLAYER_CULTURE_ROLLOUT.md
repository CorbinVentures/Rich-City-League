# Rich City Hoops — Connected Player Culture Rollout

**Status:** Foundation branch only; not merged, not deployed, and not signed off on an installed PWA.
**Target:** Rich City Hoops basketball social PWA. Preserve public browser homepage and league administration.
**Design source:** `RCL_DESIGN_CONTRACT.md` and `docs/RCH_PWA_VISUAL_REVIEW_2026-10-26.md`.
**Baseline:** main at `54a804a40ba8cc84f956d5da2374e34f23edfda4` (October 26, 2026).

## Vision

One real basketball identity connects actual local games, public outdoor court communities, player highlights, friends, workouts, creator contributions, and music. Keep the PWA five-tab navigation **Home, Runs, League, Draft, Profile**. Do not place a second feature directory or competing promotional dashboard in Home.

## Implemented on this non-production branch

### MyPLAYER / coach / fan profile clarity (foundation)

- New `ProfileSectionNavigation` replaces a long, horizontally scrolling row of profile sections with three role-specific primary actions plus **More**.
- Player primary: Highlights / Stats / Wall. Coach: Coaching / Wall / Posts. Fan: Wall / Posts / Media.
- Existing `?tab=` deep links, follower counts, badges, career, legacy profile sections and profile privacy remain usable via **More**.
- Player showcase links into the existing `/runs?view=list&solo=1` solo-friendly Runs filter; game signups and any age restrictions remain with their existing controllers.
- Existing basketball ratings and game statistics remain sourced from trusted data; there are no user-edited ratings, new REP awards or fictional player cards.

### Court Pulse (foundation)

- `CourtPulseFeed` is mounted on the existing `/runs/courts/[slug]` route above advanced territory and competition tools.
- It reads published posts associated with actual recorded Runs at the selected court and posts from the court's **public** community, using existing user-level RLS.
- It uses the selected court's real slug, real post IDs and existing canonical post/community routes; it never fabricates a player, event, stat, court record or video.
- Empty and unavailable states do not claim activity.
- Only eligible, active outdoor Parks & Recreation court routes from `rch_runs_outdoor_courts` can reach this court page. Facility verification is not a live reservation or attendance confirmation.
- `court-pulse.ts` includes media URL filtering and source Run-ID de-duplication with Vitest coverage.
- The feed is an initial slice of recent real activity, not a complete historical inventory; all activity is still subject to RLS and source-record retention.

### Music identity (foundation)

- Existing Audius catalog and profile song IDs remain unchanged.
- Profile song playback requires deliberate visitor interaction instead of autoplay.
- Hidden-tab audio pauses, the UI uses the approved charcoal/crimson tokens, and provider failure is nonfatal.
- No new copyrighted-audio ingestion or upload pipeline.

### RCH Mixtapes v1 — own published videos (source staged)

- `supabase/migrations/20261026162500_rch_own_media_mixtapes.sql` defines draft/published playlists, 1–12 ordered post references, owner-only post eligibility, rights attestation, atomic `rch_publish_own_mixtape`, public-profile visibility, and source-revocation filtering. **This migration is committed but has not been executed.**
- `MixtapeStudio` is integrated within a player profile's existing Highlights tab. Owners select their own published video posts, confirm rights, and publish a collection with a simple title. Only first-party Supabase `media/{member-id}/posts` uploads are eligible for v1 playback.
- `/mixtapes/[id]` renders only individually readable, first-party source clips, with one video playing at a time, a share link, original-post attribution, and owner withdrawal.
- No video duplication/transcoding, third-party license assumption, RCH TV earnings, REP farming, automatic player tagging, or new navigation tab.
- `supabase/tests/rch_mixtapes_security_test.sql` `tests/rch-mixtapes-integrity.test.ts`, and `src/lib/rch-mixtapes.test.ts` cover the intended constraints. **Database authorization tests must run in local Supabase before migration rollout.**
- Preview deployments may build this source but will show no Mixtapes until the migration has been approved and applied. Do not apply it to production just to enable preview content.

### Consented player + creator credits (code staged, migration NOT executed)

- `supabase/migrations/20261026173000_rch_consented_tags_and_lifestyle.sql` adds `rch_post_tag_requests` and `rch_post_topics` with RLS, adult-only tag eligibility, request rate limiting and one-way acceptance/decline transitions.
- A post author can request a player tag or community creator credit for their **own published post** by exact username. Only the tagged member can approve or decline it, and approved tags can be withdrawn. No public player tag is created by default.
- The existing original-post detail (focus) view renders credits only after acceptance. A community creator credit is NOT an RCH TV license, media reuse grant, verified official roster, or right to compensation.
- For this first release minors and profiles with unknown birthdate cannot be tagged. This restriction is server-authorized without exposing birthdays to the browser; a broader consent system requires a separate safeguarding review.
- Existing `/media/creators/apply` remains the RCH TV application path. No new creator directory or payout logic is introduced.
- Test coverage staged in `supabase/tests/rch_social_consent_security_test.sql` and `tests/rch-connected-culture-consent.test.ts`. Local RLS test execution is a merge prerequisite.

### Kicks & Fits (code staged, migration NOT executed)

- Home composer gains a single optional `Kicks & Fits` topic toggle; post publishing remains on the existing timeline.
- Topic records point to genuine existing published posts. Member profiles display only visible, appropriately labeled lifestyle content in the existing Media section.
- This is not a marketplace, store catalog, brand endorsement, or sixth PWA tab.
- If the feature migration is not available, social publishing remains functional but topic association may not be saved.

### The Lab profile integration (code staged)

- The player Stats view adds a private, own-account-only list of completed `lab_sessions` from the existing training backend.
- No new Lab route is invented: a standalone `/lab` route was not found on this branch.
- The Lab panel does not expose workout details publicly, issue official scoring awards, or publish accomplishments to the timeline.
- Completing training does not modify Game IQ, REP, league statistics or rankings.

## Remaining engineering slices — future approvals required

### Slice A — Future enhanced licensing, player tags for minors and third-party reuse

1. Existing consented adult player/creator credit requests are staged. Build a separately approved `rch_media_permissions` contract for cross-author uploads, RCH TV licensing, and eligible youth safeguards before permitting further distribution.
2. Reuse published social media and RCH Clips. Do not copy video files. Resolve media visibility at every read.
3. Require an affirmative tagged-player decision before cross-publishing to their profile. Allow revocation; remove derivative thumbnails and preview links on takedown.
4. Maintain the staged Mixtape v1 ordered-playlist behavior and 12-item limit; future remixing or cross-author inclusion requires separate rights validation.
5. Preserve existing highlight moderation, anti-REP-farming and verified game rules.

**Gate:** two-account player tag accept/reject/revoke tests; deleted/private source media no longer renders anywhere; no duplicate progress payouts.

### Slice B — Solo Squad Finder

1. The existing `rankSoloRuns` and `isSoloJoinable` Runs search is already linked from MyPLAYER. Validate signups with real capacity and correct eligibility.
2. Add opt-in, expiring preference records and private invitations; all RSVP operations still use existing `run_players` registration.
3. Recheck status, capacity, age permissions, blocks and privacy atomically before acceptance.
4. No continuous GPS tracking or public exposure of precise whereabouts.
5. Design explicit safeguards before allowing matchmaking exposure for 17-year-old accounts.

**Gate:** full/cancelled/past runs never joinable; races cannot overbook; blocked and nonconsenting accounts cannot be contacted.

### Slice C — Moderated creator directory and deeper Kicks & Fits discovery

1. Community creator portfolios reuse `profiles` and the established RCH TV application paths, but **never** confer compensated/approved/licensed creator status.
2. Credited video tags require provenance and removal controls; existing creator accounting remains separate.
3. Kicks & Fits already has a staged optional composer topic and profile collection; only add broader discovery after actual engagement is validated.
4. Preserve existing post moderation, audience controls, trademark guidance, report flows and self-reported label treatment.

**Gate:** unauthorized credits and rights unverified redistribution cannot publish; creator payouts are not implied by portfolio activation.

### Slice D — Opt-in public Lab accomplishments + contextual Home discovery

1. A private owner-only Lab history panel is staged. A future public opt-in accomplishment share needs a distinct permission schema and authoritative session reference.
2. Do not convert a self-reported workout into Game IQ, official league rank or tournament qualification.
3. Once real content is available, test one contextual card after several genuine organic Home posts, with frequency caps. Preserve For You and Following behavior.
4. No artificial notifications, manufactured scarcity or exposure of sensitive fitness metrics.

**Gate:** explicit publication consent, zero changes to protected competitive economics and existing social-feed tests pass.

## Backend, privacy and authorization contracts

- New exposed Supabase tables: enable RLS, apply ownership predicates with `auth.uid()`, grant only required operations and test both allowed and denied cases.
- Avoid user-editable JWT metadata for roles, insecure public service-role access, broadly callable security-definer routines and views that bypass RLS.
- Respect `profiles.profile_visibility`, member blocks, existing child protections, post/status moderation, court-eligibility policy and original media rights.
- Profile consent, tagged-player consent, publishing rights and creator licensing are **different** authorizations.
- Private media must not be published into public Storage merely to generate preview cards. Require a signed-URL or protected-transcoding design for private drafts.
- No newly introduced rewards or unverified badges.
- No new payments, location tracking, automatic filming, automatic public tagging or autoplay audio.

## QA / release gates

1. Node 22; `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:rls` when local Supabase is available.
2. Run existing `profile-showcase`, `profile-presentation`, `rch-visual-qa`, `rch-pwa-clarity`, Runs availability and court eligibility regressions.
3. Verify 320/375/390/430px phones, Safari installed PWA, iPad portrait/landscape, desktop, keyboard navigation, reduced motion, profile deep links, loading and no-data states.
4. Verify guest / player / coach / fan / blocked profile / private profile / 17-year-old profile with authorized test accounts.
5. Ensure the public browser homepage, Home feed, scorebook, Draft, Fantasy, admin routes and league operations remain unchanged.
6. Measure LCP/CLS and monitor social query load before exposing Court Pulse to all members.
7. Before merge: run a fresh diff against main, evaluate any conflicting UI changes, review permission effects, inspect preview **only when separately authorized**, and prepare rollback feature flags where needed.

**Verification limitation:** GitHub connector read/write does not execute the repository's local or Vercel build/test suite. No CI, installed PWA visual test or live Supabase security audit is claimed by this branch.

## Release policy

No merge, production promotion or database migration execution without a separate authorization. GitHub commits can automatically generate non-production Vercel preview builds via the existing Git integration; no production deployment was initiated. This document is a staged implementation record, not a statement that all eight features are live.
