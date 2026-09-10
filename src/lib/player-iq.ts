export type StatLine = {
  points?: number | null; rebounds?: number | null; assists?: number | null;
  steals?: number | null; blocks?: number | null; turnovers?: number | null;
  field_goals_made?: number | null; field_goals_attempted?: number | null;
  three_pointers_made?: number | null; three_pointers_attempted?: number | null;
  free_throws_made?: number | null; free_throws_attempted?: number | null;
};

export type TeammateGrade = {
  communication: number; unselfishness: number; effort: number; leadership: number;
  defense: number; team_chemistry: number; coachability: number;
};

export type PlayerIQScores = {
  rclRating: number; courtPerformance: number; skillProfile: number;
  teammateGrade: number; communityPopularity: number; growthConsistency: number;
  exposureIndex: number; archetype: string | null; trend: 'rising' | 'stable' | 'declining';
  gamesEvaluated: number; ratingChange: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const safe = (value: number | null | undefined) => Number.isFinite(value) ? Number(value) : 0;

export function calculateCourtPerformance(stats: StatLine[]): number {
  if (!stats.length) return 0;
  const perGame = stats.map((s) => {
    const shooting = safe(s.field_goals_attempted) ? (safe(s.field_goals_made) / safe(s.field_goals_attempted)) * 18 : 0;
    const efficiency = safe(s.points) + safe(s.rebounds) * 1.2 + safe(s.assists) * 1.5 + safe(s.steals) * 2 + safe(s.blocks) * 2 - safe(s.turnovers) * 1.5;
    return clamp(efficiency + shooting);
  });
  return Number(clamp(avg(perGame) * Math.min(1, stats.length / 5)).toFixed(2));
}

export function calculateSkillProfile(stats: StatLine[]): number {
  if (!stats.length) return 0;
  const points = avg(stats.map((s) => safe(s.points)));
  const assists = avg(stats.map((s) => safe(s.assists)));
  const defense = avg(stats.map((s) => safe(s.steals) + safe(s.blocks) + safe(s.rebounds) * 0.35));
  const shooting = avg(stats.filter((s) => safe(s.field_goals_attempted) > 0).map((s) => safe(s.field_goals_made) / safe(s.field_goals_attempted) * 100));
  return Number(clamp(points * 2 + assists * 4 + defense * 4 + (shooting || 0) * 0.2).toFixed(2));
}

export function calculateTeammateGrade(grades: TeammateGrade[]): number {
  if (!grades.length) return 0;
  return Number((avg(grades.map((grade) => avg(Object.values(grade)))) * 20).toFixed(2));
}

export function calculatePopularity(metrics: { followers?: number; views?: number; engagement?: number }): number {
  const score = Math.log1p(Math.max(0, metrics.followers ?? 0)) * 8
    + Math.log1p(Math.max(0, metrics.views ?? 0)) * 5
    + Math.log1p(Math.max(0, metrics.engagement ?? 0)) * 7;
  return Number(clamp(score).toFixed(2));
}

export function calculateGrowthConsistency(current: StatLine[], previous: StatLine[] = []): number {
  if (!current.length) return 0;
  const currentImpact = calculateCourtPerformance(current);
  const previousImpact = previous.length ? calculateCourtPerformance(previous) : currentImpact;
  const consistency = clamp(100 - (Math.sqrt(avg(current.map((s) => Math.abs(safe(s.points) - avg(current.map((x) => safe(x.points))))))) * 4));
  return Number(clamp(60 + (currentImpact - previousImpact) * 0.5 + consistency * 0.4).toFixed(2));
}

export function determineArchetype(stats: StatLine[]): string | null {
  if (!stats.length) return null;
  const points = avg(stats.map((s) => safe(s.points)));
  const assists = avg(stats.map((s) => safe(s.assists)));
  const defense = avg(stats.map((s) => safe(s.steals) + safe(s.blocks)));
  const rebounds = avg(stats.map((s) => safe(s.rebounds)));
  if (assists >= 6 && defense >= 2) return 'Two-Way Floor General';
  if (assists >= 6) return 'Playmaking Guard';
  if (defense >= 3 && rebounds >= 7) return 'Defensive Anchor';
  if (rebounds >= 10) return 'Glass Cleaner';
  if (points >= 18 && defense >= 2) return 'Complete Two-Way Player';
  if (points >= 18) return 'Shot Creator';
  return 'Team Contributor';
}

export function calculatePlayerIQ(input: {
  stats: StatLine[]; previousStats?: StatLine[]; teammateGrades?: TeammateGrade[];
  popularity?: { followers?: number; views?: number; engagement?: number }; previousRating?: number | null;
}): PlayerIQScores {
  const courtPerformance = calculateCourtPerformance(input.stats);
  const skillProfile = calculateSkillProfile(input.stats);
  const teammateGrade = calculateTeammateGrade(input.teammateGrades ?? []);
  const communityPopularity = calculatePopularity(input.popularity ?? {});
  const growthConsistency = calculateGrowthConsistency(input.stats, input.previousStats);
  const rclRating = Number(clamp(courtPerformance * .4 + skillProfile * .2 + teammateGrade * .15 + communityPopularity * .1 + growthConsistency * .15).toFixed(2));
  const previous = input.previousRating ?? rclRating;
  const ratingChange = Number((rclRating - previous).toFixed(2));
  const exposureIndex = Number(clamp(courtPerformance * .35 + communityPopularity * .3 + growthConsistency * .2 + (input.stats.length ? 15 : 0) + Math.min(10, ratingChange)).toFixed(2));
  return { rclRating, courtPerformance, skillProfile, teammateGrade, communityPopularity, growthConsistency, exposureIndex,
    archetype: determineArchetype(input.stats), trend: ratingChange > 1 ? 'rising' : ratingChange < -1 ? 'declining' : 'stable',
    gamesEvaluated: input.stats.length, ratingChange };
}
