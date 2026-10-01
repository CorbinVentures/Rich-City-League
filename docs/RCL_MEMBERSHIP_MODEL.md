# RCL Membership Model

## Product boundary

Rich City League remains the flagship competitive basketball property. RCL Network supports Virginia basketball through discovery, media, exposure and audience growth. Individual memberships make the RCL experience more useful to a person without selling competitive credibility.

RCL is **not** positioning paid membership as a training subscription or as outsourced league-management software.

## Memberships

### RCL Community — Free

The core network remains useful without payment:

- RCL social network and public profiles
- REP and earned badges
- Virginia organization and event discovery
- Open Runs and league information
- Public basketball content
- Basic Basketball Passport / player identity

### RCL+ — $5.99/month or $59.99/year

Promise: **Your basketball world, organized.**

Core value:

- My Hoops personalized basketball dashboard
- Saved organizations, events, runs, games and players
- Personalized Virginia basketball opportunities
- Unified basketball calendar and `.ics` export
- Profile and Basketball Passport exposure analytics
- Passport Studio career/share utility

### RCL All Access — $11.99/month or $119.99/year

Promise: **Get the most out of the RCL network.**

Includes RCL+ plus:

- Advanced exposure intelligence
- One RCL Spotlight request per calendar month
- Priority windows for eligible RCL-owned experiences
- RCL Pass benefits and partner offers when available
- Early access to selected RCL experiences/features

Spotlight is an advertising/discovery benefit and is subject to RCL review.

## Credibility firewall

A payment can never change or purchase:

- REP
- Player ratings
- Competitive rankings
- Statistics
- Awards
- Earned badges
- Game results
- Competitive selection

This separation is required for trust in the network.

## Entitlements

Application code should check plan entitlements instead of hard-coding UI conditions across the product. Current keys:

- `my_hoops`
- `personalized_opportunities`
- `calendar_export`
- `profile_analytics`
- `passport_studio`
- `advanced_exposure`
- `monthly_spotlight`
- `priority_access`
- `rcl_pass`

Supabase stores authoritative membership state. Client code may use plan definitions for presentation, but protected data/actions must still be enforced server-side or through RLS.

## Billing authority

Stripe is the intended payment authority.

- Checkout is server-created from RCL-controlled Stripe Price IDs.
- The browser cannot submit a price amount or grant itself a plan.
- Stripe webhooks reconcile paid membership into `member_subscriptions`.
- Webhook event IDs are recorded for idempotency.
- Stripe Customer Portal is the intended surface for payment methods, invoices, cancellation and plan management after configuration.
- If Stripe configuration is incomplete, checkout fails closed while Free RCL remains available.

## Analytics boundary

RCL profile exposure analytics use a first-party visitor identifier and a one-way hash to deduplicate a viewer/profile/metric/day combination. Raw visitor identity is not stored in the exposure aggregate tables.

Self-views are not counted when the signed-in profile matches the profile being measured.

## Revenue reporting

The Revenue Center distinguishes subscription run-rate from cash collected.

- MRR/ARR are calculated from active/trialing subscription records.
- They must not be presented as settlement or cash revenue.
- Stripe payout/refund/fee reconciliation is a separate accounting layer to add after live billing is connected.
