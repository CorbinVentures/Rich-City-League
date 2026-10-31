# RCH Sites Phase 0 — website subscription and module contract

Status: **source-only proposal / feature foundations, no production tier enforcement or paid enrollment**.

This file supersedes pricing and merchant-checkout suggestions in the older
RCH_SITES_PRODUCT_BLUEPRINT.md; the independent PayPal split in
RCH_SITES_INDEPENDENT_PAYPAL.md remains the authority for customer payments.

## 1. Goals and current state

- Public entrance: /website-creator, with Free/Amateur/Professional inquiries.
- Approved organization Website Studio: /network/dashboard/sites.
- Current operations: free single-attendee, manually created booking slots, adult inquiry inbox,
  independent organization-hosted PayPal Business links, existing published microsites.
- Not yet available: paid RCH Sites billing, automatic paid booking confirmation, multi-staff
  calendars, youth guardian enrollment, marketing campaigns and tournament operations.
- This phase adds ONLY the pure typed catalog at src/lib/rch-sites-plans.ts and unit tests.
  It does not modify API routes, payment accounts, main-site/PWA screens, tables, RLS or quotas.

## 2. Plans (proposed, not charged)

| Subscription | Indicative monthly price | Outcome |
|---|---:|---|
| Free | $0 | Publish basic basketball presence, inquiries, simple free bookings |
| Amateur | $19 | Operate a growing program, scheduling, registration and marketing |
| Professional | $49 | Multiple teams, resources, divisions and advanced reporting |

The pricing page intentionally continues to show paid-tier prices as
"Pricing to be announced" and interest registration until billing and feature QA are done.
RCH Network paid visibility tiers are NEVER equivalent to RCH Sites subscription tiers.

The tier catalog describes planned inclusion separately from release readiness:
a feature only becomes usable if the organization is eligible, membership is active,
its own RCH Sites subscription is active for paid plans, it is included in the plan,
and its feature gate has been deliberately released.

Code-owned release allowlist for the source-only contract:
site.publish, booking.basic, seo.essentials, communications.inquiries.
The existence of this allowlist does not mean all current APIs use it (they do not).
All new module features remain disabled in the pure contract until reviewed and enabled
with actual route/database enforcement.

## 3. Proposed per-organization limits

| Resource | Free | Amateur | Professional |
|---|---:|---:|---:|
| Published sites | 1 | 1 | 1 |
| Staff | 1 | 3 | 10 |
| Active booking services | 2 | 15 | 60 |
| Upcoming slots | 30 | 150 | 600 |
| Confirmed bookings / month | 25 | 150 | 600 |
| Registration programs | 0 | 3 | 20 |
| Private athlete records | 0 | 100 | 500 |
| Teams | 0 | 5 | 40 |
| Upcoming public events | 2 | 20 | 100 |
| Active tournaments | 0 | 1 | 10 |
| Site image/document storage | 250 MiB | 2 GiB | 10 GiB |
| Video embeds | 3 | 20 | 100 |
| Marketing emails / month | 0 | 500 | 3,000 |
| Marketing campaigns / month | 0 | 2 | 8 |
| Analytics history retention | 90 days | 365 days | 730 days |

Limits are PROPOSALS, not existing runtime restrictions. The current free booking API
still has a cap of 20 created services and 120 upcoming open slots per organization;
this proposed lower Free allowance cannot be applied by changing a public plan card.
It needs migration/usage reconciliation and server enforcement.

Full-length games should stay on RCH TV or authorized external media embeds.
Do not upload them redundantly to website storage. No public-visitor paywall or
surprise traffic shutdown is recommended; rate-limit abusive use and monitor bandwidth.

## 4. Safe integration design

Before wiring any API:

1. Create a dedicated, organization-scoped RCH Sites subscription/entitlement record.
   Keep it separate from network_organizations.network_tier and RCH Network advertising.
   Do not infer payment status from application text or URL query params.
2. Derive the organization ID from the authenticated active membership; verify its
   active/claimed/verified status and its precise owner/manager/editor role on EACH action.
   A browser-supplied slug or organization ID never proves access.
3. Read the dedicated RCH Sites tier and billing status server-side. Until paid billing
   exists, no user is considered to hold an active paid entitlement.
4. Run evaluateRchSiteFeature as a plan + release preflight, AFTER authentication and
   membership checks. Do NOT treat the pure helper as authorization, a substitute for RLS,
   an enabled feature flag in a route, or proof of payment.
5. Run evaluateRchSiteQuota as a fail-closed preview. Enforce actual usage counts inside
   an atomic database transaction with row locking and idempotent resource creation.
   The helper cannot prevent two concurrent requests exceeding a limit.
6. Count monthly actions on explicitly defined calendar-month windows (UTC) and do
   not count retries twice. Rate-limit anonymous inputs and never mark paid services
   confirmed without a verified operator action.
7. Add restrictive RLS policies, minimal SQL grants, scoped file access, cross-tenant
   tests, revoked-member tests, SQL concurrency tests, rate limits and audit events.
8. On downgrade, retain existing records; disallow new over-limit writes, allow exports
   and cancellations, and keep essential transactional notices running.

## 5. Release dependencies

### Phase 1: Tier storage, SEO, booking
- Add server-authoritative RCH Sites subscription and quota ledger schemas with RLS.
- Change existing booking capacity checks to use DB atomic quotas, not browser quotas.
- For multi-staff booking, change organization-wide exclusion to staff/resource-aware
  conflict checks and design recurring timezone-aware availability, exceptions and group
  capacity. Existing single-client free-booking semantics remain intact until tested.
- Add safe analytics collection, truthful structured data, and domain-ownership verification.

### Phase 2: Adult programs and media
- Implement private adult registrations and tenant-owned media references/storage.
- RCH TV integration is opt-in with rights and moderation checks; no automatic upload,
  reposting or mirroring of private content.

### Phase 3: Youth and guardian portals
- Guardians control private athlete records with verifiable authorization and granular
  photo/roster/media consent. No child under the PWA age floor is silently provisioned
  a PWA social account. Carry out privacy/legal review and consent revocation tests.

### Phase 4: Communications
- Verified sending domain, queued sends, unsubscribes, consent records, monthly send
  reservations, suppression lists, bounce handling and delivery status.
- Marketing campaign limits NEVER suppress necessary transactional confirmations.

### Phase 5: Independent events
- Organization-owned competition, team, fixture and bracket records with tenant RLS.
- No changes to official Rich City League stats, REP, territory or fantasy systems.

### Phase 6: Paid subscriptions
- Build separate RCH-owned checkout/subscription product and server webhook reconciliation;
  do not use existing Network billing for this purpose.
- Organization customer payment: continue independent PayPal Business links only, without
  connecting RCH to their merchant account. Offsite payment is not proof of settlement.
- Run a controlled trainer + AAU pilot; measure cost per organization, bookings, active
  sites, retained paid subscriptions, email use, storage and abuse before final pricing.

## 6. QA gates

- TypeScript, lint, Vitest and Next.js build green.
- Unit tests verify every quota and feature key, plan inheritance, malformed tier denial,
  inactive billing/membership denial, unreleased-feature denial and quota edges.
- Future DB PRs: SQL RLS, cross-tenant visibility/mutation, quota concurrency, revoked
  membership, media permission, guardian consent and billing idempotency tests.
- No production migrations, billing activation, main-site modifications or PWA changes
  in this Phase 0 branch.
