/**
 * Commercial discovery only. These are pilot starting estimates, not checkout
 * products, confirmed inventory, or guarantees of impressions or revenue.
 */
export const RCH_MEDIA_OFFERS = [
  {
    code: 'event-production',
    name: 'Game & Event Coverage',
    label: 'Starting at $850 / event',
    type: 'production',
    description: 'Single-event filming with an agreed replay and highlight deliverable.',
    includes: ['Pre-production scope call', 'One-event filming plan', 'Edited delivery agreed in writing'],
  },
  {
    code: 'community-partner',
    name: 'Community Media Partner',
    label: 'Starting at $350 / month',
    type: 'sponsorship',
    description: 'A pilot local brand association with qualified RCH media programming.',
    includes: ['Sponsored identification', 'Approved placements', 'Campaign reporting when available'],
  },
  {
    code: 'game-presenting',
    name: 'Game Night Presenting Partner',
    label: 'Starting at $750 / event',
    type: 'sponsorship',
    description: 'Support a rights-cleared basketball broadcast and its recap.',
    includes: ['Disclosed presenting placement', 'Approved game-recap integration', 'Defined content deliverables'],
  },
  {
    code: 'original-underwriting',
    name: 'Original Series Underwriting',
    label: 'Starting at $1,500 / month',
    type: 'sponsorship',
    description: 'Support a recurring basketball story or show once the slate is confirmed.',
    includes: ['Series proposal review', 'Brand safety and editorial terms', 'Written production deliverables'],
  },
] as const;

export type RchMediaOfferCode = (typeof RCH_MEDIA_OFFERS)[number]['code'];
export function getRchMediaOffer(code: string) {
  return RCH_MEDIA_OFFERS.find(offer => offer.code === code) ?? null;
}
