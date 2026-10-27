/* RCH Sites Phase 0: pure, server-consumable website plan contracts.
 * These proposed tiers do NOT activate subscriptions, alter published sites or
 * replace organization authorization, database RLS or atomic quota transactions.
 * Never accept tier, billing status, membership or rollout flags from clients.
 */
export const RCH_SITE_PLAN_TIERS=['free','amateur','professional'] as const;
export type RchSitePlanTier=(typeof RCH_SITE_PLAN_TIERS)[number];

export const RCH_SITE_FEATURE_KEYS=[
  'site.publish',
  'booking.basic','booking.recurring','booking.multi_staff','booking.group','booking.resources',
  'registration.adult','registration.guardian','registration.multi_program',
  'seo.essentials','seo.analytics','seo.custom_domain','seo.advanced',
  'media.embeds','media.library','media.rch_tv','media.collections',
  'communications.inquiries','communications.marketing','communications.automation',
  'events.public','events.brackets','events.multi_division',
] as const;
export type RchSiteFeature=(typeof RCH_SITE_FEATURE_KEYS)[number];

export const RCH_SITE_QUOTA_KEYS=[
  'published_sites','staff_accounts','booking_services','upcoming_slots',
  'confirmed_bookings_monthly','registration_programs','private_athletes',
  'active_teams','upcoming_events','active_tournaments','media_storage_bytes',
  'video_embeds','marketing_emails_monthly','marketing_campaigns_monthly',
] as const;
export type RchSiteQuota=(typeof RCH_SITE_QUOTA_KEYS)[number];

type QuotaLimits=Readonly<Record<RchSiteQuota,number>>;
type PlanDefinition={
  readonly name:string;
  /** Proposed pricing only: not a checkout product or a billable price ID. */
  readonly proposedMonthlyUsd:number;
  readonly features:readonly RchSiteFeature[];
  readonly limits:QuotaLimits;
  readonly analyticsHistoryDays:number;
};

const FREE_FEATURES=[
  'site.publish','booking.basic','seo.essentials',
  'media.embeds','communications.inquiries','events.public',
] as const satisfies readonly RchSiteFeature[];
const AMATEUR_FEATURES=[
  ...FREE_FEATURES,
  'booking.recurring','booking.multi_staff','booking.group',
  'registration.adult','registration.guardian',
  'seo.analytics','seo.custom_domain',
  'media.library','media.rch_tv',
  'communications.marketing','events.brackets',
] as const satisfies readonly RchSiteFeature[];
const PROFESSIONAL_FEATURES=[
  ...AMATEUR_FEATURES,
  'booking.resources','registration.multi_program','seo.advanced',
  'media.collections','communications.automation','events.multi_division',
] as const satisfies readonly RchSiteFeature[];

const mib=1024*1024;
export const RCH_SITE_PLANS:Readonly<Record<RchSitePlanTier,PlanDefinition>>={
  free:{
    name:'Free',proposedMonthlyUsd:0,features:FREE_FEATURES,analyticsHistoryDays:90,
    limits:{
      published_sites:1,staff_accounts:1,booking_services:2,upcoming_slots:30,
      confirmed_bookings_monthly:25,registration_programs:0,private_athletes:0,
      active_teams:0,upcoming_events:2,active_tournaments:0,
      media_storage_bytes:250*mib,video_embeds:3,
      marketing_emails_monthly:0,marketing_campaigns_monthly:0,
    },
  },
  amateur:{
    name:'Amateur',proposedMonthlyUsd:19,features:AMATEUR_FEATURES,analyticsHistoryDays:365,
    limits:{
      published_sites:1,staff_accounts:3,booking_services:15,upcoming_slots:150,
      confirmed_bookings_monthly:150,registration_programs:3,private_athletes:100,
      active_teams:5,upcoming_events:20,active_tournaments:1,
      media_storage_bytes:2*1024*mib,video_embeds:20,
      marketing_emails_monthly:500,marketing_campaigns_monthly:2,
    },
  },
  professional:{
    name:'Professional',proposedMonthlyUsd:49,features:PROFESSIONAL_FEATURES,analyticsHistoryDays:730,
    limits:{
      published_sites:1,staff_accounts:10,booking_services:60,upcoming_slots:600,
      confirmed_bookings_monthly:600,registration_programs:20,private_athletes:500,
      active_teams:40,upcoming_events:100,active_tournaments:10,
      media_storage_bytes:10*1024*mib,video_embeds:100,
      marketing_emails_monthly:3000,marketing_campaigns_monthly:8,
    },
  },
};

