import type { GameEvent, PlayerGameStats } from '@/types/database';

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
