# RCH Website Creator — production billing readiness (October 28, 2026)

**Scope:** Production readiness audit only. The website-subscription fees are paid to RCH Stripe; organization customer payments go directly to the organization's own PayPal Business account. No live charge, production data modification, webhook change, or subscription cancellation was performed during this audit.

## Read-only evidence

| Check | Evidence | Result |
|---|---|---|
| Billing release switch | Vercel production `RCH_SITES_BILLING_ENABLED=true` | Enabled; **not** proof of complete end-to-end payment |
| Deployment | Latest inspected production Vercel deployments were READY | Pass |
| Price catalog | Every configured Vercel production Price ID matched an active live Stripe price, with correct USD amount and interval | Pass |
| Amateur monthly | $19, monthly | Pass |
| Amateur annual | $190, annually | Pass |
| Professional monthly | $49, monthly | Pass |
| Professional annual | $490, annually | Pass |
| Stripe webhook | Live endpoint enabled at `www.richcityhoops.com`, subscribed to Checkout complete, subscription created/updated/deleted, invoice paid and invoice payment failed | Configured |
| Customer portal | Active live portal has payment method updates, invoice history and end-of-term cancellation; direct tier switching is disabled | Pass |
| Paid-period migration | Production Supabase migration ledger includes `20261028194930_rch_sites_paid_period_quota_guard` | Recorded applied |
| Purchase acceptance | Previous four paid plan tests were **sandbox only** | Real live charge **not tested** |
| Paid entitlement | Production Supabase SQL requests were blocked by connector safety checks; no row-level reconciliation claimed | **Unverified** |
| Provider-generated failed renewal | No authentic previously-paid, Checkout-linked RCH Sites failure simulation | **Unverified** |
| Marketing copy | Public Creator pages were still describing all paid plans as unavailable despite the live switch | Fixed in this PR; pending merge |

## Security and customer trust

- Checkout is server-generated after sign-in, verified completed profile, owner/manager organization membership, and active verified claimed organization checks. It verifies the exact Stripe price against approved monthly/annual plan contracts before creating a session.
- The webhook authenticates the signed Stripe payload, ensures the paid Checkout belongs to the organization/intent, validates price and recent paid period, and requires idempotent private event processing.
- Production Supabase security advisors report RLS enabled with no policy on private billing tables. This is compatible with **server-only** tables without ordinary account access; do not create broad policies just to clear an informational finding.
- Other Supabase security advisors report warnings about public `SECURITY DEFINER` functions. These are outside this billing copy change and need a separate app-wide authorization review.
- The October 28 Stripe legacy-card warning is **not** a reason to enable deprecated card-token API policies. Keep using hosted Checkout and PaymentMethods.
- Billing status and paid features must not be marketed as verified solely from `RCH_SITES_BILLING_ENABLED=true`.

## Remaining controlled acceptance steps

1. Review the preview and confirm no customer sees a promise that roadmap-only tools are live.
2. Select a legitimate **RCH-owned, verified organization**. Explicitly approve a **$19 live Amateur Monthly** checkout and use a real payment method. Do not use a sandbox test card on the live account. An actual charge may incur unrecoverable processing fees even if refunded.
3. Confirm the payment in Stripe, signed webhook delivery, exact organization's subscription tier/period and database entitlement using an authorized production admin, then check the live billing portal and cancellation flow. Do not invent a row state if production DB access is unavailable.
4. Test duplicate submits with two signed-in browser sessions and cross-tenant rejection, before inviting external paid customers.
5. Complete a provider-generated failed-renewal exercise using a separate isolated Stripe test-clock customer and properly linked Checkout lineage. This remains a **sandbox acceptance** blocker, not grounds to deliberately fail a real live customer.
6. Reconcile production migration versions against GitHub without manually marking missing versions or replaying already-applied DDL.

**Operating constraint:** Production billing is already enabled and the Stripe webhook is already enabled. Treat these as existing settings, not an instruction to toggle either. Do not launch paid ads or invite broadly until the real payment and entitlement checks pass.
