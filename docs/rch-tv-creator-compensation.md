# RCH TV Creator Compensation — Pilot v1

This is a **controlled accounting foundation**, not live automatic payouts or a promise of earnings.

## Policy pending legal and business approval
- Illustrative creator pool: **25% of verified eligible net subscription revenue**, configurable per month (2,500 basis points).
- Eligible revenue must be documented, net of refunds, applicable taxes, processing costs and other deductions under the eventual signed agreement; do not use the live subscription plan price as proof of collected revenue.
- Only verified RCH TV viewing, authorized/licensed titles, approved creators, written agreements and fully completed calendar months participate.
- Qualifying usage must originate from audited stream/CDN or comparable first-party playback evidence and be entered by an authorized admin with its evidence URL. **Browser-generated views do not automatically become payable.**
- Deterministic largest-remainder allocation distributes integer cents without lost pennies.
- Earnings are held until administrative approval. Marking 'paid' requires an external payment reference and paid timestamp. **No automatic payouts are implemented by this change.**
- Underage creators, tax/KYC collection, Stripe Connect onboarding, dispute/chargeback handling and signed agreements need operational approval before payment.
- Initial app screens are behind admin / logged-in creator access; signed terms and rights are explicitly required in database.

## Operational steps
1. Recruit a creator on /media/creators/apply; match them to their registered RCH profile.
2. Obtain signed legal/compensation agreement; register an account and title, verify rights.
3. Use /admin/rch-tv/earnings to enter recognized revenue evidence for a completed month, then add independently audited watch seconds per eligible title.
4. Close the month once vetted. The function atomically freezes the month and allocates every creator's earned cents.
5. Creators read totals on /media/creators/dashboard.
6. Approve earnings, separately pay creators through a verified off-platform process, then record the reference and date. **Do not mark paid until actually received/confirmed.**
7. Integrate Stripe Connect, payout idempotency, webhook reconciliation and trusted stream analytics before enabling automation.

## Security
All public tables have RLS. Creator can only read own account/titles/earnings; only admins can manage contracts, revenue and evidence. Payout amounts are immutable after period close. Postgres function only runs for authenticated admins.