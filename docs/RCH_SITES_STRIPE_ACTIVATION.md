# RCH Sites — Stripe Website Creator subscriptions (staged integration)

**Status:** isolated GitHub PR; not merged, not deployed, and no customer checkout enabled. Two products and four **live catalog prices** have been created in the connected **Richcityhoops** Stripe account, but there are no subscriptions or charges initiated by this change.

## Approved catalog (USD)
| Tier | Recurrence | Amount | Live Price ID |
| --- | --- | ---: | --- |
| Free | none | $0 | Not a Stripe product |
| Amateur | monthly | $19 | `price_1UVNSmE7q3pkDeRUwQty7vTH` |
| Amateur | annual | $190 | `price_1UVNSnE7q3pkDeRUBjCGnUD9` |
| Professional | monthly | $49 | `price_1UVNSpE7q3pkDeRUmwccKemd` |
| Professional | annual | $490 | `price_1UVNSrE7q3pkDeRUfRELF9E2` |

Products: Amateur `prod_VWQJPGF1pf5rIK`; Professional `prod_VWQJtHSLY0hGpq`.
Founding prices ($14/$39) are proposals **not created and not available**. Add-ons remain unpurchasable.

## Architecture and trust boundaries
- Verified organization owner/manager selects their organization from Website Studio > Website plan & billing. Checking a tier in starter drafts creates no subscription.
- `POST /api/rch-sites/billing/checkout` verifies RCH auth, MFA, account completion, organization eligibility and membership. Checkout and Portal are Stripe-hosted; all Stripe calls are server-only.
- `POST /api/rch-sites/billing/webhook` verifies a distinct signing secret, fetches the latest subscription and resolves **the exact approved Price ID and amount**, and updates only `rch_site_subscriptions` and a distinct private `rch_site_billing_events` log.
- `GET /api/rch-sites/billing/status` exposes only safe plan/status/renewal fields to the verified manager. No Stripe customer IDs, credentials or payer information are returned.
- `RCH_SITES_BILLING_ENABLED=false` until explicit go-live. Existing RCH consumer membership, RCH Network advertising billing, and organization PayPal Business payments are entirely separate.
- On future cancellation, keep paid access through an active, already-paid Stripe period, then revert to Free after Stripe reports cancellation. Past-due, canceled and incomplete subscriptions never unlock premium features. Strict booking quotas remain independently disabled until a reviewed migration/rollout.

## Prerequisite release sequence
1. **Database:** apply the staged migration to isolated Supabase; run pgTAP regression, RLS abuse checks, and Stripe event replay tests. Back up production, schedule a rollout and then separately apply the migration to production. DO NOT modify `rch_site_booking_quota_rollout`.
2. **Server credentials in the correct Vercel project:** configure `STRIPE_RCH_SITES_SECRET_KEY` for the **Richcityhoops Stripe account**; do not reuse consumer-membership or Network billing credentials. Configure `STRIPE_RCH_SITES_WEBHOOK_SECRET`, and configure optional dedicated `STRIPE_RCH_SITES_PORTAL_CONFIGURATION_ID`. Put secrets only in Vercel encrypted server environment settings, never GitHub/source files or browser `NEXT_PUBLIC_*` vars.
3. **Server price IDs** for this account: `STRIPE_RCH_SITES_PRICE_AMATEUR_MONTHLY`, `STRIPE_RCH_SITES_PRICE_AMATEUR_ANNUAL`, `STRIPE_RCH_SITES_PRICE_PROFESSIONAL_MONTHLY`, `STRIPE_RCH_SITES_PRICE_PROFESSIONAL_ANNUAL` (match catalog above). API checks exact currency, amount, and recurrence; mismatches fail closed.
4. **Stripe event destination:** create a dedicated webhook for `https://richcityhoops.com/api/rch-sites/billing/webhook` in the **same Stripe account**, subscribing to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Verify endpoint ownership, test secret rotation, retries, duplicate/out-of-order events and portal cancellation.
5. **Billing portal:** enable payment-method update, cancellation at end of period, and only the four RCH Sites prices for plan upgrades/downgrades. Review mid-period proration, tax collection and invoice descriptors. Do not offer founding prices, other Stripe products, or payouts to tenant organizations in this billing portal.
6. **UI and functional QA:** signed-in verified owner, rejected editor/outside-org users, disabled checkout, double-click checkout, successful monthly and annual payments, invoice failure, recovery, upgrade/downgrade, plan cancellation, long-term webhook retry, and upgrades that still cannot use unreleased modules. Confirm Free still works without credit card.
7. **Enable:** only after passing the above and approving paid feature availability, set `RCH_SITES_BILLING_ENABLED=true` on the intended production deployment and explicitly deploy/release. This draft does NOT change production environment variables or issue charges.

**Risk:** All paid website tools that are not yet released must remain labeled planned. Never sell an unavailable premium capability without clear disclosure. If webhook processing fails, leave entitlement unchanged, log failure, and return non-2xx so Stripe retries. Reconcile any failed billing events before launch.
