import { describe, expect, it } from 'vitest';
import { buildWeeklyRunStarts, runInviteUrl, validateRunStart } from '../src/lib/run-activation';

describe('run activation', () => {
  it('rejects missing or past start times', () => {
    expect(validateRunStart('', '19:00')).toMatch(/date/);
    expect(validateRunStart('not-a-date', '19:00')).toMatch(/valid/);
    expect(validateRunStart('2027-02-15', '18:00', Date.parse('2027-02-16T00:00:00Z'))).toMatch(/future/);
  });
  it('accepts a future start time', () => {
    expect(validateRunStart('2027-02-15', '18:00', Date.parse('2027-02-14T00:00:00Z'))).toBeNull();
  });
  it('schedules four independent runs seven calendar days apart', () => {
    const dates = buildWeeklyRunStarts('2027-02-15','18:00',4,Date.parse('2027-02-14T00:00:00Z'));
    expect(dates).toHaveLength(4);
    expect(dates.map(date => new Date(date).getUTCDay())).toEqual([1,1,1,1]);
    expect(dates[0]).not.toEqual(dates[3]);
  });
  it('supports one-time runs and rejects invalid recurrence', () => {
    expect(buildWeeklyRunStarts('2027-02-15','18:00',1,Date.parse('2027-02-14T00:00:00Z'))).toHaveLength(1);
    expect(() => buildWeeklyRunStarts('2027-02-15','18:00',8 as 1|4,Date.parse('2027-02-14T00:00:00Z'))).toThrow();
  });
  it('makes a canonical, shareable run link', () => {
    expect(runInviteUrl('https://richcityhoops.com', 'abc-123')).toBe('https://richcityhoops.com/runs/abc-123');
    expect(runInviteUrl('https://richcityhoops.com', 'id with space')).toContain('/runs/id%20with%20space');
  });
});
