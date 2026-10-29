import { describe, expect, it } from 'vitest';
import { parsePreseasonDraftOrder, plannedDraftPicks } from '../src/lib/draft/preseason';

const config = {
  season_label: '2027–28',
  status: 'established',
  format: 'snake',
  rounds: 4,
  first_round_team_ids: ['team-a', 'team-b', 'team-c'],
  draw_seed: 'b387a5779d2ff6c8597606789b70f3e0',
  generated_at: '2026-10-29T17:41:00Z',
};

describe('published preseason draft order', () => {
  it('validates that all and only active franchises participate', () => {
    const order = parsePreseasonDraftOrder(config, ['team-c', 'team-b', 'team-a']);
    expect(order).not.toBeNull();
    expect(parsePreseasonDraftOrder(config, ['team-a', 'team-b'])).toBeNull();
    expect(parsePreseasonDraftOrder({ ...config, first_round_team_ids: ['team-a', 'team-a', 'team-c'] }, ['team-a', 'team-b', 'team-c'])).toBeNull();
    expect(parsePreseasonDraftOrder({ ...config, rounds: 21 }, ['team-a', 'team-b', 'team-c'])).toBeNull();
  });
  it('builds four rounds with one pick per team per round', () => {
    const order = parsePreseasonDraftOrder(config, ['team-a', 'team-b', 'team-c']);
    expect(order).not.toBeNull();
    const picks = plannedDraftPicks(order!);
    expect(picks).toHaveLength(12);
    expect(picks.filter(pick => pick.roundNumber === 1).map(pick => pick.teamId))
      .toEqual(['team-a', 'team-b', 'team-c']);
    expect(picks.filter(pick => pick.roundNumber === 2).map(pick => pick.teamId))
      .toEqual(['team-c', 'team-b', 'team-a']);
    expect(picks[11]).toEqual({ pickNumber: 12, roundNumber: 4, teamId: 'team-a' });
  });
});
