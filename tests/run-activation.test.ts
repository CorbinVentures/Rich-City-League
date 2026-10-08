import { describe, expect, it } from 'vitest';
import { runInviteUrl, validateRunStart } from '../src/lib/run-activation';

describe('run activation', () => {
  it('rejects missing or past start times', () => {
    expect(validateRunStart('', '19:00')).toMatch(/date/);
    expect(validateRunStart('not-a-date', '19:00')).toMatch(/valid/);
    expect(validateRunStart('2027-02-15', '18:00', Date.parse('2027-02-16T00:00:00Z'))).toMatch(/future/);
  });
  it('accepts a future start time', () => {
    expect(validateRunStart('2027-02-15', '18:00', Date.parse('2027-02-14T00:00:00Z'))).toBeNull();
  });
  it('creates a canonical, shareable run link', () => {
    expect(runInviteUrl('https://richcityhoops.com', 'abc-123')).toBe('https://richcityhoops.com/runs/abc-123');
    expect(runInviteUrl('https://richcityhoops.com', 'id with space')).toContain('/runs/id%20with%20space');
  });
});
