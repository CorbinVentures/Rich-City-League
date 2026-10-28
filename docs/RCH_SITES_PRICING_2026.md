# RCH Sites — pricing policy and rollout (October 2026)

## Decision

| Website plan | Monthly | Annual (10×monthly, 2 months free) | Founding monthly* |
|---|---:|---:|---:|
| Free | $0 | $0 | $0 |
| Amateur | $19 | $190 | $14 |
| Professional | $49 | $490 | $39 |

* Founding proposal: only the first 50 **paying** organizations after enrollment opens, discounted for the first 12 months, then standard rates with advance notice. A website visitor selecting a tier never joins the founding cohort, reserves a discount, or authorizes charges. The founding annual offer has **not** been specified and cannot be sold or inferred.

## Current launch behavior

- Announce the prices on the public /website-creator page, with accessible Monthly/Yearly comparison.
- Get Started still works at no cost for trainers, coaches, clubs and organizers.
- Save tier and monthly/annual preference only to account-owned starter draft. The value is **not** a paid subscription or a merchant payment authorization.
- Distinguish "Available now" from "Planned for this level"; a paid entitlement is never activated by clicking a plan.
- Paid checkout, billing webhooks, subscription change/downgrade, founding cohort enrollment, reserved prices, annual renewals and add-on purchase remain **off** until implemented and fully tested.
- Main RCH accounts/social/RCH TV/REP and organizational PayPal Business customer-payment links are unaffected.
- Organization verification and owner/manager permission still precede importing and publishing a draft.
- Strict booking quota enforcement remains disabled: legacy booking guard limits continue until separately audited and enabled. Publishing marketing numbers does not change the quota rollout flag.

## Tier feature allocations (roadmap vs live)

| Item | Free | Amateur | Professional |
|---|---:|---:|---:|
| Published sites | 1 | 1 | 1 |
| Site pages (planned gate) | 1 | 6 | 20 |
| Staff (planned multi-seat gate) | 1 | 3 | 10 |
| Services | 2 | 15 | 60 |
| Confirmed monthly bookings | 25 | 150 | 600 |
| Registration forms (planned) | 1 | 5 | 20 |
| SEO | Essentials | Local SEO/analytics planned | Advanced/custom domain planned |
| Media | Embeds | Gallery planned | Collections planned |
| Marketing | Inquiries | Campaigns planned | Automation planned |
| League/tournament | Event listing | Team rosters planned | Brackets/divisions planned |

Only existing released modules should be presented as active. Registration/guardian processing needs verified custody authorization, data minimization and consent work before enabling.
Page counts and form counts are **catalog-only quotas** until their respective resources and enforcement exist.
The booking quota database includes concrete limits, but the enforcement gate defaults OFF and remains OFF in this PR.

## Optional add-ons (not purchasable)

- Done-for-you setup: $99 once.
- Premium design/template: $29 once.
- Local SEO growth: $15/month.
- Sponsored Discover: $10–$20/month, clearly labeled advertising.
- Extra admin seat: $5/seat/month (subject to real seat authorization and quota enforcement).

None of these can be added silently at signup. Sponsored placements do not promise impressions, and SEO cannot promise search positions.

## Separate payments, future charging and approval gates

RCH charges organizations only its own RCH Sites membership or optional products once a dedicated checkout and webhook-backed subscription record exist. Organizations collect **their own** athlete/client payments in their own PayPal Business account using their own payment links. RCH does not collect or deduct a website-platform percentage of those proceeds; ordinary provider processing fees remain external.

Before billing becomes active:
1. Implement distinct site subscription products and all price identifiers, including separate monthly and annual recurrence.
2. Implement signed webhook reconciliation and server-authenticated checkout; never trust selected tier/interval from client for access.
3. Define founding pricing eligibility, first-50 ordering, 12-month term, renewal rate disclosure, handling cancellations and grandfathering. Do not permit customer-selected founder status.
4. Implement add-on metering and approvals separately; never automatically upsell.
5. Ship, meter and abuse-test unreleased modules with organization-isolation and privacy tests.
6. Pilot active bookings and staff usage, backup, rollback, support escalation and customer communications.

## QA

- Source catalog pure function tests verify rate math and reserved founding policy.
- pgTAP checks monthly starter migration default, annual preference, invalid billing values and RLS.
- Isolated browser logs in as synthetic user, selects Professional + annual, saves a private draft, creates no paid subscription and resumes both preferences in fresh browser session.
- Real public browser smoke and Next.js application CI must pass.
