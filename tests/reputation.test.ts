import { describe, expect, it } from 'vitest';
import { reputationProgress, reputationStatus, xpForLevel } from '../src/lib/reputation';

describe('RCL Social reputation progression', () => {
  it('matches the database level thresholds', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(400);
    expect(xpForLevel(4)).toBe(900);
    expect(xpForLevel(5)).toBe(1600);
  });

  it('calculates progress inside the current level instead of REP modulo 1000', () => {
    expect(reputationProgress(250, 2)).toMatchObject({ start: 100, next: 400, remaining: 150, percent: 50 });
    expect(reputationProgress(650, 3)).toMatchObject({ start: 400, next: 900, remaining: 250, percent: 50 });
  });

  it('maps status independently from VIP membership', () => {
    expect(reputationStatus(1).key).toBe('rookie');
    expect(reputationStatus(3).key).toBe('established');
    expect(reputationStatus(6).key).toBe('recognized');
    expect(reputationStatus(10).key).toBe('influential');
    expect(reputationStatus(16).key).toBe('elite');
    expect(reputationStatus(25).key).toBe('icon');
  });
});
