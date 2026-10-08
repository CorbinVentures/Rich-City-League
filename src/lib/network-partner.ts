export type NetworkPartnerPlanCode = 'network' | 'amplify' | 'premier';
export type PaidNetworkPartnerPlanCode = Exclude<NetworkPartnerPlanCode, 'network'>;
export type NetworkCreditType = 'event-spotlight' | 'regional-feature' | 'statewide-feature' | 'social-feed' | 'media-feature';

export const NETWORK_PARTNER_PLANS = {
  network: {
    code: 'network' as const,
    name: 'Community Partner',
    monthlyPriceCents: 0,
    description: 'Free organization presence and organic discovery across the RCH Network.',
  },
  amplify: {
    code: 'amplify' as const,
    name: 'Amplify',
    monthlyPriceCents: 4900,
    description: 'Enhanced discovery, recurring promotion credits and full RCH Reach reporting.',
  },
  premier: {
    code: 'premier' as const,
    name: 'Partner Pro',
    monthlyPriceCents: 14900,
    description: 'Recurring priority inventory, deeper reporting, cross-channel distribution and priority media consideration.',
  },
} satisfies Record<NetworkPartnerPlanCode, { code: NetworkPartnerPlanCode; name: string; monthlyPriceCents: number; description: string }>;

export const NETWORK_CREDIT_LABELS: Record<NetworkCreditType, string> = {
  'event-spotlight': 'Event Spotlight',
  'regional-feature': 'Regional Feature',
  'statewide-feature': 'Statewide Feature',
  'social-feed': 'Social Feed',
  'media-feature': 'RCH TV / Media Feature',
};

export function isPaidNetworkPartnerPlanCode(value: unknown): value is PaidNetworkPartnerPlanCode {
  return value === 'amplify' || value === 'premier';
}

export function isNetworkCreditType(value: unknown): value is NetworkCreditType {
  return value === 'event-spotlight' || value === 'regional-feature' || value === 'statewide-feature' || value === 'social-feed' || value === 'media-feature';
}

export function formatNetworkPartnerPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}
