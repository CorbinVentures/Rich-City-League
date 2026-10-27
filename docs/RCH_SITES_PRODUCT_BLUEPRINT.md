# RCH Sites — multitenant basketball business website product

> **Status:** Implementation-ready design + pure code contracts. Not enabled in production. The first PR adds only the safe builder domain model and tests. No tenant database migrations, booking endpoints, payment accounts, public sites, or DNS changes have been deployed.

## 1. Product boundary and original Network compatibility

RCH Sites is an **opt-in website + operations product**, separate from the existing RCH Network listing and the RCH-owned Rich City League competition. `docs/RCL_NETWORK_EXPOSURE_MODEL.md` intentionally excludes third-party scheduling, rosters, payments and registrations from the Network product; that exclusion **continues to apply to Network**. RCH Sites implements these services in new tenant-scoped resources. Never repurpose main-site tables or extend tenant rights to global administrative systems.

- Primary customer: independent trainers, coaches, tournament organizers, basketball clubs, AAU teams and programs.
- Primary outcome: a useful website published in minutes, with booking, client communication and optional payment collection.
- Relationship: one existing approved `network_organizations` record to at most one site initially. Its verified `network_organization_members` define site access. An organization may retain its outside website and only use RCH Network.
- Tenant identity: immutable UUID organization ID, **not a browser-supplied slug**. Public slugs are marketing URLs, not authority.
- Public paths: `/sites/{slug}`; management path: `/network/dashboard/sites`. Avoid routing a tenant over the main homepage, social timeline, league, draft, search or admin paths.
- Future: verified custom domains and isolated subdomains, but do not accept user-selected domains until domain verification, TLS, redirect, SEO canonical and safe host routing are built.
- Preserve RCH-owned league, rankings, stats, REP, global editorial permissions, treasury, sponsor inventory and organization verification as operator-only systems.

## 2. Four-step, mobile-first onboarding

1. **Select organization:** sign in, pick an already verified/claimed organization; if missing, use existing Network claim/application flow. No arbitrary new organization can claim the name of an established team.
2. **Choose template:** Trainer, Coach, AAU Program or Organizer. Preview with actual organization data; no separate signup.
3. **Make it yours:** choose one of three approved palettes; upload logo/banner to tenant-scoped storage; set tagline/about/CTA and which fixed sections to display. The editable units are cards and form fields, not an HTML editor.
4. **Preview → Publish:** verify name, contact, policies, at least one contact method, media permissions and publication acknowledgement; assign a unique slug; publish server-side. Show a copyable public URL.

Target: first useful draft in less than 3 minutes using pre-existing organization profile. If a section is empty, hide it publicly instead of filling it with fake games or testimonials.

**Editor navigation:** `Site` · `Bookings` · `People` · `Payments` · `Insights` (five tabs max). Template-specific advanced settings remain in contextual panels, not the PWA Home feed.

## 3. Page templates and limits

| Customer | Homepage primary CTA | Default public blocks | Optional private features |
|---|---|---|---|
| Trainer | Book a session | Hero, About, Services, Schedule, Media, Contact | client portal, packages, progress files |
| Coach | Book coaching / Contact | Hero, About, Services, Schedule, Media, Contact | calendar, staff, private client notes |
| AAU program | Register interest / View tryouts | Hero, About, Roster, Schedule, Media, Contact | age groups, guardian portal, fees, roster management |
| Organizer | Browse events / Register | Hero, About, Schedule, Media, Contact | events, attendee lists, payouts |

Allowed blocks in v1: `hero`, `about`, `services`, `schedule`, `roster`, `media`, `contact`. No arbitrary custom code, editable navigation scripts, external pixels, scripts, CSS, inline HTML, custom JavaScript, database queries or privileged widgets. `src/lib/rch-site-builder.ts` defines the allowlisted theme/template presentation contract; presentation sanitization is **not authorization**.

Customization allowed: business name and description from approved listing, separate marketing tagline, approved palette, section toggles/reorder, service cards, public contact CTA, safe storage uploads and validated public social links. Brand mark `Powered by Rich City Hoops` cannot be used to falsely imply an organization is officially part of Rich City League.

## 4. Booking and scheduling

- Service: title, description, duration, optional buffer, price in integer cents (server authoritative), capacity, location type, cancellation policy, coach/staff assignment.
- Availability: IANA timezone, weekly schedule, exception dates, breaks, blackout windows and verified capacity. Never infer a slot from published opening hours.
- Flow: visitor selects service → sees only available times → identifies self/signs in or starts secure guest intake → temporary atomic hold → confirms free booking or completes hosted checkout → webhook confirms paid booking → calendar invite and confirmations.
- Atomic conflict safety: server-side transaction for slot claim; database exclusion/unique reservation protections, idempotency keys, and TTL for holds. Two concurrent requests must never book the same capacity.
- Cancellations/refunds: visible policy, host approval where applicable, webhook-canonical payment state, configurable reschedule window, UTC storage with timezone-aware display, DST handling. Use verified outbound email provider for notifications.
- Do not build booking via the existing `rcl_command_bookings` table: those are internal RCH league administration resources.

