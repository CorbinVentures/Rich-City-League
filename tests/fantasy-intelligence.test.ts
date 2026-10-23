import { describe, expect, it } from 'vitest';
import { buildFantasyForecasts, type FantasyGameStat } from '../src/components/fantasy/FantasyIntelligencePanel';

const rules = { points: 1, rebounds: 1.2, assists: 1.5, steals: 3, blocks: 3, turnovers: -1 };
const game = (player_id: string, game_id: string, points: number): FantasyGameStat => ({
  player_id, game_id, points, rebounds: 0, assists: 0,
  steals: 0, blocks: 0, turnovers: 0,
});

describe('RCH Fantasy Front Office forecasts', () => {
  it('does not invent numbers before official games are complete', () => {
    expect(buildFantasyForecasts([], rules).size).toBe(0);
  });

  it('shrinks one-game outliers toward the league-wide historical baseline', () => {
    const forecasts = buildFantasyForecasts([
      game('a','1',60),game('b','2',10),game('b','3',10),game('b','4',10),
    ], rules);
    const outlier = forecasts.get('a');
    expect(outlier?.games).toBe(1);
    expect(outlier?.confidence).toBe('early');
    expect(outlier?.estimate).toBeLessThan(60);
    expect(outlier?.estimate).toBeGreaterThan(10);
    expect(outlier?.low).toBeGreaterThanOrEqual(0);
    expect(outlier?.high).toBeGreaterThan(outlier?.estimate ?? 0);
  });

  it('deduplicates repeated stat rows for the same athlete and game', () => {
    const forecasts = buildFantasyForecasts([
      game('a','game1',20),game('a','game1',20),game('a','game2',30),
    ], rules);
    expect(forecasts.get('a')?.games).toBe(2);
  });

  it('labels stronger sample support only after eight official games', () => {
    const forecasts = buildFantasyForecasts(
      Array.from({length:8},(_,i)=>game('a','g'+i,12+i)), rules
    );
    expect(forecasts.get('a')?.confidence).toBe('established');
  });
});
