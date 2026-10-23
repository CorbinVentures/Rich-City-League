import { gravityApproxCityMiles } from '@/lib/rch-gravity-location';

/** Discover-first actions are real routes, never mock experiences or promises of availability. */
export const STARTER_ACTIONS = {
  play: {
    label: 'Play',
    title: 'Find your next run',
    description: 'Explore real courts, hosted runs and ways to get in the game.',
    href: '/runs',
    button: 'Explore Runs',
  },
  watch: {
    label: 'Watch',
    title: 'See the basketball culture',
    description: 'Check out highlights, original stories and RCH TV.',
    href: '/media',
    button: 'Watch RCH TV',
  },
  connect: {
    label: 'Connect',
    title: 'Find your basketball people',
    description: 'Discover players, conversations and crews across Virginia.',
    href: '/pulse',
    button: 'Explore the Community',
  },
} as const;

export type StarterIntent = keyof typeof STARTER_ACTIONS;
export type StarterOpportunity = {
  id: string;
  href: string;
  title: string;
  location: string;
  type: string;
  starts_at: string;
};

export function isStarterIntent(value: unknown): value is StarterIntent {
  return value === 'play' || value === 'watch' || value === 'connect';
}

export function starterDestination(intent: StarterIntent, mode: 'web' | 'pwa'): string {
  return mode === 'pwa' && intent === 'connect' ? '/social' : STARTER_ACTIONS[intent].href;
}

/** Only show actual supplied opportunities, never inferred crowds or invented activity. */
export function starterPreview(opportunities: StarterOpportunity[], cityId: string | null): StarterOpportunity[] {
  return opportunities.filter(item => {
    if (!cityId) return true;
    const distance = gravityApproxCityMiles(cityId, item.location);
    return distance !== null && distance <= 50;
  }).slice(0, 2);
}
