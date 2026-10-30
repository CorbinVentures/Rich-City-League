import { isRclProSeasonRecord } from './rcl-pro-season';

/** Planning targets, NOT signed competition terms or automatically admitted clubs. */
export const RCL_PILOT_OPERATIONS = {
  status: 'recommended',
  clubs: 6,
  regularSeasonGamesPerClub: 10,
  regularSeasonGamesTotal: 30,
  playoffClubs: 4,
  draftRounds: 4,
  proposedActiveRosterMaximum: 12,
} as const;

export type RclOperationsSnapshot = {
  season: { id: string; start_date: string; status: string } | null;
  /** Club records linked to this season, not proof of signed franchise admission. */
  assignedClubs: Array<{ team_id: string; team_season_id: string; active: boolean }>;
  activeRosters: Array<{ player_id: string; team_season_id: string }>;
  scheduledGames: Array<{ home_team_id: string; away_team_id: string }>;
  eligibleDraftProspects: number;
  draft: { status: string; rounds: number; roster_limit: number } | null;
  /** Authoritative existing DB draft order/eligibility preflight result. Null = not verified. */
  draftPreflightBlockers: string[] | null;
};

export type OperationsCheck = { id: string; label: string; passed: boolean; detail: string };

/** Read-only preflight for the proposed inaugural format. NEVER authorizes opening night. */
export function inspectRclPilotReadiness(snapshot: RclOperationsSnapshot): {
  checks: OperationsCheck[];
  clearTechnicalPreflight: boolean;
  requiredManualApprovals: string[];
  duplicatePlayerIds: string[];
} {
  const seasonIsOfficialWindow = Boolean(snapshot.season && isRclProSeasonRecord(snapshot.season));
  const eligibleClubs = snapshot.assignedClubs.filter(item => item.active);
  const teamSeasonIds = new Set(eligibleClubs.map(item => item.team_season_id));
  const teamIds = new Set(eligibleClubs.map(item => item.team_id));
  const validRosters = snapshot.activeRosters.filter(item => teamSeasonIds.has(item.team_season_id));
  const rosterClubs = new Map<string, Set<string>>();
  const counts = new Map<string, number>();
  for (const row of validRosters) {
    const teams = rosterClubs.get(row.player_id) ?? new Set<string>();
    teams.add(row.team_season_id);
    rosterClubs.set(row.player_id, teams);
    counts.set(row.team_season_id, (counts.get(row.team_season_id) ?? 0) + 1);
  }
  const duplicatePlayerIds = [...rosterClubs.entries()].filter(([,ids]) => ids.size > 1).map(([id]) => id);
  const maxRoster = RCL_PILOT_OPERATIONS.proposedActiveRosterMaximum;
  const overCapacity = [...counts.values()].some(count => count > maxRoster);
  const validGames = snapshot.scheduledGames.filter(game =>
    game.home_team_id !== game.away_team_id &&
    teamIds.has(game.home_team_id) && teamIds.has(game.away_team_id));
  const opponents = new Map<string, number>();
  const pairCount = new Map<string, number>();
  const directedCount = new Map<string, number>();
  for (const game of validGames) {
    opponents.set(game.home_team_id,(opponents.get(game.home_team_id) ?? 0) + 1);
    opponents.set(game.away_team_id,(opponents.get(game.away_team_id) ?? 0) + 1);
    const pair = [game.home_team_id, game.away_team_id].sort().join(':');
    pairCount.set(pair,(pairCount.get(pair) ?? 0) + 1);
    const direction = [game.home_team_id,game.away_team_id].join(':');
    directedCount.set(direction,(directedCount.get(direction) ?? 0) + 1);
  }
  const scheduleFitsFormat = eligibleClubs.length === RCL_PILOT_OPERATIONS.clubs &&
    validGames.length === RCL_PILOT_OPERATIONS.regularSeasonGamesTotal &&
    eligibleClubs.every(club => opponents.get(club.team_id) === RCL_PILOT_OPERATIONS.regularSeasonGamesPerClub) &&
    pairCount.size === 15 && [...pairCount.values()].every(count => count === 2) &&
    directedCount.size === 30 && [...directedCount.values()].every(count => count === 1) &&
    snapshot.scheduledGames.length === validGames.length;

  const plannedSelections = eligibleClubs.length * (snapshot.draft?.rounds ?? RCL_PILOT_OPERATIONS.draftRounds);
  const draftReady = Boolean(snapshot.draft && snapshot.draft.status === 'SETUP' &&
    snapshot.draft.rounds <= snapshot.draft.roster_limit &&
    snapshot.eligibleDraftProspects >= plannedSelections &&
    Array.isArray(snapshot.draftPreflightBlockers) && snapshot.draftPreflightBlockers.length === 0);

  const checks: OperationsCheck[] = [
    {id:'season',label:'2027–28 official season record',passed:seasonIsOfficialWindow,
      detail:seasonIsOfficialWindow ? 'Season linked to the November 2027-or-later window' : 'No qualifying official season record'},
    {id:'season-status',label:'Prelaunch season remains controlled',passed:Boolean(snapshot.season && snapshot.season.status === 'draft'),
      detail:'Keep the season in draft until commissioner approvals and a confirmed schedule'},
    {id:'clubs',label:'Six-team pilot allocation',passed:eligibleClubs.length === RCL_PILOT_OPERATIONS.clubs && teamIds.size === eligibleClubs.length,
      detail:`${eligibleClubs.length} active team-season assignments; these are NOT signed franchise approvals`},
    {id:'roster-integrity',label:'Single-team active rosters',passed:seasonIsOfficialWindow && eligibleClubs.length > 0 && duplicatePlayerIds.length === 0 && !overCapacity,
      detail:duplicatePlayerIds.length ? `${duplicatePlayerIds.length} players assigned to multiple clubs` :
        overCapacity ? 'At least one club exceeds the proposed 12-player cap' : 'No observed multi-club conflicts or cap violations'},
    {id:'schedule',label:'Double round-robin schedule',passed:scheduleFitsFormat,
      detail:`${validGames.length}/${RCL_PILOT_OPERATIONS.regularSeasonGamesTotal} valid regular-season games across assigned clubs`},
    {id:'draft',label:'Draft pool and roster coverage',passed:draftReady,
      detail:snapshot.draft ? `${snapshot.eligibleDraftProspects} nominally eligible prospects for ${plannedSelections} proposed selections; ${snapshot.draftPreflightBlockers === null ? 'official preflight not verified' : `${snapshot.draftPreflightBlockers.length} authoritative draft preflight blockers`}` : 'No official SETUP draft for this season'},
  ];

  return {
    checks,
    clearTechnicalPreflight:checks.every(check => check.passed),
    requiredManualApprovals: [
      'Signed rulebook, exact season dates, selected game rules and published tiebreakers',
      'Written club admission and operator/facility agreements, travel and season budgets',
      'Approved player eligibility, compensation/contract policy and insurance',
      'Qualified referees, medical plan, venue inspection and Scorebook rehearsal',
      'Commissioner-approved team count, roster rights and full draft transaction procedures',
      'Approved free-entry Fantasy selection format, scoring corrections and competition policy',
    ],
    duplicatePlayerIds,
  };
}
