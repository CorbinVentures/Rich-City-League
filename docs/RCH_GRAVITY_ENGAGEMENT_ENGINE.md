# RCH Gravity — Virginia Basketball Relevance & Retention Engine

## North star
**Make the next meaningful basketball action easier, not the next scroll.**

Rich City Hoops is a free statewide network, not only the Rich City League flagship.
Success is when a member finds a real opportunity, joins an actual community,
attends a run, watches a game, learns a skill, improves a player profile,
meets a coach, or discovers content worth discussing.

The platform must work for players, fans, basketball creators, coaches, trainers,
referees, external organizers and adult cheerleading participants. It should
never make an external competing organization less discoverable merely because
Rich City League operates the platform.

## Experience loops
1. **Opportunity:** Discover → save → attend/participate → share → follow → next run.
2. **Community:** Meet a member → follow/join neighborhood → converse → return to replies.
3. **Progression:** Verified practice/game/creator contribution → REP/badge/profile → next meaningful goal.
4. **Entertainment:** Matchup → storyline → game night → RCH TV → discussion → next matchup.
5. **Contribution:** Coach/organizer/creator publishes genuine value → relevant audience reaches it → useful feedback → more contributions.

### The Gravity candidate model
Feed, events, runs, games, members, communities, missions and relevant media
are different **types of a recommendation candidate**. Candidate discovery is
separate from ranking; the source queries must already enforce publication
status, access rights, moderation, eligible age and RLS.

Available transparent signals:
- **Explicit intent**: Play, Watch, Connect, Create, Build, plus Scene goal.
- **Selected city**: user-selected municipality, never precise GPS by default.
- **Relationships**: who they actually follow, own memberships and saved items.
- **Real-world relevance**: event time, venue, availability and confirmed participation.
- **Verified progress**: mission completion, attended runs, official games and awards.
- **Proven engagement**: genuine replies, saves, comments, shares, reactions.
- **Freshness**: new posts, near-term events, official game progression.
- **Discovery diversity**: different categories, organizations and creators.

### v1 formula (bounded 0–1)
- Preference and basketball goal relevance: **27%**
- User-selected city relevance: **18%**
- Existing social relationships: **16%**
- Actionability / verified mission progress / saved: **15%**
- Real timing and recency: **11%**
- Real interaction counts with saturation: **6%**
- Deterministic discovery variety: **5%**
- Verification signal: **2%**

The daily 5% exploration value is stable for a user and candidate, not random
per render. No user has to manufacture activity to improve visibility. Category
and author caps diversify the first six items when alternatives exist.
Explicit chronological/following modes remain untouched.

Eligibility rules happen **before** ranking: hide blocked and hidden items;
exclude cancelled/full and expired opportunities. For official live games,
a live status should be supplied by the trusted source rather than inferred.
A recommendation cannot grant access to a hidden/private item.

### What is live in the first code slice
- Shared scoring/ranking library: `src/lib/rch-gravity.ts`.
- Discover / The Scene "For you" ranking uses the same engine. "Soonest first"
  remains nonpersonalized. Explicit goal persists on the device.
- Social Pulse "For You" blends Gravity with the existing social scorer;
  Following and Trending modes remain unchanged.
- RCH Today prioritizes genuine, unclaimed weekly mission opportunities
  using the explicit shared goal and real progress from Supabase.
- Tested eligibility, stable scoring, category diversity and cold start.

**Important:** v1 uses the existing per-device preference keys. It does **not**
yet persist a unified member interest graph across devices, deliver new
notifications, build a background job, or claim any measured retention uplift.
The social feed still fetches a limited recent post candidate pool, so a ranked
feed cannot recover older relevant posts that its query did not fetch.

## Recommended production phases

### Phase 2: Member signal store (Supabase)
Use a versioned schema, safe RLS, retention policy, opt-out and role-appropriate
access. Avoid storing sensitive traits or precise geolocation.

- `gravity_member_preferences`: one row per authenticated member;
  explicit interests, optional Virginia city, category exclusions,
  preference-learning switch, updated_at.
- `gravity_member_feedback`: hidden entity IDs, muted/blocked topics,
  "show me more / less" feedback. Private to the member.
- `gravity_interactions`: event_id, member_id, entity_type, entity_id,
  event_type, occurred_at, optional minimal context; append by authorized user
  or trusted backend with idempotency, rate limits, TTL and bot protection.
- `gravity_candidate_snapshots`: materialized, safe, published summaries only
  for eligible post/event/game/clip/run/community/profile records.
- `gravity_experiments`: consented assignment to ranking variants and
  aggregate metric reporting. Keep statistical logic separate from REP.

Before schema changes: verify latest Supabase release details, create a
migration via CLI, prove SQL policies with allow/deny tests for anon,
authenticated owner, other member and staff. Never expose service credentials
or sensitive preferences in public-profile reads.

### Phase 3: Site-wide entity intelligence
Connect authoritative source transitions (not passive page views alone):
- Runs: joined, verified attended, next run, cancelled, full.
- Games: official schedule, tip-off, result, player stats, fantasy consequences.
- RCH TV: published clip, followed creator, tagged player, upcoming broadcast.
- Communities/Neighborhood: real membership, real replies, actual events.
- Players/Coaches: trusted official profile links, verified badges, actual
  roster relationships and coaching opportunities.
- Organizations: active public events, claimed pages, regional relevance.
- REP: completed missions, awards, confirmed outcomes and optional goals.
- Franchise/league: relevant territory stories and verified game milestones.

The authoring system must not generate fake game outcomes or fabricate event
scarcity. League news editorial and sponsored inventory remain distinct.
Paid promotions must be clearly labeled and cannot change organic REP,
rankings, competitive results or the trustworthiness of external leagues.

