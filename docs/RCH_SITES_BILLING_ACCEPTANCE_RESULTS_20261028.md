# RCH Sites — sandbox billing acceptance evidence (2026-10-28)

**Scope:** Rich City Hoops Website Creator SaaS subscriptions. Organization-owned PayPal customer payments, RCH membership and Network advertising remain separate. No live customer payments were made.

**Isolation:** Stripe "general" sandbox; draft GitHub PR #623 on branch feat/rch-sites-stripe-subscriptions-20261028; protected Vercel Preview; Supabase staging branch xrnmguuchatgllxwiper. Never copy sandbox API keys or test identities to production.

## Confirmed end-to-end purchases

| Test | Stripe result | Staging entitlement |
|---|---|---|
| Amateur monthly $19 | Paid, active | Amateur, monthly, active |
| Amateur annual $190 | Paid, active | Amateur, annual, active |
| Professional monthly $49 | Paid, then intentionally canceled | Professional, monthly, canceled |
| Professional annual $490 | Paid, active | Professional, annual, active |

Sandbox subscription references (not credentials): Amateur monthly sub_1UVbJFEHXWVaGmOhBjyTZKMq; Amateur annual sub_1UVbZCEHXWVaGmOhcryv0bJv; Professional monthly sub_1UVXBqEHXWVaGmOhodUgFIWu; Professional annual sub_1UVbakEHXWVaGmOhnLZds0W3.

All four completed purchases reconciled Checkout completion, subscription creation and paid invoice events in the staging ledger. A mistakenly selected $19 monthly subscription on the Professional Annual test organization was canceled; a later $490 annual checkout activated the correct plan.

## Other verified checks

- End-of-period cancellation and reversal; immediate cancellation and processing of its webhook.
- Customer Portal session creation with invoices, payment-method changes and cancellation. Direct self-service tier switching remains disabled.
- Signed-in staging user could read its three authorized organization memberships but not another organization's memberships.
- Temporary manager revocation test denied active owner/manager access. The transaction was rolled back and the manager membership restored.
- Authenticated users have no direct access to private website billing subscription, intent or webhook tables.
- Second pending Checkout intent was rejected by the real staging unique index in a rolled-back transaction.
- Duplicate webhook event ID was rejected by the real staging primary key in a rolled-back transaction.
- Unrelated sandbox subscription and cancellation webhook events were safely ignored.
- Draft code now distinguishes initial failed invoices from failed renewals. Automated tests cover unpaid, incomplete, canceled, expired-period and renewal failure states without granting paid access.

## Unverified release gates

1. A provider-generated failed renewal event on a previously successful linked Website Creator Checkout is still untested. Mocked tests alone are not end-to-end verification.
2. Two simultaneous authenticated HTTP Checkout requests across browser tabs and real cross-organization API access attempts remain untested, though the database guards passed.
3. Actual billing-period expiry via Stripe simulation has not yet been tested.
4. The Supabase staging branch currently reports MIGRATIONS_FAILED despite billing tables existing. Production already has the billing tables, duplicate-Checkout indexes and trigger, with the rails recorded under migration version 20261028033138, while this draft branch also contains 20261028031000 for the billing rails. Reconcile migration naming, history, and safe repeatability before merging; do not run the draft DDL blindly against production.
5. The booking-quota rollout remains off. Enforce the current paid period end as well as active billing status before paid-tier quota enforcement; a missed webhook must not leave indefinite entitlement.
6. Review operational failed-payment notices, support, recovery, tax and cancellation policies before public launch.

**Release gate:** Keep the production RCH_SITES_BILLING_ENABLED flag false, live Stripe webhook disabled and PR #623 in draft until outstanding tests pass and an explicit release is approved.
