# RCH Sites — subscription billing integration readiness

## Current release state

**Checkout OFF.** This is a prepared, dormant Stripe Billing integration. It is not a paid-subscription launch.

- Free stays free. Published sites and private drafts retain their existing owner/manager verification gates.
- Website subscriptions are held in `rch_site_subscriptions`, **not** `network_organization_subscriptions` (Network advertising) or user account memberships.
- The organization’s **external PayPal Business payment links** remain entirely organization-owned. RCH never receives or holds customer training/registration fees through this integration.
- RCH Sites pricing catalog: Amateur $19/month or $190/year; Professional $49/month or $490/year. Prices are set in USD and verified against actual Stripe price metadata.
- The public pricing page may announce rates without enabling payment collection. `RCH_SITES_BILLING_ENABLED=false` is the default.
- Founding offer (first 50 organizations $14/$39/month for their first 12 months) is **NOT OPEN**, unreserved and uncharged. No annual founding discount is specified; don't invent one or use a free-form promo code. Separate measured cohort allocation and renewal-term disclosures must be implemented.
- Optional setup/design/SEO/Discover/extra-seat purchases are **NOT AVAILABLE**. Implement delivery entitlements and pricing separately before selling.

## New operator-owned primitives

- `/network/dashboard/sites/billing`: owner-only website billing screen, current plan and selectable prices; subscribe button disabled while flag OFF. Links from Website Studio.
- `GET /api/rch-sites/billing/checkout?organizationId=...`: only confirmed 16+ RCH account (completed onboarding), MFA if enrolled, active owner/manager of an eligible claimed/verified organization; returns private current plan without exposing Stripe customer IDs.
- `POST /api/rch-sites/billing/checkout`: additionally validates same-origin, server-owned price ID, enrollment flag, no existing active subscription and at most one open checkout intent per organization; returns only a hosted Stripe Checkout URL.
- `POST /api/rch-sites/billing/webhook`: dedicated Stripe signature secret. Processes signed event IDs idempotently; fetches canonical subscription from Stripe; validates `rch_product=sites`, private checkout intent, session ID (for checkout-completed), price ID, expected USD unit amount and interval. Grants paid entitlements **only after an invoice is paid** and Stripe reports an active subscription. Payment failures and cancellations deny paid access. Never uses URL redirects as proof of payment.
- `POST /api/rch-sites/billing/portal`: owner/manager only, requires an existing website Stripe customer and **dedicated restricted** Stripe Customer Portal configuration. Portal configuration must disable plan switches and proration until the backend supports safe changes.

No Network subscriptions, Network `network_tier`, RCH members, RCH TV payouts, free booking cap rollout, customer PayPal accounts or homepage are changed by this migration.

## Stripe live-account provisioning status (October 28, 2026)

The connected **Richcityhoops** Stripe account (`acct_1UVN7sE7q3pkDeRU`) now contains two standalone website products and exactly four recurring standard prices:

- Amateur: USD $19/month (`price_1UVNRBE7q3pkDeRU5fIX1a5p`), $190/year (`price_1UVNRDE7q3pkDeRURMdSPH4R`).
- Professional: USD $49/month (`price_1UVNRFE7q3pkDeRU3oU8aaHY`), $490/year (`price_1UVNRHE7q3pkDeRUPFqmVtcJ`).
- Dedicated Stripe webhook endpoint `we_1UVNVME7q3pkDeRULeCoKwKd`, URL `https://richcityhoops.com/api/rch-sites/billing/webhook`; its **secret was transferred directly to encrypted Vercel production settings without being included in this document**.
- Restricted Stripe billing portal `bpc_1UVNSUE7q3pkDeRUkKHPkrNk`: invoice history, payment-method edits and end-of-term cancellation; self-service plan-switch disabled.
- All four price IDs, dedicated webhook secret, portal ID and `RCH_SITES_BILLING_ENABLED=false` stored in Vercel **production** settings.