## 5. Payments: two separate rails

**A. RCH Sites subscription revenue:** separately managed Stripe Billing product attached to the RCH platform's own revenue account. Existing Network Amplify/Premier partner promotion plans remain separate. Do not mutate a Network subscription to give site entitlement.

**B. Customer bookings/tuition/events:** each organization receives a separately onboarded Stripe connected merchant, scoped to its site. For a new integration, evaluate Stripe Connect Accounts v2 and hosted account onboarding against the currently installed v1 creator payout rails; do not assume an RCH TV creator account can receive website business payments.

- Server, never browser, determines connected merchant account, USD amount, available slot and published fee policy.
- Use Stripe-hosted Checkout for initial version; design a documented charge flow and platform service/application fee if enabled. Confirm liability for processing fees, chargebacks and refunds before release.
- Stripe webhook verifies signature, tenant association, reservation ID, price, currency and idempotency. Never mark a booking paid based only on success URL; reconcile failed/async payments and disputes.
- Merchant payout statuses (`pending`, `enabled`, `restricted`) must be real Stripe state. No user funds or banking details in RCH frontend storage.
- No recurring tuition collection, partial installments, discounts or refunds UI until corresponding backend cases have been tested.

## 6. Private portals: adults and youth

- Client view: appointments, receipts, files or training notes they are authorized to see, service packages, secure reschedule/cancel requests.
- Organization view: client contact information, attendance, booking statuses, staff assignment and financial summaries for its own tenant only.
- AAU guardian portal: parent/guardian controls a minor's private athlete record and consents to public headshot, name, highlights and team-roster appearance separately. Default youth data to private.
- Minimize retained date-of-birth, medical and school information. Do not collect medical histories or identity documents for MVP. Safeguard contact and emergency data; set deletion/retention and export policies before enabling live clients.
- Existing public RCH player identity remains separate; any linking to a coach/trainer site requires explicit member consent and must not alter player REP, rankings or league eligibility.

## 7. Data model to migrate on a separate feature PR

Every mutable tenant-owned record has `organization_id NOT NULL REFERENCES public.network_organizations(id)` and relevant unique/FK constraints. Proposed new tables (names are reserved, not currently deployed):

| Table | Key fields and purpose |
|---|---|
| `rch_sites` | `id`, unique `organization_id`, unique lowercased `slug`, `site_type`, `theme`, `status` draft/published/suspended, `published_at`, version |
| `rch_site_sections` | `site_id`, `organization_id`, allowlisted `section_key`, bounded JSON schema/content, `sort_order`, visibility |
| `rch_site_media` | scoped storage object key, uploader, consent state, media type, publish flag, moderation |
| `rch_site_services` | service, duration, price cents, buffer, capacity, cancellation window, active |
| `rch_site_availability` | staff ID, timezone, weekday/ranges, exceptions, blackouts |
| `rch_site_bookings` | service, staff, client, start/end UTC, hold expiry, status, price snapshot, provider payment id, unique idempotency key |
| `rch_site_clients` | tenant-owned client identity/contact/consent, contact preferences |
| `rch_site_athletes` | tenant-owned private athlete record, guardian FK, opt-in public fields, consent timestamp |
| `rch_site_access` | client/guardian/staff to tenant and permitted object; no site owner may grant `global_admin` |
| `rch_site_payment_accounts` | tenant Stripe account ID, capabilities, verification/payout state, refreshed via webhook |
| `rch_site_transactions` | booking/payment references, cents/currency, fee, refunds, disputes, provider event IDs |
| `rch_site_domains` (later) | verified hostname, challenge, approval, TLS, canonical, status |
| `rch_site_audit` | immutable actor, tenant, action, object, time and reason |

Use explicit UUID server-derived foreign keys to ensure `service`, `booking`, `staff`, `client`, `guardian` and `payment account` all share **the same** `organization_id` (composite unique keys/foreign keys or transactional constraints). Add indexes for `(organization_id, status)`, `(organization_id, starts_at)` and `(organization_id, slug)` as appropriate.

## 8. Tenant security and publication rules

- Auth uses Supabase Auth `auth.uid()`; organization permissions come **only** from active `network_organization_members` rows in the database, not user editable metadata or frontend navigation. Owners/managers edit site, offerings and money; editors edit approved content only; customers and guardians see their own private records.
- Enable RLS on every new public schema table, revoke broad defaults, then grant minimal `SELECT`/`INSERT`/`UPDATE`/`DELETE` per role and restrictive policies `USING` + `WITH CHECK`. Admin/service key never enters browser.
- Public `anon` may read **published** sanitized public site pages/media/schedules; private customer and minor data never have public SELECT. Anonymous booking creation goes through validated, abuse-protected server route, not unrestricted anon table INSERT.
- Guard all mutation routes against CSRF/same-origin attacks and IDOR/BOLA; use validated payload schemas, request size limits, anti-automation/rate limits and audit logs.
- Never let a tenant write `network_organizations.network_tier`, `is_verified`, `status`, primary admin roles, RCH site settings, homepage, social post visibility, rankings, official stats, command center, financial office or other organizations.
- Ownership revocation should immediately deny new mutations even if a prior client session is open; verify membership server side on every sensitive operation.
- Public slugs need anti-impersonation review; never blindly render raw uploaded HTML, SVG scripts, `javascript:` URLs, dangerous file formats or untrusted iframe content.
- Cross-tenant database queries, file accesses, notifications and webhook matches must all use immutable tenant identifiers.

