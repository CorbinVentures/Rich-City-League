import { describe, expect, it } from 'vitest';
import { rchTvPosterTime } from './rch-tv-thumbnail';
describe('RCH TV automatic thumbnail frame selection', () => {
  it('samples away from the opening frame', () => {
    expect(rchTvPosterTime(60)).toBeCloseTo(7.2);
    expect(rchTvPosterTime(3600)).toBe(8);
  });
  it('handles short and invalid durations', () => {
    expect(rchTvPosterTime(1)).toBeCloseTo(0.12);
    expect(rchTvPosterTime(0.05)).toBeCloseTo(0.045);
    expect(rchTvPosterTime(NaN)).toBe(0);
  });
});
