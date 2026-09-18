import type { Game, GameEvent, GameLineup, PlayerGameStats } from '@/types/database';

export type AdvancedPlayerMetrics = PlayerGameStats & {
  fg_pct: number;
  three_pct: number;
  ft_pct: number;
  efg_pct: number;
  ts_pct: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  ast_to: number | null;
  true_shooting_attempts: number;
  estimated_possessions: number;
  usage_pct: number | null;
  efficiency: number;
};

export type GameSummary = {
  homeScore: number;
  awayScore: number;
  totalEvents: number;
  madeShots: number;
  missedShots: number;
  turnovers: number;
  fouls: number;
  rebounds: number;
  possessions: number;
};

const safePct = (made: number, attempts: number) => attempts > 0 ? made / attempts : 0;

export function zoneFromCoordinates(x: number, y: number): string {
  const distance = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 88, 2));
  if (distance <= 10) return 'rim';
  if (distance <= 22) return 'paint';
  if (distance <= 38) return 'midrange';
  if (y >= 72 && x < 20) return 'corner_3_left';
  if (y >= 72 && x > 80) return 'corner_3_right';
  if (distance >= 38) return 'above_break_3';
  return 'midrange';
}

export function derivePlayerMetrics(
  stat: PlayerGameStats,
  teamPossessions = 0,
  gamesPlayed = 1,
): AdvancedPlayerMetrics {
  const fgPct = safePct(stat.field_goals_made, stat.field_goals_attempted);
  const threePct = safePct(stat.three_pointers_made, stat.three_pointers_attempted);
  const ftPct = safePct(stat.free_throws_made, stat.free_throws_attempted);
  const tsa = stat.field_goals_attempted + 0.44 * stat.free_throws_attempted;
  const efg = stat.field_goals_attempted > 0
    ? (stat.field_goals_made + 0.5 * stat.three_pointers_made) / stat.field_goals_attempted
    : 0;
  const ts = tsa > 0 ? stat.points / (2 * tsa) : 0;
  const possessions = stat.field_goals_attempted + 0.44 * stat.free_throws_attempted - 0.5 * stat.rebounds + stat.turnovers;
  const usage = teamPossessions > 0 ? 100 * (stat.field_goals_attempted + 0.44 * stat.free_throws_attempted + stat.turnovers) / teamPossessions : null;
  const efficiency = stat.points + stat.rebounds + stat.assists + stat.steals + stat.blocks
    - (stat.field_goals_attempted - stat.field_goals_made)
    - (stat.free_throws_attempted - stat.free_throws_made)
    - stat.turnovers;

  return {
    ...stat,
    fg_pct: fgPct,
    three_pct: threePct,
    ft_pct: ftPct,
    efg_pct: efg,
    ts_pct: ts,
    ppg: stat.points / gamesPlayed,
    rpg: stat.rebounds / gamesPlayed,
    apg: stat.assists / gamesPlayed,
    spg: stat.steals / gamesPlayed,
    bpg: stat.blocks / gamesPlayed,
    topg: stat.turnovers / gamesPlayed,
    ast_to: stat.turnovers > 0 ? stat.assists / stat.turnovers : null,
    true_shooting_attempts: tsa,
    estimated_possessions: Math.max(0, possessions),
    usage_pct: usage,
    efficiency,
  };
}

