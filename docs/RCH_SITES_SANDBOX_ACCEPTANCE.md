# RCH Sites — genuine Stripe sandbox acceptance

**Scope:** Website Creator SaaS subscriptions only. No live checkout, real card
charges, existing RCH member plans, Network ads, creator payouts or
organization-owned PayPal merchant payments.

## Hard isolation before any test

1. Create or connect a **general Stripe sandbox** under the Richcityhoops
   account (Stripe Dashboard account selector > Sandboxes). Sandbox objects
   and API keys are separate from live ones. The current ChatGPT Stripe
   connection exposes the **live** account only, so sandbox API operations
   cannot yet run through that connection. Authorize the sandbox separately.
2. Use an isolated Vercel preview deployment and **separate Supabase staging
   project/branch** with disposable adult test users and a verified disposable
   organization. Do **not** target the production database or domain.
3. Create a dedicated sandbox API key with the least permissions needed for
   prices, subscriptions, Checkout and restricted customer portal. Store it
   only in encrypted staging secrets as `RCH_SITES_STRIPE_API_KEY`. Do not
   put keys in GitHub, pull requests, screenshots, console logs or chats.
4. Create four **sandbox** recurring Stripe prices: $19/mo, $190/year,
   $49/mo, $490/year. Set the staging `RCH_SITES_PRICE_*` variables to
   these sandbox IDs; never point them to live IDs.
5. Create a **sandbox-only** billing portal that allows invoice history,
   payment-method edits and end-of-term cancellation but disables plan switching.
6. Register a **sandbox** webhook destination pointing to the isolated preview
   URL's `/api/rch-sites/billing/webhook`; configure its own signing secret.
   Subscribe to checkout.session.completed, customer.subscription.created,
   customer.subscription.updated, customer.subscription.deleted, invoice.paid,
   invoice.payment_failed. Never target richcityhoops.com production.
7. On the isolated preview only, confirm `NEXT_PUBLIC_SITE_URL` is the
   staging origin (or hosted success/cancel URLs will leave the test
   environment). Set `RCH_SITES_BILLING_ENABLED=false` initially; production
   must stay false. The production live webhook must stay disabled.

## Read-only sandbox catalog and endpoint preflight

Using a local trusted secret manager or a secure CI secret context, provide
these names without printing their values:

```text
RCH_SITES_SANDBOX_API_KEY
RCH_SITES_SANDBOX_PRICE_AMATEUR_MONTHLY
RCH_SITES_SANDBOX_PRICE_AMATEUR_ANNUAL
RCH_SITES_SANDBOX_PRICE_PROFESSIONAL_MONTHLY
RCH_SITES_SANDBOX_PRICE_PROFESSIONAL_ANNUAL
RCH_SITES_SANDBOX_PORTAL_ID
RCH_SITES_SANDBOX_WEBHOOK_ID
```

Run `node scripts/rch-sites-sandbox-preflight.mjs` with
`RCH_SITES_BILLING_ENABLED` unset or set to `false`. It rejects live API
keys before network traffic; performs GET requests **only**; verifies the
actual four sandbox amounts/intervals, distinct products, portal safety, the
enabled webhook events, and an isolated HTTPS destination. It creates no
Checkout Sessions or charges.

A preflight PASS is not evidence that a customer completed a checkout.

## Genuine end-to-end acceptance (isolated preview only)

After preflight passes, intentionally enable `RCH_SITES_BILLING_ENABLED=true`
**on the isolated preview only** and complete:

| Scenario | Expected result |
|---|---|
| Amateur monthly and annual; Professional monthly and annual | Each initiates a hosted **sandbox** Checkout with the proper price and one subscription |
| Successful test card and signed invoice.paid | Paid entitlement becomes active only after a verified paid invoice and valid billing period |
| Declined payment, failed invoice, unpaid renewal | Access stays free/denied; no accidental upgrade |
| Checkout abandoned or expired | No paid entitlement; subsequent attempt safely creates or resumes checkout |
| Simultaneous two-tab checkout | One open intent/session per organization; no duplicate subscription |
| Replay and out-of-order webhooks | Idempotent event ledger, no duplicate activation or regression |
| Tampered signature, wrong price/interval, unrelated RCH event | Rejected or ignored; no website plan granted |
| Cancel at period end, then actual end | Correct cancellation state and entitlement transition; records remain exportable |
| Revoked organization manager, member of different organization, signed-out user | No billing access across tenants |
| Customer portal | Invoices and payment details work; no plan switching or unapproved coupon/discount |

Collect redacted Stripe event IDs, test organization IDs, timestamps, observed
status transitions, and CI references. Do not record payment credentials,
personal data or signing secrets.

## Release gate

Stop immediately if any scenario is unverified. Leave production
`RCH_SITES_BILLING_ENABLED=false`, the live Stripe webhook disabled, and
the dedicated production restricted API key absent until explicitly approved
for a paid launch. Staging test credentials must **never** be copied to
production. Enabling the production webhook and checkout requires a separately
reviewed release, operational support/cancellation procedure and verified
subscription ledger reconciliation.