/** Code-owned launch gates. Adding a feature to a paid tier does not launch it. */
export const RCH_SITE_RELEASED_FEATURES:ReadonlySet<RchSiteFeature>=new Set<RchSiteFeature>([
  'site.publish','booking.basic','seo.essentials','communications.inquiries',
]);

/** All quota checks also require the associated module to be launched. */
export const RCH_SITE_QUOTA_FEATURE:Readonly<Record<RchSiteQuota,RchSiteFeature>>={
  published_sites:'site.publish',
  staff_accounts:'site.publish',
  booking_services:'booking.basic',
  upcoming_slots:'booking.basic',
  confirmed_bookings_monthly:'booking.basic',
  registration_programs:'registration.adult',
  private_athletes:'registration.guardian',
  active_teams:'events.brackets',
  upcoming_events:'events.public',
  active_tournaments:'events.brackets',
  media_storage_bytes:'media.library',
  video_embeds:'media.embeds',
  marketing_emails_monthly:'communications.marketing',
  marketing_campaigns_monthly:'communications.marketing',
};

export type RchSiteBillingStatus='none'|'active'|'trialing'|'past_due'|'canceled';
export type RchSiteEntitlementContext={
  /** Must come from server-authenticated organization records, not request bodies. */
  readonly organizationEligible:boolean;
  readonly membershipActive:boolean;
  /** Must come from the dedicated future RCH Sites subscription, never Network tier. */
  readonly tier:unknown;
  readonly billingStatus:RchSiteBillingStatus;
};
export type RchSiteDenyReason=
  'invalid_tier'|'ineligible_organization'|'inactive_membership'|
  'inactive_subscription'|'unknown_feature'|'not_in_plan'|'not_released'|
  'unknown_quota'|'invalid_usage'|'quota_exceeded';
export type RchSiteGate={allowed:true}|{allowed:false;reason:RchSiteDenyReason};

export function isRchSitePlanTier(value:unknown):value is RchSitePlanTier{
  return typeof value==='string'&&RCH_SITE_PLAN_TIERS.some(tier=>tier===value);
}
export function isRchSiteFeature(value:unknown):value is RchSiteFeature{
  return typeof value==='string'&&RCH_SITE_FEATURE_KEYS.some(feature=>feature===value);
}
export function isRchSiteQuota(value:unknown):value is RchSiteQuota{
  return typeof value==='string'&&RCH_SITE_QUOTA_KEYS.some(key=>key===value);
}

/** Entitlement only. Caller must separately check active member role and object access. */
export function evaluateRchSiteFeature(context:RchSiteEntitlementContext,feature:unknown):RchSiteGate{
  if(!isRchSitePlanTier(context.tier))return {allowed:false,reason:'invalid_tier'};
  if(!context.organizationEligible)return {allowed:false,reason:'ineligible_organization'};
  if(!context.membershipActive)return {allowed:false,reason:'inactive_membership'};
  if(context.tier!=='free'&&context.billingStatus!=='active')
    return {allowed:false,reason:'inactive_subscription'};
  if(!isRchSiteFeature(feature))return {allowed:false,reason:'unknown_feature'};
  if(!RCH_SITE_PLANS[context.tier].features.includes(feature))
    return {allowed:false,reason:'not_in_plan'};
  if(!RCH_SITE_RELEASED_FEATURES.has(feature))
    return {allowed:false,reason:'not_released'};
  return {allowed:true};
}

/** Pure preflight, NOT a concurrency-safe reservation. Call a DB transaction to claim usage. */
export function evaluateRchSiteQuota(
  context:RchSiteEntitlementContext,key:unknown,used:unknown,requested:unknown=1,
):RchSiteGate&{limit?:number;remaining?:number}{
  if(!isRchSiteQuota(key))return {allowed:false,reason:'unknown_quota'};
  const gate=evaluateRchSiteFeature(context,RCH_SITE_QUOTA_FEATURE[key]);
  if(!gate.allowed)return gate;
  if(typeof used!=='number'||!Number.isSafeInteger(used)||used<0
    ||typeof requested!=='number'||!Number.isSafeInteger(requested)||requested<=0)
    return {allowed:false,reason:'invalid_usage'};
  const limit=RCH_SITE_PLANS[context.tier as RchSitePlanTier].limits[key];
  const remaining=Math.max(0,limit-used);
  if(requested>remaining)return {allowed:false,reason:'quota_exceeded',limit,remaining};
  return {allowed:true,limit,remaining:remaining-requested};
}
