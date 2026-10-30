import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RCL_RULEBOOK_DRAFT, canActivateRclFantasySeason, draftRosterCoverage } from '../src/lib/rcl-governance';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('RCL 2027–28 governance guards', () => {
  it('does not represent an unsigned rulebook as binding', () => {
    expect(RCL_RULEBOOK_DRAFT.status).toBe('proposed');
    expect(RCL_RULEBOOK_DRAFT.fantasyPaidEntryAllowed).toBe(false);
    const rulebook = source(RCL_RULEBOOK_DRAFT.documentPath);
    expect(rulebook).toContain('PROPOSED / NOT IN FORCE');
    expect(rulebook).toContain('Commissioner signature: **PENDING**');
    expect(rulebook).toContain('No official Draft Night opening unless');
    expect(source('src/app/league/rules/page.tsx')).toContain('Working draft — not yet in force');
  });

  it('prevents imported historical or inactive seasons from appearing as live professional fantasy', () => {
    expect(canActivateRclFantasySeason(null)).toBe(false);
    expect(canActivateRclFantasySeason({ start_date: '2026-12-01', status: 'active' })).toBe(false);
    expect(canActivateRclFantasySeason({ start_date: '2027-10-31', status: 'active' })).toBe(false);
    expect(canActivateRclFantasySeason({ start_date: '2027-11-15', status: 'draft' })).toBe(false);
    expect(canActivateRclFantasySeason({ start_date: '2027-11-15', status: 'active' })).toBe(true);
    expect(source('src/app/fantasy/page.tsx')).toContain('canActivateRclFantasySeason');
    expect(source('src/components/FantasyLeagueNavigator.tsx')).toContain('canActivateRclFantasySeason');
    expect(source('src/app/fantasy/leagues/[id]/page.tsx')).toContain('canActivateRclFantasySeason');
  });

  it('shows the acquisition shortfall without silently increasing draft rounds or binding roster size', () => {
    expect(draftRosterCoverage(12, 4, 12)).toEqual({
      draftPicks: 48,
      rosterPlaces: 144,
      remainingPlaces: 96,
      exceedsRosterCapacity: false,
    });
    expect(draftRosterCoverage(6, 4, 12)?.remainingPlaces).toBe(48);
    expect(draftRosterCoverage(6, 15, 12)?.exceedsRosterCapacity).toBe(true);
    expect(draftRosterCoverage(0, 4, 12)).toBeNull();
    expect(source('src/app/draft/page.tsx')).toContain('draftRosterCoverage');
    expect(source('src/app/draft/page.tsx')).toContain('Club admission and official eligibility remain subject to approval');
  });

  it('provides discoverable draft and fantasy rule status from league entry points', () => {
    expect(source('src/app/league/join/page.tsx')).toContain('href="/league/rules"');
    expect(source('src/app/fantasy/page.tsx')).toContain('RCL Fantasy is free to enter');
    expect(source('src/app/draft/page.tsx')).toContain('Proposed League Rules');
  });
});
