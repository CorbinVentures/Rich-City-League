import { describe, expect, it } from 'vitest';
import { formatDate, formatTime } from '../src/utils/helpers';
import { getUpcomingGames } from '../src/lib/game-schedule';

describe('Richmond schedule display', () => {
  it('shows winter and summer times in Eastern Time with an explicit zone', () => {
    expect(formatTime('2027-01-02T20:30:00Z')).toBe('3:30 PM EST');
    expect(formatTime('2027-07-02T20:30:00Z')).toBe('4:30 PM EDT');
  });
  it('keeps evening games on the Richmond calendar day across UTC midnight', () => {
    expect(formatDate('2027-01-03T00:30:00Z')).toBe('Jan 2, 2027');
  });
});

describe('next games', () => {
  it('excludes past, cancelled and completed games and sorts without mutating input', () => {
    const games = [
      { id: 'later', status: 'scheduled', scheduled_at: '2028-04-01T22:00:00Z' },
      { id: 'past', status: 'scheduled', scheduled_at: '2026-01-01T22:00:00Z' },
      { id: 'next', status: 'scheduled', scheduled_at: '2027-01-02T20:30:00Z' },
      { id: 'cancelled', status: 'cancelled', scheduled_at: '2026-12-01T22:00:00Z' },
      { id: 'final', status: 'completed', scheduled_at: '2026-12-01T22:00:00Z' },
    ];
    expect(getUpcomingGames(games, Date.parse('2026-10-07T21:00:00Z')).map(g => g.id)).toEqual(['next', 'later']);
    expect(games[0].id).toBe('later');
  });
});