### Phase 4: Member-facing experiences
1. **Home/Pulse:** a local-first mixed feed of social, games, clips, milestones.
2. **Discover:** relevant upcoming Virginia events by chosen goal and location.
3. **RCH Today:** a maximum-three "Your Next Move" rail prioritizing a useful
   action, an upcoming live event, and one discovery item when available.
4. **Profiles:** verified personal progress, actual teammates, nearby peers
   and recommendations appropriate to profile privacy settings.
5. **League & RCH TV:** continuity between the story, game, highlights and
   next scheduled matchup.
6. **Notifications:** high-confidence signals only, digest default, user
   preferences, quiet hours and frequency caps.
7. **Organizations/creators:** opportunity-to-reach feedback and professional
   analytics without revealing private audience identity.

Every recommendation should have a short **Why am I seeing this?** reason.
Users must be able to choose Following/Latest, mute a topic, hide an item,
reset interests and turn personalization off. Those decisions must persist
with an account in Phase 2.

### Phase 5: Measurement and safe optimization
Primary metric: **weekly meaningful returning participants**, measured by
a return session with at least one real action (save, comment, follow,
attend/check-in, finished training, relevant outbound event click or
verified game participation). Do not optimize endless watch time.

Supporting measures:
- D1/D7/D30 returning members with meaningful participation.
- Saved-to-attended event conversion, with verified attendance where possible.
- Creator/organizer first-value time and 30-day contributor retention.
- Discovery coverage by Virginia city and by non-flagship organizations.
- Search abandonment, relevance "not interested" feedback and notification opt-outs.
- Inappropriate recommendations, reports and appeal rates.
- Page performance and ranking latency on low-bandwidth mobile.
- Exclude staff bots/system accounts from human retention metrics.

Use a fixed holdout and compare against chronological or baseline relevance.
Segment by **voluntary goals and use cases**, not protected characteristics.
Declare an experiment a success only after meaningful participation improves
without disproportionate notification opt-outs, reports or lower creator
diversity. No pre-claim that an algorithm improves retention.

## Guardrails
- No fabricated social proof, guaranteed exposure, fake scarcity or punishments
  for taking a break. No endless nudges about streak losses.
- No sensitive inferred traits, precise location collection, shadow profiles
  or sale of behavioral profiles.
- Visibility, moderation, consent, adult-only cheerleading rules and public age
  restrictions always take precedence over personalization.
- No content from private groups/friends is exposed in public discovery.
- Never use the recommendation score as a permission or role check.
- Don't use "personalization" as a way to drown out competing Virginia leagues.
- Young members are not recommended adult-only opportunities or profiles.
- Ranking results should fall back safely if storage, data or signals fail.

## Location intelligence v1 — consent-first regional discovery (2026-10-16)

The member's location preference is part of Gravity's explicit relevance context.
Members may **select a Virginia city**, choose a soft **25 / 50 / 100-mile**
radius, opt into the browser's location prompt with **Use my location**, or
clear their location preference by selecting **All Virginia**. The initial state
is always statewide; do not infer from IP address or request browser location
on mount.

- Browser coordinates are used transiently *on-device* to find the nearest
  mapped Virginia city anchor. Only a city ID, radius, and source (manual/device)
  are retained in `localStorage`. Never log or transmit raw coordinates.
- The city anchors come from `src/lib/virginia-world.ts`. Their centroid
  distances are **approximate context signals**, not walking/driving distances,
  event attendance proof, or a claim about precise venues.
- Nearby towns receive partial relevance rather than an exact-city-only boost:
  e.g. Chesterfield, Petersburg and Richmond should not be separate islands.
- Unknown or statewide locations receive neutral scoring, so rural communities
  and regionless statewide broadcasts do not disappear.
- Radius is a **soft ranking preference**. Users still discover worthwhile
  events outside the chosen area and can clear the preference at any time.
- Existing publication, moderation, age, privacy, capacity and authorization
  rules must be enforced before recommendation. The location preference cannot
  bypass them.
- The same coarse city preference currently influences **Discover**, **Runs**,
  **RCH Today**, **Pulse's local run opportunities**, and **Communities**.
  Location controls are also available under `/settings/discovery` and the
  member sidebar.
- Never infer or expose another person's location from their social posts.
  Creator/profile location suggestions require separate, explicit public profile
  location disclosure and consent.

### Known limitations / rollout
1. This first implementation is **device-local**, not cross-device synced.
   A private, RLS-protected member preference table is future work; public
   profile city is not a substitute for a private discovery preference.
2. A fixed set of Virginia city anchors can misrepresent smaller towns.
   Offer manual selection even if the browser is blocked or outside Virginia.
3. Discover/Today/Pulse currently rank only the candidates their existing
   query has already retrieved. A future server-side candidate retrieval
   layer should expand geographic recall before ranking.
4. Organization-sponsored inventory must be labeled and never receive organic
   priority merely due to payment. A city preference does not imply consent
   to location-targeted advertising.
5. Maintain a location-discovery feedback loop: report irrelevant distance,
   missing towns, search abandonment, opt-outs, nearby run saves, and
   verified event attendance. Keep reporting aggregate and non-sensitive.

### Validation gate
- Run `npm run type-check` and `npm test -- tests/rch-gravity-location.test.ts`.
- Test new member (no location), manual city, radius changes, All Virginia,
  blocked geolocation, iOS standalone PWA, and cross-tab preference updates.
- Compare recommendations in Richmond, Petersburg, Norfolk and Roanoke.
- Confirm no exact browser coordinates reach network requests, persisted
  preferences, profiles, audit logs or analytics; inspect DevTools requests.
- Confirm search and explicit filters still take priority over ranking.
- Run mobile visual/contrast and performance tests before release.
