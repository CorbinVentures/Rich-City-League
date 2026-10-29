/** Canonical Rich City League professional-season launch window.
 * A month is public, but no exact opening-night date has been confirmed.
 * Do not confuse the independent RCH Runs / Commonwealth Cup cycles with the pro league.
 */
export const RCL_PRO_SEASON = {
  seasonLabel: '2027–28',
  startMonth: '2027-11',
  startLabel: 'November 2027',
  status: 'planned',
  tryoutLabel: 'Official tryouts planned for summer 2027',
  draftLabel: 'Official Draft Night follows tryouts; date to be announced',
} as const;

export function isRclProSeasonWindow(date: string | null | undefined): boolean {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date.slice(0, 7) >= RCL_PRO_SEASON.startMonth;
}

export function isRclProSeasonRecord(season: { start_date: string; status?: string } | null | undefined): boolean {
  return Boolean(season && isRclProSeasonWindow(season.start_date));
}