## 9. SEO and responsible revenue

- Automatic basics for every published site: distinct title/description, canonical URL, sitemap entry, Open Graph image, accessible heading hierarchy, mobile performance and truthful business details.
- Structured data only when supported by genuine published data: `Organization`/relevant sports type, `LocalBusiness` only for eligible actual local businesses with verified location information, and `Event` for real scheduled public events. Structured data eligibility is not a guaranteed rich result or ranking.
- Draft/unverified/suspended sites: `noindex`; duplicate custom-domain / RCH-path copies get canonical or redirect. Distinct real content is required; do not auto-generate hundreds of near-identical location keyword pages.
- **Potential paid products:** connected custom domain and assisted setup; monthly basic analytics/search-console reporting; optional local SEO concierge (Google Business Profile assistance with verified owner access, keyword/content guidance, quarterly review). Never sell rankings or mark paid sponsors as organic winners.
- Base structured markup should not be deliberately withheld from free sites. Charge for useful labor and features, not fabricated SEO benefits.

## 10. Indicative pricing hypotheses (not live prices)

- **Network listing:** free and remains independent.
- **Sites Starter** (`$19–29/month` exploratory): public subsite, media, contact CTA, basics, no transaction tools.
- **Sites Booking** (`$49–69/month` exploratory): scheduling, client list, hosted paid booking, confirmations and modest media library.
- **Sites Program** (`$89–129/month` exploratory): private roster/guardian portal, staff roles, program workflows, higher limits.
- **Add-ons:** custom domain/setup, concierge SEO/local discovery, larger media allocation, eligible paid RCH Network promotion. Any processing/application fees must be disclosed separately before checkout.
- Existing $49/$149 promotional partner product is different; no hidden bundling or duplicate entitlement.

## 11. Delivery phases and release gates

**Phase 0 (this PR):** pure allowlisted builder config, slug validation, template defaults, unit tests, security and product architecture. No feature exposed to customers.

**Phase 1:** introduce migration and RLS for `rch_sites`, section config and scoped media; integrate claimed organizations; implement wizard, draft preview, publish, public SSR page and sitemap. Test as at least two independent tenants, an anonymous visitor and a revoked operator.

**Phase 2:** availability, services, atomic bookings, cancellation/reschedule, email confirmations and calendar exports; no actual payment processing until concurrency and accessibility checks pass.

**Phase 3:** Stripe Connect merchant onboarding, hosted Checkout, platform fee ledger, webhook idempotency, failure/refund reconciliation and full financial QA in test mode.

**Phase 4:** customer/guardian portals, private attendance/rosters, media consent, site analytics and vetted SEO monetization. Custom domains only after domain proof/TLS/host security review.

Allow feature-flagged internal pilot with one independent trainer and one AAU organization before wider launch. Never merge migrations or change production entitlements until tests and migration rollback plan pass.

## 12. Acceptance & QA

1. An approved trainer can publish a beautiful mobile-first site without knowledge of hosting, coding or DNS; unauthorized accounts cannot publish.
2. Tenant A owner cannot read Tenant B draft, client records, bookings, balances or uploaded media, even via direct REST/API requests or forged UUIDs.
3. A tenant editor cannot modify RCH global content, admin controls, league stats, membership tiers, site templates, payment destinations or other tenants.
4. The public subsite has no editable link or admin controls for visitors; mobile header, bottom navigation and PWA Home remain intact.
5. Free and paid services show reliable remaining availability; two concurrent users cannot buy the same exclusive slot.
6. Only verified Stripe webhooks settle paid appointments; double webhook delivery has no duplicate booking, fee or notification side effect.
7. A parent sees only authorized athlete records; underage photos/rosters are hidden by default and consent withdrawal unpublishes them.
8. SEO payload reflects verified public content; JSON-LD is safely serialized; duplicate and draft routes are not indexed; no ranking guarantees.
9. Paused/suspended tenants cannot publish or accept new bookings; existing refunds and data export remain possible under documented retention rules.
10. TypeScript, build, Vitest, Supabase RLS tests (including cross-tenant and revoked permissions), web security review, preview mobile QA and payment test cases pass before release.

## Source notes

- Existing base system: `network_organizations`, `network_organization_members`, `/network/dashboard`, `/organizations/[slug]`, `/network/dashboard/billing`.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) for table grants, `USING`/`WITH CHECK` and tenant isolation.
- [Stripe Connect Accounts v2](https://docs.stripe.com/connect/accounts-v2) and [destination charges](https://docs.stripe.com/connect/destination-charges) for separate merchant payment setup and fee responsibility.
- [Google LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business) and [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies) for useful, truthful local SEO rather than doorway pages.
