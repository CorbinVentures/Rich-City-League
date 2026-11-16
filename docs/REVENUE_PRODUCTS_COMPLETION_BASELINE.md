# Revenue products: completion baseline and sales gates

**Baseline reviewed:** `main` at `62478bade74dd1609672ee017f813bafb74683f5`  
**Purpose:** define what must work before each paid offer is presented as a complete product. Sandbox checkout confirms payment flow only; it does not count as feature or fulfillment completion.

## Release standard

A product is ready to sell when all of the following are true:

1. Its buyer, outcome, exact price, billing cadence, limits and deliverables are clear on the purchase page.
2. Every paid feature works end to end and server-side entitlements match the plan copy.
3. Checkout, payment confirmation, fulfillment, receipts, renewal, cancellation and support paths agree.
4. Buyers can complete setup without RCH manually repairing ordinary account or organization state.
5. Reporting shows only measured delivery; no projected reach is represented as delivered.
6. Legal, content, privacy, participant-consent and sponsor-placement requirements for that specific product are cleared.

Keep the player community, profiles and free Runs usable without a paid membership. Paid tools may add value without selling competitive status, REP, rankings, results, awards or selection.

## Current product families

| Product | Current offer in source | Current product state | Completion work |
|---|---|---|---|
| **RCH Sites subscriptions** | Amateur $19/month or $190/year; Professional $49/month or $490/year | The plan matrix includes booking, registration, pages, media, outreach, events, custom domains and tournament tools. The server release catalog currently enables only publishing, basic booking, SEO essentials and inquiries. The basketball-tool catalog labels most paid differentiators as planned. The site builder currently creates one section-based public site. | Build and release each paid module listed in the plan; enforce tier limits in the API and database; expose a truthful plan comparison and setup flow. Include recurring/group/multi-coach bookings, adult registration, team/program management, analytics, media, campaign tools, custom domains, brackets and divisions only when each is usable end to end. |
| **RCL+ membership** | $5.99/month or $59.99/year | My Hoops, saved items, personalized opportunities, calendar export and exposure data have code paths. “Passport Studio” is in the plan definition but has no matching implementation found in the current code search. | Finish Passport Studio and verify every paid control uses server-authoritative entitlements. Give members onboarding that explains how to use each included tool. |
| **RCL All Access** | $11.99/month or $119.99/year | It adds advanced exposure, one monthly Spotlight request, priority access and RCL Pass benefits. Spotlight request intake exists. Advanced exposure, priority access and RCL Pass have no corresponding implementation found in the current code search; the request needs an operational review and fulfillment path. | Implement advanced analytics, a Spotlight review/fulfillment queue with member status and notification, a priority-access mechanism tied to real RCH inventory, and an active partner-benefit catalog. Do not count partner offers as live until a partner has confirmed the offer and terms. |
| **Network Partner subscriptions** | Amplify $49/month; Premier $149/month | Subscription reconciliation and monthly credit grants exist. Current database entitlements allocate Amplify 2 event, 1 regional and 1 social-feed credit per cycle; Premier 4 event, 2 regional, 1 statewide, 2 social-feed and 1 media credit. Partners submit campaigns for RCH review. The billing page describes benefits generally but does not show the exact bundle. | Display exact monthly credits and terms before checkout; show cycle dates, balances, campaign status, delivery timing and reporting. Define review/service expectations, credit expiry/refunds and what is included in cross-channel or priority-media benefits. Enforce the same terms in the database and UI. |
| **Self-serve digital sponsor campaigns** | Six fixed-price products: Sponsored Social Feed ($49/7 days), Featured Event ($75/7 days), Search + Discover ($99/14 days), Community Feature ($99/14 days), RCH TV Feature ($149/14 days), Today in RCH ($250/30 days) | Product cards, a campaign builder, one-time checkout, campaign delivery controls and a sponsor dashboard are present. The purchase page says payment launches placements automatically. Sponsor reports distinguish paid impressions, destination views, clicks and engagement. | Verify every purchasable SKU maps to an active placement and correct term, region, disclosure, frequency cap and reporting fields. Reconcile paid sessions against delivered placements and define handling for failed, paused, rejected or under-delivered campaigns. Keep custom proposals out of direct checkout. |
| **2027 League sponsorships** | Draft inventory and asking prices appear in code; the public page says request availability and written terms | This is proposal inventory, not a fixed self-serve product. Season dates, rights, venue plan, team count and delivery obligations remain conditions of a written agreement. | Confirm season inventory, dates, venue, team/slot counts, broadcast and social deliverables, costs, category conflicts, cancellation and make-good terms. Generate signed order forms and delivery reports. Keep proposed values separate from contracted or collected revenue. |
| **League registration and fees** | Registration can use a configured division fee and Stripe checkout | The payment flow exists, but season/division settings control whether applications are open and whether a fee is configured. The public League page still describes future tryouts and season timing. | Finalize season, dates, divisions, eligibility, fees, refund rules, waivers and application review. Validate payment confirmation, retry, cancellation and registration status across the complete applicant journey before opening sales. |
| **RCH TV paid subscription** | No separate TV subscription is currently for sale. Live games and published archives are presented as free; premium originals are described as future content. | The public media page says the original library is in development and no separate TV subscription is for sale. Creator compensation is still an audited/manual process; the 25% pool is a proposal. | Before creating a paid TV SKU, define the actual catalog, release cadence, rights and participant clearances, protected playback, subscriber entitlements, creator agreements, revenue accounting, payout controls and cancellation/refund behavior. Publish only after the paid library has enough cleared content to deliver the promise. |
| **Setup, SEO services, clinics, tickets, merchandise and other campaigns** | These are planning concepts or proposed add-ons rather than a consistent current checkout catalog | The product scope, deliverables, price and fulfillment owner are not consistently approved. The revenue document’s setup/SEO assumptions differ from the proposed add-on values in the site-plan code. | Approve one rate card and scope per service; define fulfillment capacity, timelines, refund rules and owner. Create a purchase path only after the deliverable can be fulfilled and reconciled. Do not treat a modeled price as an approved price. |

## Build order

1. **Subscription parity:** complete RCH Sites, RCL+ / All Access and Network Partner benefits so their displayed promises match released, enforced features.
2. **Commercial fulfillment:** finish sponsor-placement inventory validation, campaign exceptions and reporting reconciliation.
3. **Content product:** build RCH TV premium access only after content, rights, creator terms and the subscriber promise are ready.
4. **Season products:** finalize League sponsorship and registration products against confirmed 2027 dates, venues, inventory, cost and contract terms.
5. **Remaining services:** approve the rate card and fulfillment capacity for setup, SEO, clinics, tickets and merchandise.

## Price and claim reconciliation required

- The site-plan code proposes a $99 setup add-on and $15/month SEO add-on. The revenue document contains different planning assumptions ($149 setup and $69/month SEO). Select one approved rate card before publishing or charging for these services.
- A $6.99/month RCH TV subscription is a modeled concept only; there is no current TV subscription SKU or premium-content entitlement.
- Do not record league asking prices, sponsor pipeline, projected MRR or campaign budget preferences as revenue. Report signed commitments, payment received, delivery obligation and cleared cash separately.

## Final sales acceptance

For each product, record a named owner and pass a buyer-style walkthrough from discovery through purchase, feature use, fulfillment, report, support request and cancellation/refund. Verify the exact price and promises in the UI, API, database entitlement, Stripe catalog and operating procedure. Keep checkout closed for a product until its full acceptance record is complete.
