import { isRclProSeasonRecord } from './rcl-pro-season';

/** Proposed governance document, deliberately NOT an enforceable published competition rule. */
export const RCL_RULEBOOK_DRAFT = {
  version: '0.1',
  status: 'proposed',
  title: '2027–28 Competition Rulebook',
  officialSeason: 'November 2027 (planned; opening date TBD)',
  documentPath: 'docs/RCL_2027_28_COMPETITION_RULEBOOK_DRAFT.md',
  fantasyPaidEntryAllowed: false,
} as const;

type OfficialSeason = {
  start_date: string;
  status: string;
};

/** A fantasy league must NEVER treat active historical seasons as the new professional campaign. */
export function canActivateRclFantasySeason(season: OfficialSeason | null | undefined): boolean {
  return Boolean(season && isRclProSeasonRecord(season) && season.status === 'active');
}

/** Draft selections need not equal the maximum permitted season roster: expose the gap. */
export function draftRosterCoverage(teams: number, rounds: number, rosterLimit: number) {
  if (![teams, rounds, rosterLimit].every(Number.isInteger) || teams < 2 || rounds < 1 || rosterLimit < 1) return null;
  const draftPicks = teams * rounds;
  const rosterPlaces = teams * rosterLimit;
  return {
    draftPicks,
    rosterPlaces,
    remainingPlaces: Math.max(0, rosterPlaces - draftPicks),
    exceedsRosterCapacity: rounds > rosterLimit,
  };
}