**Webhook delivery status:** The separate live RCH Sites endpoint `we_1UVNVME7q3pkDeRULeCoKwKd` is **DISABLED** in Stripe until the restricted server key, test-mode workflow, and entitlement reconciliation are verified. The code now excludes unrelated RCH account subscriptions before network retrieval to avoid retries when other RCH products generate account-level events. Re-enable the dedicated webhook only during the approved paid launch (while retaining the `RCH_SITES_BILLING_ENABLED=false` protection until final checks).

**Remaining activation blocker:** no Stripe server-side API key is configured for the Vercel production project. Prefer a dedicated `RCH_SITES_STRIPE_API_KEY` (restricted `rk_live_...`) rather than broad `STRIPE_SECRET_KEY`. It must be added securely by an account administrator through Vercel's encrypted environment-variable settings and tested in a separate Stripe sandbox; it must never be pasted into support chats or client-side code. Do not enable checkout merely because the price catalogue exists.

## Production environment configuration

The following variables are **server-only** and must never be `NEXT_PUBLIC_`:

```text
RCH_SITES_STRIPE_API_KEY=<dedicated restricted Stripe server key; never commit a value>
# STRIPE_SECRET_KEY is legacy fallback; prefer the dedicated key above.
RCH_SITES_BILLING_ENABLED=false
RCH_SITES_STRIPE_WEBHOOK_SECRET=<whsec_... for NEW dedicated endpoint>
RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID=<bpc_... restricted portal>
RCH_SITES_PRICE_AMATEUR_MONTHLY=<price_... $19/month>
RCH_SITES_PRICE_AMATEUR_ANNUAL=<price_... $190/year>
RCH_SITES_PRICE_PROFESSIONAL_MONTHLY=<price_... $49/month>
RCH_SITES_PRICE_PROFESSIONAL_ANNUAL=<price_... $490/year>
```

**Do not** re-use `STRIPE_NETWORK_WEBHOOK_SECRET` or customer RCH membership webhook secrets. Configure a separate endpoint `https://richcityhoops.com/api/rch-sites/billing/webhook` subscribing to:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Customer Portal must allow cancellation, payment-method and invoice management, **not** pricing tier switches or self-service coupons. Implement an explicit upgrade/downgrade flow separately. Disabling checkout must not stop existing subscription webhook reconciliation.

## Final activation gates — all mandatory

1. In a separate Stripe **sandbox**, create and verify the 4 recurring USD prices. Never use live credentials to simulate a purchase.
2. Configure a separate signing-secret webhook endpoint and restricted portal; check Vercel environment variables and routing. Production values MUST be live price IDs matching the same connected RCH Stripe account, not test IDs.
3. Run an actual sandbox purchase for each monthly and annual tier using a verified test organization; inspect subscription activation only after verified `invoice.paid`. Assert first checkout, replayed webhook, out-of-order event, canceled, past-due, owner revoked, cross-organization access, two-tab duplicate checkout and safe portal behavior.
4. Test real subscription cancellation/dunning and any refund disputes; ensure paid entitlements are shut off promptly but customer data remains exportable. Establish support contact and billing/tax policy.
5. Audit site service/slot/booking usage and cost, plus planned feature availability; do NOT enable stricter booking quotas until separately approved.
6. Implement founding-cohort allocation as a concurrency-safe server-only transaction, a 12-month Stripe price transition and explicit disclosure. No founding price can be selected by customers until this is done.
7. Implement add-on fulfillment/delivery controls before adding an actual add-on checkout.
8. Record sign-off and only then deliberately set `RCH_SITES_BILLING_ENABLED=true`. Monitor first payments, webhook failure retries and user-facing portal.

## Verification in this PR

- GitHub App Quality: TypeScript, lint, Next build, Vitest source contracts.
- Supabase local migrations, pgTAP RLS and duplicate checkout constraint tests; concurrent booking test must remain green.
- Existing live browser smoke should stay green; private owner billing is not accessible to visitors.
- No production test accounts or Stripe charges are created by this PR.
