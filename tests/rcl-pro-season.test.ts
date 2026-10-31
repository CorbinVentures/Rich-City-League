import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RCL_PRO_SEASON, isRclProSeasonRecord, isRclProSeasonWindow } from '../src/lib/rcl-pro-season';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('RCL professional season — November 2027', () => {
  it('stores only a public month, not a fabricated opening-night day', () => {
    expect(RCL_PRO_SEASON.startMonth).toBe('2027-11');
    expect(RCL_PRO_SEASON.startLabel).toBe('November 2027');
    expect(RCL_PRO_SEASON.status).toBe('planned');
    expect(isRclProSeasonWindow('2027-10-31')).toBe(false);
    expect(isRclProSeasonWindow('2026-12-19')).toBe(false);
    expect(isRclProSeasonWindow('2027-11-01')).toBe(true);
    expect(isRclProSeasonWindow('2027-11-24')).toBe(true);
    expect(isRclProSeasonWindow('invalid')).toBe(false);
    expect(isRclProSeasonRecord(null)).toBe(false);
    expect(isRclProSeasonRecord({start_date:'2027-11-24'})).toBe(true);
  });
  it('does not show archived 2026 league data as the active pro-season preview', () => {
    expect(source('src/components/LeaguePublicHub.tsx')).toContain("gte('start_date',RCL_PRO_SEASON.startMonth+'-01')");
    expect(source('src/components/LeagueJoinRegistration.tsx')).toContain("gte('start_date',RCL_PRO_SEASON.startMonth+'-01')");
    expect(source('src/app/page.tsx')).toContain('seasons.filter(isRclProSeasonRecord)');
    expect(source('src/app/seasons/page.tsx')).toContain('Historical record');
    expect(source('src/app/admin/operations/page.tsx')).toContain('isRclProSeasonWindow');
  });
  it('keeps opening night planned and labels editorial and automated content accurately', () => {
    expect(source('src/components/LeagueVision.tsx')).toContain('RCL_PRO_SEASON.startLabel');
    expect(source('src/app/league/join/page.tsx')).toContain('summer 2027');
    expect(source('src/lib/newsroom.ts')).toContain('Official professional-season context');
    expect(source('src/app/api/cron/official/daily/route.ts')).toContain('proSeasonIds');
  });
});
