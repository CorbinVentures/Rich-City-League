# RCH Sites — independent organization PayPal checkout

**Purpose:** RCH invoices organizations separately for RCH Sites SaaS/hosting. Individual trainers, coaches and AAU organizations collect their customer payments in their *own* PayPal Business accounts. No PayPal merchant credentials or merchant account integration exist within RCH.

## Two unrelated billing rails

1. **Organization → RCH:** RCH Sites subscription, upgrade, SEO package, support, setup fees. Bill on RCH's merchant account using a **future dedicated RCH Sites subscription product**. The existing `network_partner` Amplify/Premier subscription is not the RCH Sites subscription, and the current release does not charge any site fee automatically.
2. **Customer → Organization:** Organization creates a hosted payment link directly at PayPal, receives a URL under `https://www.paypal.com/ncp/payment/...` and pastes it in Website Studio > Independent PayPal. RCH displays a link that takes the customer to the organization's PayPal-hosted checkout. Payment proceeds, payout settings, chargebacks, refunds, credentials and bank details stay outside RCH.

## What is deliberately NOT integrated

- NO Stripe Connect setup for RCH Sites merchants.
- NO PayPal OAuth account linking, PayPal REST API credential exchange, hosted login frame or RCH-controlled merchant payout.
- NO recipient account ID or platform fee; no customer proceeds transit or settle in RCH.
- NO RCH claim that payment succeeded: an external link, return URL or user screenshot is **not** reliable payment verification.
- NO automatic marking of `rch_site_bookings` as paid/confirmed from an offsite payment.
- NO fake RCH purchase receipts, refund control or reconciled transaction metrics for independent PayPal purchases.
- NO generic PayPal.Me links for consumer personal transfers or arbitrary payment domains.

## Organization operation

1. Sign into **their own** PayPal Business account on the official PayPal website (never enter PayPal credentials on RCH).
2. Create a fixed-price **Payment Link** with the precise product, program or session, value, fees and refund terms.
3. Copy the official URL (as of October 2026, the format is `www.paypal.com/ncp/payment/...`).
4. Website Studio > Independent PayPal: choose their organization, enter the title, RCH display price, optional description, paste their URL.
5. The public microsite displays a **Pay** link when at least one active offering exists. Visitors open an external RCH-subsite payment list; checkout happens on PayPal.
6. If merchant updates the amount or destination in PayPal after adding the URL, RCH does not know; operators must keep details synchronized.
7. Organization staff must verify the payment in PayPal before delivering services or finalizing manually handled registrations.

## Bookings are distinct

- Existing Phase 2 free booking scheduling remains unchanged.
- A PayPal payment link is not linked to or reserved by an RCH booking slot.
- Paid scheduled appointments require a new explicit **pending-payment / manual merchant verification** flow with expiry, anti-abuse limits and cancellation/refund policy. Do not adapt `confirmed` free reservations to paid without these changes.
- To create verified transactional checkouts, the organization would need to separately authorize an eligible PayPal API integration. **That is incompatible with the user's no-account-connection requirement and is NOT part of this design.**

## Security, UX and QA

- One approved organization member with owner or manager role can add, view and deactivate links for only their organization. RLS exposes active links solely on a published and eligible site.
- Only HTTPS URLs on the exact `www.paypal.com` host and the `/ncp/payment/{id}` path pass; no redirects, URL credentials, fragment, query, PayPal.Me or arbitrary scripts.
- Limits: 12 active links per org, $1–$10,000 displayed amount per link (USD). Display amount **does not govern PayPal charge**.
- Public page warns: check receiving business, price and product at PayPal; payment neither books nor confirms RCH events.
- Rate-limit merchant changes if abuse appears; verify suspicious links and impersonation reports through existing organization moderation.
- No payment credentials or merchant bank data stored, displayed or logged.
- Verify RLS, app tests, Vercel preview, public and private sites, and links belonging to two independent organizations before deployment.
- Existing RCH-paid Site Builder entitlements are a separate project; never silently activate a new subscription.

**PayPal guides:** https://developer.paypal.com/payment-links-buttons/create-payment-link/ and https://developer.paypal.com/payment-links-buttons/share-payment-link/
