export type MembershipPlanCode = 'free' | 'rcl_plus' | 'all_access';
export type MembershipBillingInterval = 'monthly' | 'annual';

export type MembershipEntitlements = {
  my_hoops: boolean;
  personalized_opportunities: boolean;
  calendar_export: boolean;
  profile_analytics: boolean;
  passport_studio: boolean;
  advanced_exposure: boolean;
  monthly_spotlight: boolean;
  priority_access: boolean;
  rcl_pass: boolean;
};

export type MembershipPlanDefinition = {
  code: MembershipPlanCode;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  highlighted?: boolean;
  benefits: string[];
  entitlements: MembershipEntitlements;
};

const FREE_ENTITLEMENTS: MembershipEntitlements = {
  my_hoops: false,
  personalized_opportunities: false,
  calendar_export: false,
  profile_analytics: false,
  passport_studio: false,
  advanced_exposure: false,
  monthly_spotlight: false,
  priority_access: false,
  rcl_pass: false,
};

export const MEMBERSHIP_PLANS: Record<MembershipPlanCode, MembershipPlanDefinition> = {
  free: {
    code: 'free',
    name: 'RCL Community',
    shortName: 'Community',
    tagline: 'Be part of Virginia basketball.',
    description: 'The complete RCL social and basketball community experience. REP, competitive rankings and earned achievements remain available without a paid membership.',
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    benefits: [
      'RCL social network, profiles, REP and earned badges',
      'Virginia organization and event discovery',
      'Open Runs, league information and public basketball content',
      'Basic Basketball Passport and public player identity',
    ],
    entitlements: FREE_ENTITLEMENTS,
  },
  rcl_plus: {
    code: 'rcl_plus',
    name: 'RCL+',
    shortName: 'RCL+',
    tagline: 'Your basketball world, organized.',
    description: 'A personal basketball command center for the people, events and opportunities you care about across the RCL Network.',
    monthlyPriceCents: 599,
    annualPriceCents: 5999,
    highlighted: true,
    benefits: [
      'My Hoops personalized basketball dashboard',
      'Saved organizations, events, runs, games and players',
      'Personalized Virginia basketball opportunities',
      'Unified basketball calendar and calendar export',
      'Profile and Passport exposure analytics',
      'Passport Studio career and share tools',
    ],
    entitlements: {
      ...FREE_ENTITLEMENTS,
      my_hoops: true,
      personalized_opportunities: true,
      calendar_export: true,
      profile_analytics: true,
      passport_studio: true,
    },
  },
  all_access: {
    code: 'all_access',
    name: 'RCL All Access',
    shortName: 'All Access',
    tagline: 'Get the most out of the RCL network.',
    description: 'RCL+ plus premium exposure intelligence, one monthly Spotlight request and priority benefits for RCL-owned basketball experiences.',
    monthlyPriceCents: 1199,
    annualPriceCents: 11999,
    benefits: [
      'Everything included with RCL+',
      'Advanced exposure intelligence and performance trends',
      'One RCL Spotlight request each calendar month',
      'Priority windows for eligible RCL-owned experiences',
      'RCL Pass member benefits and partner offers as available',
      'Early access to selected RCL features and experiences',
    ],
    entitlements: {
      ...FREE_ENTITLEMENTS,
      my_hoops: true,
      personalized_opportunities: true,
      calendar_export: true,
      profile_analytics: true,
      passport_studio: true,
      advanced_exposure: true,
      monthly_spotlight: true,
      priority_access: true,
      rcl_pass: true,
    },
  },
};

export const PAID_MEMBERSHIP_PLAN_CODES: Exclude<MembershipPlanCode, 'free'>[] = ['rcl_plus', 'all_access'];

export function isMembershipPlanCode(value: unknown): value is MembershipPlanCode {
  return value === 'free' || value === 'rcl_plus' || value === 'all_access';
}

export function isPaidMembershipPlanCode(value: unknown): value is Exclude<MembershipPlanCode, 'free'> {
  return value === 'rcl_plus' || value === 'all_access';
}

export function isMembershipBillingInterval(value: unknown): value is MembershipBillingInterval {
  return value === 'monthly' || value === 'annual';
}

export function membershipPrice(planCode: MembershipPlanCode, interval: MembershipBillingInterval) {
  const plan = MEMBERSHIP_PLANS[planCode];
  return interval === 'annual' ? plan.annualPriceCents : plan.monthlyPriceCents;
}

export function formatMembershipPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function membershipPlanRank(code: MembershipPlanCode) {
  if (code === 'all_access') return 2;
  if (code === 'rcl_plus') return 1;
  return 0;
}

export function hasMembershipEntitlement(planCode: MembershipPlanCode, key: keyof MembershipEntitlements) {
  return Boolean(MEMBERSHIP_PLANS[planCode]?.entitlements[key]);
}
