# RCH Sites migration drift — evidence and safe reconciliation plan (October 28, 2026)

**Outcome: HOLD. Do not reset the staging database, rewrite migration ledger entries, or re-run already-applied billing DDL on production.**

## Sources and scope

Direct migration-history reads of Supabase production and the disposable RCH Sites staging branch, plus read-only catalog comparisons of billing tables. Production billing remains disabled, with zero paid RCH Site subscriptions, zero billing intents, and zero webhook events. Staging contains 3 active sandbox plans and 26 webhook records that must be preserved during testing.

| Environment | Recorded migrations | Project ref |
|---|---:|---|
| Production | 279 | eoamxxvxswzudqwtbxvo |
| Staging | 281 | xrnmguuchatgllxwiper |

The histories disagree on 16 production records and have 10 staging-only names. Therefore the branch's MIGRATIONS_FAILED status is **not** a single missing billing migration version.

## Production version/name missing or different in staging

| Production version | Staging version | Migration name |
|---|---|---|
| 20260921045856 | — | add_admin_controlled_vip_verification |
| 20260921060410 | — | expand_social_notification_events |
| 20260928210001 | 20260928205922 | native_post_reposts |
| 20261011233030 | — | rch_scorebook_live_game_status_20261011 |
| 20261014195247 | 20261014153400 | rcl_royaltee_adult_cheer_partner |
| 20261027020848 | 20261026213500 | rch_sites_phase1_publishing |
| 20261027023621 | 20261027021500 | rch_sites_free_appointments |
| 20261027030925 | 20261027033500 | rch_sites_external_paypal_offerings |
| 20261027034014 | 20261027040000 | rch_sites_organization_inbox |
| 20261027074647 | 20261027074400 | rch_tv_resumable_video_bucket |
| 20261027135836 | 20261027151000 | rch_tv_quicktime_mov_uploads |
| 20261028005752 | — | rch_sites_subscription_booking_quotas |
| 20261028005805 | 20261028001200 | rch_site_self_serve_starter_drafts |
| 20261028020057 | 20261028014500 | rch_sites_server_only_table_privileges |
| 20261028024654 | 20261028024000 | rch_sites_starter_billing_preference |
| 20261028033138 | — | rch_sites_dedicated_stripe_billing_rails |

## Staging-only migration names

| Staging version | Migration name |
|---|---|
| 20260921045856 | add_vip_verification |
| 20260921060410 | expand_social_notifications |
| 20260928210001 | native_post_reposts_reapply_marker |
| 20261011233030 | rch_scorebook_live_game_status |
| 20261014195247 | rcl_royaltee_adult_cheer_partner_history |
| 20261015003549 | royaltee_registration_management_rpc_history |
| 20261027205500 | rch_site_subscription_booking_quotas |
| 20261028041000 | rch_sites_stripe_subscription_reconciliation |
| 20261028132258 | align_staging_with_released_sites_billing |
| 20261028134418 | restore_staging_service_role_billing_dependencies |

## Actual billing schema (read-only comparison)

Both databases contain the 3 required tables: rch_site_subscriptions, rch_site_billing_intents, and rch_site_billing_events. Each has RLS enabled. Both contain the same one-open-checkout partial unique index, Stripe customer/subscription uniqueness indexes, the required five billing columns, and the billing-intent updated_at trigger. Production contains no active paid website subscription or provider billing events, and quota enforcement is disabled in both environments.

Remaining structural differences:
- Staging has two **additional legacy alias columns**, provider_customer_ref and provider_price_ref, and corresponding legacy indexes; production does not. The current application uses provider_customer_id and provider_price_id.
- Staging's billing-event primary key and check constraints have names ending in **1**, while production's do not. Their definitions are functionally equivalent.
- The checkout-intent migration lives in the GitHub main branch at version **20261028031000**, yet production recorded it at version **20261028033138**. The staging ledger instead has a **20261028041000** reconciliation migration; these names/versions are not interchangeable without verifying the underlying SQL.

## Safe path to reconcile (not yet executed)

1. Preserve the existing staging sandbox results and the latest migration inventories. Do not run Supabase branch reset, delete/recreate the branch, or execute the old CREATE TABLE DDL.
2. Investigate the first branch migration failure in Supabase's **Manage Branches > View logs** for this preview branch, and distinguish historical filename renames from actual schema divergence. The Supabase tool currently exposes branch status, not the underlying branch migration-run error.
3. Use a reviewed **migration-history-only repair** only after validating the corresponding schema migration was already applied. Supabase's supported command is `supabase migration repair <version> --status applied|reverted`; it updates bookkeeping, not table definitions. Review each affected version instead of bulk marking all 16.
4. Re-run `supabase migration list`, schema diff and automated billing tests in a clean validation environment before any production merge. A fresh branch or reset may delete staging test records and can incur additional compute cost; do not initiate without an explicit plan and approval.
5. Keep separate launch blockers for a provider-generated `invoice.payment_failed` on a **previously paid, Checkout-linked Sites subscription**, expired-period entitlement enforcement, browser-level concurrent Checkout, payment recovery and Stripe Tax/cancellation policy.

References: [Supabase migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair), [Supabase branching troubleshooting](https://supabase.com/docs/guides/deployment/branching/troubleshooting), and [billing acceptance results](./RCH_SITES_BILLING_ACCEPTANCE_RESULTS_20261028.md).

**This report is an audit and repair plan, not an assertion that migration histories are repaired. No live Stripe or production DB changes have been made.**
