# Stripe Connect creator payout rails

RCH TV has **Stripe Connect Express onboarding** and an **admin-initiated, guarded balance transfer endpoint**. These are not enabled as a public monetization promise.

- Set STRIPE_SECRET_KEY and confirm the platform is approved for Connect Express.
- Set NEXT_PUBLIC_SITE_URL to the canonical HTTPS deployment URL.
- Keep RCH_CREATOR_STRIPE_TRANSFERS_ENABLED unset/false until the finance team approves payout policies, funds availability, KYC and taxes.
- Adults with approved signed creator accounts can start/revisit onboarding via the creator earnings dashboard.
- The server checks Stripe's actual transfers capability, details_submitted and payouts_enabled fields.
- Only admins can request a transfer after an earning is approved, and only when the server-side enable flag is true.
- Each earning ID is inserted as a **unique disbursement claim before** calling Stripe. If a request fails ambiguously, its row is marked needs_review; **never blind-retry**. Manually inspect Stripe Dashboard using the earning ID / idempotency key before further action.
- Stripe transfers move funds **from RCH's platform balance to a creator's connected balance**. This is NOT confirmation of payout arrival at the creator's bank. The ledger must only be marked paid after independently verified bank payout.
- Do not store bank account numbers or identity documents in RCH's database; Stripe hosts onboarding.
- Reconcile transfers, connected-account payouts, disputes and platform balance before enabling any scheduled transfers.
