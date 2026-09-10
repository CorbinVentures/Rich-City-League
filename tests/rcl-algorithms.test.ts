import { describe, expect, it } from 'vitest';
import { calculateFanWinFactor, calculateFantasyPoints, calculatePlayerIndex, calculateWinFactor } from '../src/lib/rcl-algorithms';

describe('RCL algorithm services', () => {
  it('returns an explainable player index only when data exists', () => {
    expect(calculatePlayerIndex({ games: 0 }).score).toBeNull();
    const result = calculatePlayerIndex({ games: 5, scoring: [80], defense: [70] });
    expect(result.score).toBe(75);
    expect(result.components).toHaveLength(9);
  });

  it('weights player win factor by available evidence', () => {
    const result = calculateWinFactor({ wins: 3, games: 5, impact: [80], efficiency: [70], defense: [], playmaking: [], consistency: [] });
    expect(result.score).toBe(69.23);
  });

  it('does not create a fan score without participation', () => {
    expect(calculateFanWinFactor({ posts: 0, comments: 0, reactions: 0, predictions: 0, predictionAccuracy: 0, communityActions: 0, gamesAttended: 0 }).score).toBeNull();
  });

  it('keeps fantasy scoring separate and transparent', () => {
    expect(calculateFantasyPoints({ points: 20, rebounds: 10, assists: 5, steals: 2, blocks: 1, turnovers: 3 })).toBe(45.5);
  });

  it('clamps win factor component data to the score range', () => {
    const result = calculateWinFactor({
      wins: 10,
      games: 10,
      impact: [150],
      efficiency: [-20],
      defense: [200],
      playmaking: [-10],
      consistency: [120],
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('does not return negative fantasy points', () => {
    expect(calculateFantasyPoints({ points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 20 })).toBe(0);
  });
});
