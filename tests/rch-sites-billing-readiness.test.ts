import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {RCH_SITE_PLANS,RCH_SITE_FOUNDING_OFFER,RCH_SITE_ADDONS} from '../src/lib/rch-sites-plans';

const source=(p:string)=>readFileSync(p,'utf8');
const stripe=source('src/lib/rch-sites-stripe-billing.ts');
const auth=source('src/lib/rch-sites-billing-auth.ts');
const checkout=source('src/app/api/rch-sites/billing/checkout/route.ts');
const webhook=source('src/app/api/rch-sites/billing/webhook/route.ts');
const portal=source('src/app/api/rch-sites/billing/portal/route.ts');
const migration=source('supabase/migrations/20261028031000_rch_sites_dedicated_stripe_billing_rails.sql');
const billingUi=source('src/app/network/dashboard/sites/billing/page.tsx');

describe('RCH Sites Stripe billing readiness — staged, not silently enabled',()=>{
  it('uses an independent four-price catalog, no client-supplied price or Stripe Connect for organizations',()=>{
    expect(RCH_SITE_PLANS.amateur.proposedMonthlyUsd).toBe(19);
    expect(RCH_SITE_PLANS.amateur.proposedAnnualUsd).toBe(190);
    expect(RCH_SITE_PLANS.professional.proposedMonthlyUsd).toBe(49);
    expect(RCH_SITE_PLANS.professional.proposedAnnualUsd).toBe(490);
    for(const env of ['RCH_SITES_PRICE_AMATEUR_MONTHLY','RCH_SITES_PRICE_AMATEUR_ANNUAL',
      'RCH_SITES_PRICE_PROFESSIONAL_MONTHLY','RCH_SITES_PRICE_PROFESSIONAL_ANNUAL'])
      expect(stripe).toContain(env);
    expect(stripe).toContain("process.env.RCH_SITES_BILLING_ENABLED==='true'");
    expect(stripe).toContain('RCH_SITES_STRIPE_WEBHOOK_SECRET');
    expect(checkout).toContain('rchSitesPrice(tier,interval)');
    expect(checkout).not.toContain('raw.priceId');
    expect(checkout).not.toContain('network_organization_subscriptions');
    expect(checkout).not.toContain('stripe_connect');
  });

  it('requires verified tenant manager, confirmed account and MFA before access',()=>{
    expect(auth).toContain('getServerSupabaseClient');
    expect(auth).toContain('getAuthenticatorAssuranceLevel');
    expect(auth).toContain('user.email_confirmed_at');
    expect(auth).toContain('onboarding_complete');
    expect(auth).toContain("['owner','manager']");
    expect(auth).toContain('organization.is_verified!==true');
    expect(auth).toContain('organization.is_claimed!==true');
    expect(checkout).toContain('verifiedRchSiteBillingOrg');
    expect(portal).toContain('verifiedRchSiteBillingOrg');
    expect(checkout).toContain('rchSitesBillingOriginAllowed');
    expect(portal).toContain('rchSitesBillingOriginAllowed');
  });

  it('prevents parallel second paid checkout and keeps default free plans in production',()=>{
    expect(migration).toContain('rch_site_billing_intents_one_open_checkout');
    expect(migration).toContain("where status in ('pending','checkout_ready')");
    expect(migration).toContain('rch_site_billing_events');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('from public,anon,authenticated');
    expect(checkout).toContain('existingCheckout:true');
    expect(checkout).toContain('manage_existing');
    expect(checkout).toContain('payment_processing');
    expect(checkout).toContain('No subscription was activated.');
    expect(migration).not.toContain('update public.rch_site_booking_quota_rollout set enforce_booking=true');
    expect(migration).not.toContain("network_tier='premier'");
  });

  it('verifies signed Stripe messages, remote subscription price and paid invoice before granting',()=>{
    expect(stripe).toContain('timingSafeEqual');
    expect(stripe).toContain('createHmac');
    expect(stripe).toContain('Math.abs(nowSeconds-epoch)>300');
    expect(stripe).toContain("p.currency!=='usd'");
    expect(stripe).toContain('p.unit_amount!==RCH_SITE_PLANS');
    expect(stripe).toContain("stripePrice.unit_amount!==approvedCents");
    expect(stripe).toContain("stripePrice.active!==true");
    expect(stripe).toContain("invoice?.status==='paid'");
    expect(stripe).toContain('validPeriod');
    expect(webhook).toContain('verifyRchSitesStripeSignature');
    expect(webhook).toContain('fetchRchSitesSubscription');
    expect(webhook).toContain("subscription.metadata?.rch_product!=='sites'");
    expect(webhook).toContain('site_billing_intent_id');
    expect(webhook).toContain('verifyRchSitesStripePrice');
    expect(webhook).toContain("provider_subscription_ref:subscriptionId");
    expect(webhook).toContain('billing_status:state');
    expect(webhook).toContain('processed');
    expect(webhook).not.toContain("from('network_organization_subscriptions')");
    expect(webhook).not.toContain("from('network_organizations').update");
  });

  it('requires a restricted portal and withholds unimplemented founding or add-on sales',()=>{
    expect(stripe).toContain('RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID');
    expect(stripe).toContain('bpc_');
    expect(stripe).not.toContain("allow_promotion_codes','true'");
    expect(RCH_SITE_FOUNDING_OFFER.enrollmentOpen).toBe(false);
    expect(RCH_SITE_FOUNDING_OFFER.reservationEnabled).toBe(false);
    expect(RCH_SITE_ADDONS.length).toBe(5);
    expect(billingUi).toContain('!billing?.available');
    expect(billingUi).toContain('Enrollment not open');
    expect(billingUi).toContain('own PayPal Business account');
  });
});
