import { describe, expect, it } from 'vitest';
import { buildRunLeaderboardDisplay, runPlayerInitials, type RunLeaderboardEntry } from '../src/lib/run-leaderboard-preview';

const real = (id: string): RunLeaderboardEntry => ({
  profile_id: id, player_name: 'Verified ' + id, avatar_url: null, city: 'Richmond',
  games: 1, ppg: 7, apg: 2, rpg: 4, wins: 1, rep: 50, player_level: 2,
});

describe('Open Runs sample leaderboard', () => {
  it('shows ten clearly identified sample players before the first verified score', () => {
    const rows = buildRunLeaderboardDisplay([], 'state', 'Richmond');
    expect(rows).toHaveLength(10);
    expect(rows.every((row) => row.isDemo)).toBe(true);
    expect(rows.map((row) => row.profile_id)).toEqual(
      [...new Set(rows.map((row) => row.profile_id))]
    );
    expect(rows[0].player_name).toBe('Jalen Cross');
    expect(rows.some((row) => row.city === 'Norfolk')).toBe(true);
  });

  it('moves the demo players down as verified players join, without overriding verified order', () => {
    const rows = buildRunLeaderboardDisplay([real('verified-2'), real('verified-1')], 'state', 'Richmond');
    expect(rows).toHaveLength(10);
    expect(rows.slice(0, 2).map((row) => row.profile_id)).toEqual(['verified-2', 'verified-1']);
    expect(rows.slice(0, 2).every((row) => !row.isDemo)).toBe(true);
    expect(rows.slice(2).every((row) => row.isDemo)).toBe(true);
    expect(rows[2].player_name).toBe('Jalen Cross');
  });

  it('removes sample rows when ten or more real athletes qualify', () => {
    const nine = Array.from({ length: 9 }, (_, i) => real(String(i)));
    expect(buildRunLeaderboardDisplay(nine, 'state', 'Richmond').filter((r) => r.isDemo)).toHaveLength(1);
    const ten = [...nine, real('10')];
    expect(buildRunLeaderboardDisplay(ten, 'state', 'Richmond').filter((r) => r.isDemo)).toHaveLength(0);
    expect(buildRunLeaderboardDisplay([...ten, real('11')], 'state', 'Richmond')).toHaveLength(11);
  });

  it('uses the chosen city for city previews without changing the statewide examples', () => {
    const local = buildRunLeaderboardDisplay([], 'city', '  Hampton  ');
    expect(local.every((row) => row.city === 'Hampton')).toBe(true);
    expect(buildRunLeaderboardDisplay([], 'state', 'Hampton')[0].city).toBe('Richmond');
  });

  it('never changes the verified rows passed from the database', () => {
    const verified = Object.freeze(real('original'));
    const rows = buildRunLeaderboardDisplay([verified], 'city', 'Richmond');
    expect(verified).not.toHaveProperty('isDemo');
    expect(rows[0]).toMatchObject({ profile_id: 'original', isDemo: false, rep: 50 });
  });
  it('uses the fictional named players and preserves sample-only identities', () => {
    const names = buildRunLeaderboardDisplay([], 'state', 'Richmond').map((row) => row.player_name);
    expect(names.slice(0, 6)).toEqual([
      'Jalen Cross', 'Malik Rivers', 'Tre Carter',
      'Devon Price', 'Zion Hart', 'Kobe Ellis',
    ]);
    expect(names.every((name) => !name.startsWith('Sample '))).toBe(true);
  });

  it('creates first/last initials that stay legible inside compact avatar circles', () => {
    expect(runPlayerInitials('Jalen Cross')).toBe('JC');
    expect(runPlayerInitials('Malik Rivers')).toBe('MR');
    expect(runPlayerInitials('  Tre   Carter ')).toBe('TC');
    expect(runPlayerInitials('Player')).toBe('PL');
    expect(runPlayerInitials('  ')).toBe('RH');
  });

});