export function summarizeGame(
  events: GameEvent[],
  homeTeamId: string,
  awayTeamId: string,
): GameSummary {
  const active = events.filter((event) => !event.voided_at);
  const points = (teamId: string) => active
    .filter((event) => event.team_id === teamId && ['shot_made', 'free_throw_made', 'score_adjustment'].includes(event.event_type))
    .reduce((sum, event) => sum + event.points, 0);

  const madeShots = active.filter((event) => event.event_type === 'shot_made').length;
  const missedShots = active.filter((event) => event.event_type === 'shot_missed').length;
  const turnovers = active.filter((event) => event.event_type === 'turnover').length;
  const fouls = active.filter((event) => event.event_type === 'foul').length;
  const rebounds = active.filter((event) => ['rebound_off', 'rebound_def'].includes(event.event_type)).length;
  const possessions = active.filter((event) => ['shot_made', 'shot_missed', 'turnover', 'free_throw_made', 'free_throw_missed'].includes(event.event_type)).length;

  return {
    homeScore: points(homeTeamId),
    awayScore: points(awayTeamId),
    totalEvents: active.length,
    madeShots,
    missedShots,
    turnovers,
    fouls,
    rebounds,
    possessions,
  };
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function describeEvent(event: GameEvent, playerName = 'Player', secondaryName = '') {
  const other = secondaryName ? ` · ${secondaryName}` : '';
  switch (event.event_type) {
    case 'shot_made': return `#${event.shot_value ?? 2} made · ${playerName}${other}`;
    case 'shot_missed': return `#${event.shot_value ?? 2} miss · ${playerName}${other}`;
    case 'free_throw_made': return `FT made · ${playerName}`;
    case 'free_throw_missed': return `FT miss · ${playerName}`;
    case 'rebound_off': return `OREB · ${playerName}`;
    case 'rebound_def': return `DREB · ${playerName}`;
    case 'steal': return `Steal · ${playerName}`;
    case 'block': return `Block · ${playerName}`;
    case 'turnover': return `Turnover · ${playerName}`;
    case 'foul': return `Foul · ${playerName}${event.foul_type ? ` · ${event.foul_type}` : ''}`;
    case 'substitution': return `Sub · ${playerName}`;
    case 'timeout': return 'Timeout';
    case 'violation': return `Violation · ${playerName}`;
    default: return event.event_type.replace(/_/g, ' ');
  }
}


export type GameIQTeamAnalytics = {
  team_id: string;
  points: number;
  possessions: number;
  pace_48: number;
  offensive_rating: number;
  defensive_rating: number;
  net_rating: number;
  efg_pct: number;
  ts_pct: number;
  turnover_rate: number;
  offensive_rebound_rate: number;
  free_throw_rate: number;
};

export type GameIQAnalytics = {
  game_minutes: number;
  teams: GameIQTeamAnalytics[];
  scoring_runs: Array<{
    team_id: string;
    points: number;
    start_period: number;
    start_clock: number;
    end_period: number;
    end_clock: number;
  }>;
  clutch: Record<string, {
    points: number;
    field_goals_made: number;
    field_goals_attempted: number;
    three_pointers_made: number;
    three_pointers_attempted: number;
    turnovers: number;
    possessions: number;
    efg_pct: number;
    ts_pct: number;
  }>;
  shot_zones: Record<string, Record<string, { made: number; attempts: number; points: number; fg_pct: number }>>;
  lineup_combinations: Array<{
    team_id: string;
    player_ids: string[];
    seconds: number;
    points_for: number;
    points_against: number;
    plus_minus: number;
    possessions: number;
  }>;
  on_off: Record<string, {
    team_id: string;
    on_seconds: number;
    on_plus_minus: number;
    off_seconds: number;
    off_plus_minus: number;
  }>;
};

const jsonRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const roundMetric = (value: number, digits = 1) => Number(value.toFixed(digits));

export function deriveGameAnalytics(
  game: Game,
  events: GameEvent[],
  stats: PlayerGameStats[],
  lineups: GameLineup[],
): GameIQAnalytics {
  const active = events.filter((event) => !event.voided_at).sort((a, b) => a.sequence_no - b.sequence_no);
  const teamIds = [game.home_team_id, game.away_team_id];
  const gameMinutes = Math.max(1, (game.period_count * game.period_length_seconds) / 60);

  const teamStats = teamIds.map((teamId) => {
    const stat = stats.filter((item) => item.team_id === teamId).reduce((acc, item) => ({
      points: acc.points + item.points,
      fga: acc.fga + item.field_goals_attempted,
      fgm: acc.fgm + item.field_goals_made,
      tpa: acc.tpa + item.three_pointers_attempted,
      tpm: acc.tpm + item.three_pointers_made,
      fta: acc.fta + item.free_throws_attempted,
      ftm: acc.ftm + item.free_throws_made,
      to: acc.to + item.turnovers,
      oreb: acc.oreb + Math.max(0, item.rebounds - 0),
    }), { points: 0, fga: 0, fgm: 0, tpa: 0, tpm: 0, fta: 0, ftm: 0, to: 0, oreb: 0 });

    // Player-game stats currently expose total rebounds, so the event stream is the source for OREB.
    const oreb = active.filter((event) => event.team_id === teamId && event.event_type === 'rebound_off').length;
    const dreb = active.filter((event) => event.team_id === teamId && event.event_type === 'rebound_def').length;
    const possessions = Math.max(1, stat.fga + 0.44 * stat.fta + stat.to - oreb);
    const opponent = teamIds.find((id) => id !== teamId) ?? teamId;
    const opponentStat = stats.filter((item) => item.team_id === opponent).reduce((acc, item) => ({
      fga: acc.fga + item.field_goals_attempted,
      fta: acc.fta + item.free_throws_attempted,
      to: acc.to + item.turnovers,
    }), { fga: 0, fta: 0, to: 0 });
    const opponentOreb = active.filter((event) => event.team_id === opponent && event.event_type === 'rebound_off').length;
    const opponentPossessions = Math.max(1, opponentStat.fga + 0.44 * opponentStat.fta + opponentStat.to - opponentOreb);
    const efg = stat.fga > 0 ? (stat.fgm + 0.5 * stat.tpm) / stat.fga : 0;
    const tsa = stat.fga + 0.44 * stat.fta;
    const ts = tsa > 0 ? stat.points / (2 * tsa) : 0;
    const totalRebounds = oreb + dreb;
    const opponentRebounds = active.filter((event) => event.team_id === opponent && ['rebound_off', 'rebound_def'].includes(event.event_type)).length;
    const orbRate = totalRebounds + opponentRebounds > 0 ? oreb / (oreb + opponentRebounds) : 0;
    const ftRate = stat.fga > 0 ? stat.fta / stat.fga : 0;
    const tovRate = (stat.fga + 0.44 * stat.fta + stat.to) > 0 ? stat.to / (stat.fga + 0.44 * stat.fta + stat.to) : 0;
    const net = (stat.points / possessions) * 100 - ((stats.filter((item) => item.team_id === opponent).reduce((s, item) => s + item.points, 0)) / opponentPossessions) * 100;

    return {
      team_id: teamId,
      points: stat.points,
      possessions: roundMetric(possessions),
      pace_48: roundMetric(possessions / gameMinutes * 48),
      offensive_rating: roundMetric(stat.points / possessions * 100),
      defensive_rating: roundMetric((stats.filter((item) => item.team_id === opponent).reduce((s, item) => s + item.points, 0)) / opponentPossessions * 100),
      net_rating: roundMetric(net),
      efg_pct: roundMetric(efg * 100),
      ts_pct: roundMetric(ts * 100),
      turnover_rate: roundMetric(tovRate * 100),
      offensive_rebound_rate: roundMetric(orbRate * 100),
      free_throw_rate: roundMetric(ftRate * 100),
    };
  });

  const scores: Record<string, number> = Object.fromEntries(teamIds.map((id) => [id, 0]));
  const scoringRuns: GameIQAnalytics['scoring_runs'] = [];
  let runTeam = '';
  let runPoints = 0;
  let runStart: GameEvent | null = null;
  for (const event of active) {
    if (!event.team_id || !teamIds.includes(event.team_id)) continue;
    const points = ['shot_made', 'free_throw_made', 'score_adjustment'].includes(event.event_type) ? event.points : 0;
    if (points <= 0) continue;
    if (runTeam === event.team_id) {
      runPoints += points;
    } else {
      if (runTeam && runPoints >= 6 && runStart) {
        scoringRuns.push({ team_id: runTeam, points: runPoints, start_period: runStart.period_number, start_clock: runStart.clock_seconds, end_period: event.period_number, end_clock: event.clock_seconds });
      }
      runTeam = event.team_id;
      runPoints = points;
      runStart = event;
    }
    scores[event.team_id] += points;
  }
  if (runTeam && runPoints >= 6 && runStart) {
    const last = active.filter((event) => event.team_id === runTeam && ['shot_made', 'free_throw_made', 'score_adjustment'].includes(event.event_type) && event.points > 0).at(-1);
    if (last) scoringRuns.push({ team_id: runTeam, points: runPoints, start_period: runStart.period_number, start_clock: runStart.clock_seconds, end_period: last.period_number, end_clock: last.clock_seconds });
  }

  const clutch: GameIQAnalytics['clutch'] = Object.fromEntries(teamIds.map((teamId) => [teamId, {
    points: 0, field_goals_made: 0, field_goals_attempted: 0, three_pointers_made: 0, three_pointers_attempted: 0, turnovers: 0, possessions: 0, efg_pct: 0, ts_pct: 0,
  }]));
  const preScores: Record<string, number> = Object.fromEntries(teamIds.map((id) => [id, 0]));
  for (const event of active) {
    if (!event.team_id || !teamIds.includes(event.team_id)) continue;
    const totalSeconds = (event.period_number - 1) * game.period_length_seconds + event.clock_seconds;
    const inClutch = totalSeconds <= 0 || (event.period_number === game.period_count && event.clock_seconds <= 120);
    if (inClutch && Math.abs(preScores[game.home_team_id] - preScores[game.away_team_id]) <= 5) {
      const c = clutch[event.team_id];
      if (event.event_type === 'shot_made' || event.event_type === 'shot_missed') {
        c.field_goals_attempted += 1;
        if (event.event_type === 'shot_made') { c.field_goals_made += 1; c.points += event.points; }
        if (event.shot_value === 3) c.three_pointers_attempted += 1;
        if (event.shot_value === 3 && event.event_type === 'shot_made') c.three_pointers_made += 1;
        c.possessions += event.event_type === 'shot_made' || event.event_type === 'shot_missed' ? 1 : 0;
      } else if (event.event_type === 'free_throw_made' || event.event_type === 'free_throw_missed') {
        if (event.event_type === 'free_throw_made') c.points += event.points;
        c.possessions += 0.44;
      } else if (event.event_type === 'turnover') {
        c.turnovers += 1; c.possessions += 1;
      }
    }
    if (['shot_made', 'free_throw_made', 'score_adjustment'].includes(event.event_type)) preScores[event.team_id] += event.points;
  }
  for (const teamId of teamIds) {
    const c = clutch[teamId];
    const tsa = c.field_goals_attempted + 0.44 * (active.filter((event) => event.team_id === teamId && ['free_throw_made', 'free_throw_missed'].includes(event.event_type) && event.period_number === game.period_count && event.clock_seconds <= 120).length);
    c.efg_pct = c.field_goals_attempted > 0 ? roundMetric((c.field_goals_made + 0.5 * c.three_pointers_made) / c.field_goals_attempted * 100) : 0;
    c.ts_pct = tsa > 0 ? roundMetric(c.points / (2 * tsa) * 100) : 0;
    c.points = roundMetric(c.points);
    c.possessions = roundMetric(c.possessions);
  }

  const shotZones: GameIQAnalytics['shot_zones'] = {};
  for (const teamId of teamIds) {
    shotZones[teamId] = {};
    for (const shot of active.filter((event) => event.team_id === teamId && ['shot_made', 'shot_missed'].includes(event.event_type))) {
      const zone = shot.shot_zone ?? 'unclassified';
      const current = shotZones[teamId][zone] ?? { made: 0, attempts: 0, points: 0, fg_pct: 0 };
      current.attempts += 1;
      if (shot.event_type === 'shot_made') { current.made += 1; current.points += shot.points; }
      current.fg_pct = roundMetric(current.made / current.attempts * 100);
      shotZones[teamId][zone] = current;
    }
  }

  const lineupMap = new Map<string, GameIQAnalytics['lineup_combinations'][number]>();
  for (const lineup of lineups.filter((item) => item.game_id === game.id)) {
    const playerIds = [...lineup.player_ids].sort();
    const key = `${lineup.team_id}:${playerIds.join(',')}`;
    const current = lineupMap.get(key) ?? { team_id: lineup.team_id, player_ids: playerIds, seconds: 0, points_for: 0, points_against: 0, plus_minus: 0, possessions: 0 };
    current.seconds += lineup.seconds_played ?? Math.max(0, (lineup.started_clock_seconds ?? 0) - (lineup.ended_clock_seconds ?? 0));
    current.points_for += lineup.points_for;
    current.points_against += lineup.points_against;
    current.plus_minus += lineup.plus_minus;
    current.possessions += lineup.possessions;
    lineupMap.set(key, current);
  }

  const onOff: GameIQAnalytics['on_off'] = {};
  for (const teamId of teamIds) {
    const teamMinutes = gameMinutes * 60;
    const teamLineups = lineups.filter((lineup) => lineup.team_id === teamId);
    const teamMargin = teamStats.find((item) => item.team_id === teamId)?.net_rating ?? 0;
    const finalMargin = (teamId === game.home_team_id ? game.home_score - game.away_score : game.away_score - game.home_score);
    const playersOnTeam = [...new Set(teamLineups.flatMap((lineup) => lineup.player_ids))];
    for (const playerId of playersOnTeam) {
      const on = teamLineups.filter((lineup) => lineup.player_ids.includes(playerId));
      const onSeconds = on.reduce((sum, item) => sum + (item.seconds_played ?? 0), 0);
      const onPlusMinus = on.reduce((sum, item) => sum + item.plus_minus, 0);
      const offSeconds = Math.max(0, teamMinutes - onSeconds);
      const offPlusMinus = finalMargin - onPlusMinus;
      onOff[playerId] = { team_id: teamId, on_seconds: onSeconds, on_plus_minus: onPlusMinus, off_seconds: offSeconds, off_plus_minus: offPlusMinus };
      void teamMargin;
    }
  }

  return { game_minutes: gameMinutes, teams: teamStats, scoring_runs: scoringRuns.slice(-12), clutch, shot_zones: shotZones, lineup_combinations: [...lineupMap.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 12), on_off: onOff };
}
