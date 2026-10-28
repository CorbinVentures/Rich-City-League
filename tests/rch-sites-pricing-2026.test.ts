import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {RCH_SITE_PLANS,RCH_SITE_FOUNDING_OFFER,RCH_SITE_ADDONS,
  RCH_SITE_PLAN_TIERS,getRchSitePlanDisplayPrice,isRchSiteBillingInterval,
  evaluateRchSiteFeature} from '../src/lib/rch-sites-plans';

const code=(path:string)=>readFileSync(path,'utf8');

describe('RCH Sites announced prices without early billing activation',()=>{
  it('sets the approved Free, Amateur and Professional monthly and annual pricing',()=>{
    expect(RCH_SITE_PLAN_TIERS).toEqual(['free','amateur','professional']);
    expect(RCH_SITE_PLAN_TIERS.map(t=>getRchSitePlanDisplayPrice(t,'monthly'))).toEqual([0,19,49]);
    expect(RCH_SITE_PLAN_TIERS.map(t=>getRchSitePlanDisplayPrice(t,'annual'))).toEqual([0,190,490]);
    expect(RCH_SITE_PLANS.amateur.proposedAnnualUsd).toBe(RCH_SITE_PLANS.amateur.proposedMonthlyUsd*10);
    expect(RCH_SITE_PLANS.professional.proposedAnnualUsd).toBe(RCH_SITE_PLANS.professional.proposedMonthlyUsd*10);
    expect(isRchSiteBillingInterval('annual')).toBe(true);
    expect(isRchSiteBillingInterval('monthly')).toBe(true);
    expect(isRchSiteBillingInterval('weekly')).toBe(false);
  });
  it('announces bounded founder discounts without reserving them',()=>{
    expect(RCH_SITE_FOUNDING_OFFER.maximumOrganizations).toBe(50);
    expect(RCH_SITE_FOUNDING_OFFER.discountedMonths).toBe(12);
    expect(RCH_SITE_FOUNDING_OFFER.enrollmentOpen).toBe(false);
    expect(RCH_SITE_FOUNDING_OFFER.reservationEnabled).toBe(false);
    expect(RCH_SITE_PLANS.amateur.proposedFoundingMonthlyUsd).toBe(14);
    expect(RCH_SITE_PLANS.professional.proposedFoundingMonthlyUsd).toBe(39);
  });
  it('models consistent page, form, seat and booking quotas',()=>{
    expect(RCH_SITE_PLAN_TIERS.map(t=>RCH_SITE_PLANS[t].limits.site_pages)).toEqual([1,6,20]);
    expect(RCH_SITE_PLAN_TIERS.map(t=>RCH_SITE_PLANS[t].limits.staff_accounts)).toEqual([1,3,10]);
    expect(RCH_SITE_PLAN_TIERS.map(t=>RCH_SITE_PLANS[t].limits.registration_forms)).toEqual([1,5,20]);
    expect(RCH_SITE_PLAN_TIERS.map(t=>RCH_SITE_PLANS[t].limits.booking_services)).toEqual([2,15,60]);
    expect(RCH_SITE_PLAN_TIERS.map(t=>RCH_SITE_PLANS[t].limits.confirmed_bookings_monthly)).toEqual([25,150,600]);
    expect(RCH_SITE_PLANS.amateur.features).not.toContain('seo.custom_domain');
    expect(RCH_SITE_PLANS.professional.features).toContain('seo.custom_domain');
    expect(RCH_SITE_PLANS.professional.features).toContain('events.brackets');
    expect(RCH_SITE_PLANS.amateur.features).not.toContain('events.brackets');
  });
  it('never treats roadmap modules as already enabled or preference as payment',()=>{
    const free={tier:'free',organizationEligible:true,membershipActive:true,billingStatus:'none'} as const;
    expect(evaluateRchSiteFeature(free,'registration.forms')).toEqual({allowed:false,reason:'not_released'});
    expect(evaluateRchSiteFeature({...free,tier:'professional',billingStatus:'none'},'site.publish'))
      .toEqual({allowed:false,reason:'inactive_subscription'});
    const ui=code('src/components/sites/RchSitePricingCards.tsx');
    expect(ui).toContain('Planned for this level');
    expect(ui).toContain('Enrollment is not open');
    expect(ui).not.toContain('checkout.sessions');
    expect(ui).toContain('own PayPal Business links');
    const starter=code('src/app/api/rch-sites/starter/route.ts');
    expect(starter).toContain('preferred_billing_interval:raw.billingInterval');
    expect(starter).not.toContain("from('rch_site_subscriptions').update");
  });
  it('keeps optional revenue items unbundled and not checkout-ready',()=>{
    expect(RCH_SITE_ADDONS.map(a=>a.priceUsd)).toEqual([99,29,15,10,5]);
    expect(RCH_SITE_ADDONS.find(a=>a.id==='discover_featured')).toMatchObject({priceUsd:10,maximumPriceUsd:20});
    expect(RCH_SITE_ADDONS.find(a=>a.id==='extra_staff')).toMatchObject({unit:'seat_monthly'});
  });
});
