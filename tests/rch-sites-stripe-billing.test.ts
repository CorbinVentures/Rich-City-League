import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const code=(path:string)=>readFileSync(path,'utf8');
const stripe=code('src/lib/rch-sites-stripe.ts');
const checkout=code('src/app/api/rch-sites/billing/checkout/route.ts');
const portal=code('src/app/api/rch-sites/billing/portal/route.ts');
const webhook=code('src/app/api/rch-sites/billing/webhook/route.ts');
const auth=code('src/lib/rch-sites-billing-auth.ts');
const migration=code('supabase/migrations/20261028041000_rch_sites_stripe_subscription_reconciliation.sql');
describe('RCH Website Creator payment separation and launch guard',()=>{
  it('uses unique keys and approved subscription intervals instead of Network or membership billing',()=>{
    expect(stripe).toContain('STRIPE_RCH_SITES_SECRET_KEY');
    expect(stripe).toContain('STRIPE_RCH_SITES_WEBHOOK_SECRET');
    expect(stripe).toContain("if(!config)throw Error('A dedicated RCH Sites Stripe portal must be configured.');");
    for(const key of ['AMATEUR_MONTHLY','AMATEUR_ANNUAL','PROFESSIONAL_MONTHLY','PROFESSIONAL_ANNUAL'])
      expect(stripe).toContain('STRIPE_RCH_SITES_PRICE_'+key);
    expect(stripe).not.toContain('STRIPE_NETWORK_WEBHOOK_SECRET');
    expect(stripe).not.toContain('STRIPE_PRICE_RCL_PLUS');
    expect(stripe).toContain("process.env.RCH_SITES_BILLING_ENABLED==='true'");
    expect(stripe).toContain("price?.unit_amount===amount");
    expect(stripe).toContain("price?.currency!=='usd'");
  });
  it('requires verified owner or manager and server-owned plan decisions',()=>{
    expect(auth).toContain("['owner','manager'].includes(member.member_role)");
    expect(auth).toContain("org.is_verified!==true");
    expect(auth).toContain("org.is_claimed!==true");
    expect(auth).toContain("assurance.nextLevel==='aal2'");
    expect(checkout).toContain('rchBillingOriginIsValid(request)');
    expect(checkout).toContain('rchBillingManagedOrganization(context,input.organizationId)');
    expect(checkout).toContain("if(existing?.provider_subscription_ref)");
    expect(checkout).toContain('rchSiteStripeReady(input.tier,input.interval)');
    expect(checkout).not.toContain('preferred_tier');
    expect(portal).toContain('rchBillingManagedOrganization(context,input?.organizationId)');
  });
  it('only trusts signed webhooks and reconciles against the latest Stripe subscription',()=>{
    expect(stripe).toContain("crypto.createHmac('sha256',key)");
    expect(stripe).toContain('crypto.timingSafeEqual');
    expect(webhook).toContain("verifyRchSitesWebhook(payload,request.headers.get('stripe-signature'))");
    expect(webhook).toContain('retrieveRchSitesSubscription(subscriptionId)');
    expect(webhook).toContain("parsed.family!=='rch_sites'");
    expect(webhook).toContain('parsed.mapping');
    expect(webhook).toContain("select('provider_subscription_ref,provider_customer_ref')");
    expect(webhook).toContain("billing_status:'none'");
    expect(webhook).toContain("processing_status:'failed'");
    expect(webhook).not.toContain('network_organization_subscriptions');
    expect(webhook).not.toContain('paypal');
  });
  it('locks billing event records behind server-side privileges with no quota activation',()=>{
    expect(migration).toContain('alter table public.rch_site_billing_events enable row level security;');
    expect(migration).toContain('revoke all on public.rch_site_billing_events from public,anon,authenticated;');
    expect(migration).toContain('create unique index rch_sites_provider_subscription_unique');
    expect(migration).toContain('create unique index rch_sites_provider_customer_unique');
    expect(migration).not.toContain('set enforce_booking=true');
  });
});
