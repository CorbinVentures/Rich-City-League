import {describe,expect,it} from 'vitest';
import {
  RCH_SITE_FEATURE_KEYS,RCH_SITE_PLAN_TIERS,RCH_SITE_PLANS,
  RCH_SITE_QUOTA_KEYS,RCH_SITE_QUOTA_FEATURE,RCH_SITE_RELEASED_FEATURES,
  evaluateRchSiteFeature,evaluateRchSiteQuota,isRchSitePlanTier,
  effectiveRchSiteBillingStatus,
  type RchSiteEntitlementContext,
} from '../src/lib/rch-sites-plans';

const free:RchSiteEntitlementContext={
  tier:'free',billingStatus:'none',organizationEligible:true,membershipActive:true,
};
const paid:RchSiteEntitlementContext={
  ...free,tier:'amateur',billingStatus:'active',
  currentPeriodEnd:'2099-01-01T00:00:00.000Z',
};

describe('RCH Sites Phase 0: proposed plans and default-deny release gates',()=>{
  it('models exactly three distinct website plans, not Network advertisement tiers',()=>{
    expect(RCH_SITE_PLAN_TIERS).toEqual(['free','amateur','professional']);
    expect(isRchSitePlanTier('community')).toBe(false);
    expect(isRchSitePlanTier('flagship')).toBe(false);
    expect(isRchSitePlanTier('amateur')).toBe(true);
    expect(RCH_SITE_PLANS.free.proposedMonthlyUsd).toBe(0);
    expect(RCH_SITE_PLANS.amateur.proposedMonthlyUsd).toBe(19);
    expect(RCH_SITE_PLANS.professional.proposedMonthlyUsd).toBe(49);
  });

  it('has complete finite, integer, nonnegative quotas across every tier',()=>{
    for(const tier of RCH_SITE_PLAN_TIERS){
      const plan=RCH_SITE_PLANS[tier];
      expect(new Set(plan.features).size).toBe(plan.features.length);
      expect(Object.keys(plan.limits).sort()).toEqual([...RCH_SITE_QUOTA_KEYS].sort());
      for(const value of Object.values(plan.limits)){
        expect(Number.isSafeInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
      expect(plan.analyticsHistoryDays).toBeGreaterThan(0);
    }
  });

  it('extends rather than removes features and never lowers included limits',()=>{
    for(const [lower,upper] of [['free','amateur'],['amateur','professional']] as const){
      const smaller=RCH_SITE_PLANS[lower],larger=RCH_SITE_PLANS[upper];
      for(const feature of smaller.features)expect(larger.features).toContain(feature);
      for(const key of RCH_SITE_QUOTA_KEYS){
        expect(larger.limits[key]).toBeGreaterThanOrEqual(smaller.limits[key]);
      }
    }
    expect(RCH_SITE_PLANS.free.limits.published_sites).toBe(1);
    expect(RCH_SITE_PLANS.free.limits.marketing_emails_monthly).toBe(0);
    expect(RCH_SITE_PLANS.professional.limits.private_athletes).toBe(500);
  });

  it('fails closed for invalid tier, unapproved organization and revoked membership',()=>{
    expect(evaluateRchSiteFeature({...free,tier:'network-premier'},'site.publish'))
      .toEqual({allowed:false,reason:'invalid_tier'});
    expect(evaluateRchSiteFeature({...free,organizationEligible:false},'site.publish'))
      .toEqual({allowed:false,reason:'ineligible_organization'});
    expect(evaluateRchSiteFeature({...free,membershipActive:false},'site.publish'))
      .toEqual({allowed:false,reason:'inactive_membership'});
    expect(evaluateRchSiteFeature(free,'admin.users'))
      .toEqual({allowed:false,reason:'unknown_feature'});
  });

  it('requires an active dedicated site subscription for paid tiers',()=>{
    for(const billingStatus of ['none','trialing','past_due','canceled'] as const){
      expect(evaluateRchSiteFeature({...paid,billingStatus},'site.publish'))
        .toEqual({allowed:false,reason:'inactive_subscription'});
    }
    expect(evaluateRchSiteFeature(paid,'site.publish')).toEqual({allowed:true});
  });

  it('expires paid feature and quota access even if the webhook still says active',()=>{
    const expiration='2026-10-28T19:00:00.000Z';
    expect(effectiveRchSiteBillingStatus('professional','active',expiration,
      Date.parse('2026-10-28T18:59:59.999Z'))).toBe('active');
    expect(effectiveRchSiteBillingStatus('professional','active',expiration,
      Date.parse(expiration))).toBe('past_due');
    expect(effectiveRchSiteBillingStatus('professional','active',expiration,
      Date.parse('2026-10-29T01:00:00.000Z'))).toBe('past_due');
    for(const missing of [null,undefined,'','unparseable','1970-01-01T00:00:00.000Z']){
      expect(effectiveRchSiteBillingStatus('amateur','active',missing)).toBe('past_due');
      expect(evaluateRchSiteFeature({...paid,currentPeriodEnd:missing},'booking.basic'))
        .toEqual({allowed:false,reason:'inactive_subscription'});
      expect(evaluateRchSiteQuota({...paid,currentPeriodEnd:missing},'booking_services',0,1))
        .toEqual({allowed:false,reason:'inactive_subscription'});
    }
    expect(effectiveRchSiteBillingStatus('free','none',null)).toBe('none');
    expect(evaluateRchSiteFeature(free,'booking.basic')).toEqual({allowed:true});
    expect(effectiveRchSiteBillingStatus('professional','canceled','2099-01-01T00:00:00Z'))
      .toBe('canceled');
    expect(effectiveRchSiteBillingStatus('professional','past_due','2099-01-01T00:00:00Z'))
      .toBe('past_due');
  });

  it('does not mistake planned features for live functionality',()=>{
    expect(evaluateRchSiteFeature(free,'site.publish')).toEqual({allowed:true});
    expect(evaluateRchSiteFeature(free,'booking.basic')).toEqual({allowed:true});
    expect(evaluateRchSiteFeature(free,'booking.group'))
      .toEqual({allowed:false,reason:'not_in_plan'});
    expect(evaluateRchSiteFeature(paid,'booking.group'))
      .toEqual({allowed:false,reason:'not_released'});
    expect(evaluateRchSiteFeature(paid,'registration.guardian'))
      .toEqual({allowed:false,reason:'not_released'});
    expect(evaluateRchSiteFeature({...paid,tier:'professional'},'events.multi_division'))
      .toEqual({allowed:false,reason:'not_released'});
    for(const feature of RCH_SITE_RELEASED_FEATURES)expect(RCH_SITE_FEATURE_KEYS).toContain(feature);
  });

  it('maps every resource limit to a feature gate',()=>{
    expect(Object.keys(RCH_SITE_QUOTA_FEATURE).sort()).toEqual([...RCH_SITE_QUOTA_KEYS].sort());
    for(const feature of Object.values(RCH_SITE_QUOTA_FEATURE))
      expect(RCH_SITE_FEATURE_KEYS).toContain(feature);
    expect(evaluateRchSiteQuota(free,'registration_programs',0))
      .toEqual({allowed:false,reason:'not_in_plan'});
    expect(evaluateRchSiteQuota(paid,'registration_programs',0))
      .toEqual({allowed:false,reason:'not_released'});
  });

  it('handles inclusive caps, increments, invalid use and over-limit accounts',()=>{
    expect(evaluateRchSiteQuota(free,'booking_services',0))
      .toEqual({allowed:true,limit:2,remaining:1});
    expect(evaluateRchSiteQuota(free,'booking_services',1,1))
      .toEqual({allowed:true,limit:2,remaining:0});
    expect(evaluateRchSiteQuota(free,'booking_services',2,1))
      .toEqual({allowed:false,reason:'quota_exceeded',limit:2,remaining:0});
    expect(evaluateRchSiteQuota(free,'booking_services',100,1))
      .toEqual({allowed:false,reason:'quota_exceeded',limit:2,remaining:0});
    expect(evaluateRchSiteQuota(free,'booking_services',0,3))
      .toEqual({allowed:false,reason:'quota_exceeded',limit:2,remaining:2});
    for(const invalid of [-1,1.5,Number.POSITIVE_INFINITY,NaN,'2',null]){
      expect(evaluateRchSiteQuota(free,'booking_services',invalid))
        .toEqual({allowed:false,reason:'invalid_usage'});
    }
    for(const invalid of [0,-1,1.5,Infinity,'1']){
      expect(evaluateRchSiteQuota(free,'booking_services',0,invalid))
        .toEqual({allowed:false,reason:'invalid_usage'});
    }
    expect(evaluateRchSiteQuota(free,'anything',0))
      .toEqual({allowed:false,reason:'unknown_quota'});
  });
});
