import { describe, expect, it } from 'vitest';
import { classifySceneOpportunity, sceneGoalScore, sceneMatchesWhen } from './discover-scene';

describe('Discover / The Scene', () => {
  it('keeps general tryouts separate from AAU and professional tryouts', () => {
    expect(classifySceneOpportunity('event', 'tryout', 'Open Basketball Tryouts')).toBe('tryouts');
    expect(classifySceneOpportunity('event', 'tryout', 'AAU Girls Basketball Tryouts')).toBe('aau');
    expect(classifySceneOpportunity('event', 'tryout', 'Professional Basketball Tryouts')).toBe('pro');
  });
  it('distinguishes training from runs and tournaments', () => {
    expect(classifySceneOpportunity('run', 'training', 'Skills with Coach')).toBe('training');
    expect(classifySceneOpportunity('run', 'competitive', 'Friday Night Run')).toBe('runs');
    expect(classifySceneOpportunity('event', 'tournament', 'Summer Classic')).toBe('tournaments');
    expect(classifySceneOpportunity('event', 'clinic', 'Shooting Skills')).toBe('training');
  });
  it('does not include past opportunities and respects weekend filter', () => {
    const friday = new Date('2026-10-16T12:00:00');
    expect(sceneMatchesWhen('2026-10-15T12:00:00', 'any', friday)).toBe(false);
    expect(sceneMatchesWhen('2026-10-17T14:00:00', 'weekend', friday)).toBe(true);
    expect(sceneMatchesWhen('2026-10-19T14:00:00', 'weekend', friday)).toBe(false);
  });
  it('prioritizes relevant categories for each player goal', () => {
    expect(sceneGoalScore('training', 'improve')).toBeGreaterThan(sceneGoalScore('leagues', 'improve'));
    expect(sceneGoalScore('pro', 'noticed')).toBeGreaterThan(sceneGoalScore('runs', 'noticed'));
  });
});
