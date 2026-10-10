import { describe, expect, it } from 'vitest';
import {
  badgeCrest,
  normalizeBadgeTier,
} from '../src/components/BadgeMedallion';
import { FaBasketball, FaCrown, FaFireFlameCurved, FaLocationDot, FaShieldHalved, FaTrophy } from 'react-icons/fa6';

describe('collectible badge visuals', () => {
  it('supports all collectible tiers and safely defaults unrecognized levels', () => {
    for (const tier of ['bronze', 'silver', 'gold', 'elite', 'platinum', 'diamond']) {
      expect(normalizeBadgeTier(tier)).toBe(tier);
    }
    expect(normalizeBadgeTier(' GOLD ')).toBe('gold');
    expect(normalizeBadgeTier('legendary')).toBe('bronze');
    expect(normalizeBadgeTier(null)).toBe('bronze');
  });

  it('selects distinct trophy crests based on achievement details', () => {
    expect(badgeCrest({ name: 'League MVP' })).toBe(FaCrown);
    expect(badgeCrest({ name: 'Seven Game Streak' })).toBe(FaFireFlameCurved);
    expect(badgeCrest({ name: 'Lockdown Defender' })).toBe(FaShieldHalved);
    expect(badgeCrest({ name: 'Richmond Court Explorer' })).toBe(FaLocationDot);
    expect(badgeCrest({ name: 'Basketball Scoring Machine' })).toBe(FaBasketball);
  });

  it('provides a recognizable fallback for unknown and unconfigured badges', () => {
    expect(badgeCrest({})).toBe(FaTrophy);
    expect(badgeCrest({ name: 'Unknown Achievement' })).toBe(FaTrophy);
  });
});
