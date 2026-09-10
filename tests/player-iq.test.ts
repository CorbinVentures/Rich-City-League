import { describe, expect, it } from 'vitest';
import {
  calculateCourtPerformance,
  calculatePlayerIQ,
  calculatePopularity,
  calculateTeammateGrade,
  determineArchetype,
} from '../src/lib/player-iq';

const game = { points: 18, rebounds: 7, assists: 6, steals: 2, blocks: 1, turnovers: 2, field_goals_made: 7, field_goals_attempted: 14 };

describe('RCL Player IQ', () => {
  it('handles missing statistics without inventing values', () => {
    expect(calculateCourtPerformance([])).toBe(0);
    expect(calculatePlayerIQ({ stats: [{}] }).gamesEvaluated).toBe(1);
  });

  it('weights basketball impact above popularity', () => {
    const basketball = calculatePlayerIQ({ stats: Array.from({ length: 8 }, () => game), popularity: { followers: 1, views: 1, engagement: 1 } });
    const popular = calculatePlayerIQ({ stats: [{}], popularity: { followers: 1_000_000, views: 1_000_000, engagement: 1_000_000 } });
    expect(basketball.rclRating).toBeGreaterThan(popular.rclRating);
    expect(popular.rclRating).toBeLessThanOrEqual(10);
  });

  it('normalizes teammate grades from a five-point scale', () => {
    expect(calculateTeammateGrade([{
      communication: 5, unselfishness: 5, effort: 5, leadership: 5,
      defense: 5, team_chemistry: 5, coachability: 5,
    }])).toBe(100);
  });

  it('selects archetypes from available stats', () => {
    expect(determineArchetype(Array.from({ length: 5 }, () => game))).toBe('Two-Way Floor General');
  });

  it('clamps popularity and ignores negative engagement', () => {
    expect(calculatePopularity({ followers: -10, views: -2, engagement: -4 })).toBe(0);
    expect(calculatePopularity({ followers: 1e30, views: 1e30, engagement: 1e30 })).toBe(100);
  });
});
