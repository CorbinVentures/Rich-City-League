import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {
  evaluateRchSiteFeature,evaluateRchSiteQuota,
  type RchSiteEntitlementContext,
} from '../src/lib/rch-sites-plans';

vi.mock('server-only',()=>({}));

const env={
  STRIPE_SECRET_KEY:'sk_test_isolated_mock_only',
  RCH_SITES_BILLING_ENABLED:'true',
  RCH_SITES_STRIPE_WEBHOOK_SECRET:'whsec_isolated_mock_only',
  RCH_SITES_STRIPE_PORTAL_CONFIGURATION_ID:'bpc_isolatedMock',
  RCH_SITES_PRICE_AMATEUR_MONTHLY:'price_fixtureAmateurMonthly',
  RCH_SITES_PRICE_AMATEUR_ANNUAL:'price_fixtureAmateurAnnual',
  RCH_SITES_PRICE_PROFESSIONAL_MONTHLY:'price_fixtureProfessionalMonthly',
  RCH_SITES_PRICE_PROFESSIONAL_ANNUAL:'price_fixtureProfessionalAnnual',
};
const importBilling=()=>import('../src/lib/rch-sites-stripe-billing');

describe('RCH Sites payment failure, renewal and entitlement safety',()=>{
  beforeEach(()=>{for(const [key,value] of Object.entries(env))vi.stubEnv(key,value);});
  afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});

  const subscription=(status='active',invoiceStatus='paid',periodOffset=86400)=>({
    id:'sub_fixture',
    customer:'cus_fixture',
    status,
    latest_invoice:{status:invoiceStatus,paid:invoiceStatus==='paid'},
    items:{data:[{current_period_end:Math.floor(Date.now()/1000)+periodOffset,
      price:{id:env.RCH_SITES_PRICE_PROFESSIONAL_ANNUAL,
        unit_amount:49000,currency:'usd',recurring:{interval:'year'}}}]},
  });

  it.each([
    ['active','open','past_due'],
    ['active','uncollectible','past_due'],
    ['active','void','past_due'],
    ['past_due','open','past_due'],
    ['unpaid','open','past_due'],
    ['incomplete','open','past_due'],
    ['incomplete_expired','open','past_due'],
    ['paused','paid','past_due'],
    ['trialing','paid','past_due'],
    ['canceled','paid','canceled'],
    ['active','paid','active'],
  ])('never grants a failed or incomplete invoice: %s / %s',async(status,invoiceStatus,expected)=>{
    const b=await importBilling();
    expect(b.stripeSiteSubscriptionState(subscription(status,invoiceStatus))).toBe(expected);
  });

  it('rejects an otherwise paid subscription after the coverage period expires',async()=>{
    const b=await importBilling();
    expect(b.stripeSiteSubscriptionState(subscription('active','paid',-1))).toBe('past_due');
    expect(b.stripeSiteSubscriptionState(subscription('active','paid',0))).not.toBe('active');
  });

  it('distinguishes a failed initial Checkout from a failed renewal after paid Checkout',async()=>{
    const b=await importBilling();
    expect(b.isUnpaidInitialRchSitesInvoiceFailure('invoice.payment_failed',{
      status:'open',payment_status:'unpaid'})).toBe(true);
    expect(b.isUnpaidInitialRchSitesInvoiceFailure('invoice.payment_failed',{
      status:'complete',payment_status:'unpaid'})).toBe(true);
    expect(b.isUnpaidInitialRchSitesInvoiceFailure('invoice.payment_failed',{
      status:'expired',payment_status:'unpaid'})).toBe(true);
    expect(b.isUnpaidInitialRchSitesInvoiceFailure('invoice.payment_failed',{
      status:'complete',payment_status:'paid'})).toBe(false);
    expect(b.isUnpaidInitialRchSitesInvoiceFailure('invoice.paid',{
      status:'open',payment_status:'unpaid'})).toBe(false);
  });

  it('revokes paid-tier feature and quota access during a failed renewal, then restores it on payment',()=>{
    const base:RchSiteEntitlementContext={
      organizationEligible:true,membershipActive:true,tier:'professional',billingStatus:'active',
      currentPeriodEnd:'2099-01-01T00:00:00.000Z',
    };
    expect(evaluateRchSiteFeature(base,'booking.basic')).toEqual({allowed:true});
    expect(evaluateRchSiteQuota(base,'booking_services',0,1)).toMatchObject({allowed:true});
    for(const billingStatus of ['past_due','canceled','trialing'] as const){
      const inactive={...base,billingStatus};
      expect(evaluateRchSiteFeature(inactive,'booking.basic'))
        .toEqual({allowed:false,reason:'inactive_subscription'});
      expect(evaluateRchSiteQuota(inactive,'booking_services',0,1))
        .toEqual({allowed:false,reason:'inactive_subscription'});
    }
    expect(evaluateRchSiteFeature({...base,billingStatus:'active'},'booking.basic'))
      .toEqual({allowed:true});
  });

  it('expires paid access even when the Stripe renewal webhook is delayed',()=>{
    const stale:RchSiteEntitlementContext={
      organizationEligible:true,membershipActive:true,tier:'professional',billingStatus:'active',
      currentPeriodEnd:'2026-10-01T00:00:00.000Z',
    };
    expect(evaluateRchSiteFeature(stale,'booking.basic'))
      .toEqual({allowed:false,reason:'inactive_subscription'});
    expect(evaluateRchSiteQuota(stale,'booking_services',1,1))
      .toEqual({allowed:false,reason:'inactive_subscription'});
    expect(evaluateRchSiteFeature({...stale,currentPeriodEnd:'2099-01-01T00:00:00.000Z'},'booking.basic'))
      .toEqual({allowed:true});
  });

  it('retains explicitly free features but does not grant paid-only features to Free',()=>{
    const free:RchSiteEntitlementContext={
      organizationEligible:true,membershipActive:true,tier:'free',billingStatus:'none',
    };
    expect(evaluateRchSiteFeature(free,'booking.basic')).toEqual({allowed:true});
    expect(evaluateRchSiteFeature(free,'booking.recurring'))
      .toEqual({allowed:false,reason:'not_in_plan'});
  });

  it('rejects missing invoice, missing period and stale invoice even if Stripe reports active',async()=>{
    const b=await importBilling();
    const paid=subscription();
    expect(b.stripeSiteSubscriptionState({...paid,latest_invoice:null})).toBe('past_due');
    expect(b.stripeSiteSubscriptionState({...paid,items:{data:[]}})).toBe('past_due');
    expect(b.stripeSiteSubscriptionState({...paid,latest_invoice:{status:'open',paid:false}})).toBe('past_due');
  });

  it('never grants a mismatched tenant or an unpaid or incomplete Checkout',async()=>{
    const b=await importBilling();
    const expected={
      intentId:'11111111-1111-4111-8111-111111111111',
      organizationId:'22222222-2222-4222-8222-222222222222',
      sessionId:'cs_test_fixture',subscriptionId:'sub_fixture',
    };
    const checkout={
      id:expected.sessionId,status:'complete' as const,mode:'subscription',
      payment_status:'paid',url:null,subscription:expected.subscriptionId,
      client_reference_id:expected.organizationId,
      metadata:{rch_product:'sites',site_billing_intent_id:expected.intentId},
    };
    expect(b.isVerifiedRchSitesCheckoutLineage(checkout,expected)).toBe(true);
    const invalid=[
      {...checkout,payment_status:'unpaid'},
      {...checkout,status:'expired' as const},
      {...checkout,subscription:'sub_otherTenant'},
      {...checkout,client_reference_id:'another-tenant'},
      {...checkout,metadata:{...checkout.metadata,rch_product:'network'}},
      {...checkout,metadata:{...checkout.metadata,site_billing_intent_id:'another-intent'}},
    ];
    for(const value of invalid){
      expect(b.isVerifiedRchSitesCheckoutLineage(value,expected)).toBe(false);
    }
  });
});
