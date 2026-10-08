export type ScoreComponent = { label: string; value: number; weight: number; available: boolean };
export type ExplainableScore = { score: number | null; components: ScoreComponent[]; dataPoints: number; reason?: string };

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const average = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

export function calculatePlayerIndex(input: {
  games: number;
  scoring?: number[];
  shooting?: number[];
  playmaking?: number[];
  rebounding?: number[];
  defense?: number[];
  efficiency?: number[];
  teamImpact?: number[];
  coachEvaluation?: number[];
  teammateEvaluation?: number[];
}): ExplainableScore {
  const components: ScoreComponent[] = [
    ['Scoring', input.scoring], ['Shooting', input.shooting], ['Playmaking', input.playmaking],
    ['Rebounding', input.rebounding], ['Defense', input.defense], ['Efficiency', input.efficiency],
    ['Team impact', input.teamImpact], ['Coach evaluation', input.coachEvaluation],
    ['Teammate evaluation', input.teammateEvaluation],
  ].map(([label, values]) => ({ label: label as string, value: clamp(average((values as number[] | undefined) ?? [])), weight: 1, available: Boolean(values?.length) }));
  const available = components.filter((component) => component.available);
  if (!input.games || !available.length) return { score: null, components, dataPoints: 0, reason: 'Not enough verified game or evaluation data.' };
  const weight = 100 / available.length;
  return { score: Number(average(available.map((component) => component.value)).toFixed(2)), components: components.map((component) => ({ ...component, weight })), dataPoints: input.games };
}

export function calculateWinFactor(input: { wins: number; games: number; impact: number[]; efficiency: number[]; defense: number[]; playmaking: number[]; consistency: number[] }): ExplainableScore {
  if (!input.games) return { score: null, components: [], dataPoints: 0, reason: 'Not enough completed games.' };
  const components = [
    { label: 'Team wins', value: clamp((input.wins / input.games) * 100), weight: 0.25, available: true },
    { label: 'Individual impact', value: clamp(average(input.impact)), weight: 0.2, available: input.impact.length > 0 },
    { label: 'Efficiency', value: clamp(average(input.efficiency)), weight: 0.2, available: input.efficiency.length > 0 },
    { label: 'Defense', value: clamp(average(input.defense)), weight: 0.15, available: input.defense.length > 0 },
    { label: 'Playmaking', value: clamp(average(input.playmaking)), weight: 0.1, available: input.playmaking.length > 0 },
    { label: 'Consistency', value: clamp(average(input.consistency)), weight: 0.1, available: input.consistency.length > 0 },
  ];
  const available = components.filter((component) => component.available);
  return { score: Number(clamp(available.reduce((sum, component) => sum + component.value * component.weight, 0) / available.reduce((sum, component) => sum + component.weight, 0)).toFixed(2)), components, dataPoints: input.games };
}

export function calculateFanWinFactor(input: { posts: number; comments: number; reactions: number; predictions: number; predictionAccuracy: number; communityActions: number; gamesAttended: number }): ExplainableScore {
  if (input.posts + input.comments + input.reactions + input.predictions + input.communityActions + input.gamesAttended === 0) return { score: null, components: [], dataPoints: 0, reason: 'Start participating to establish a fan score.' };
  const values = [
    { label: 'Engagement', value: clamp(input.posts * 2 + input.comments + input.reactions * 0.5), weight: 0.25, available: true },
    { label: 'Basketball knowledge', value: input.predictions ? clamp(input.predictionAccuracy) : 0, weight: 0.25, available: input.predictions > 0 },
    { label: 'Community', value: clamp(input.communityActions * 4), weight: 0.25, available: true },
    { label: 'Attendance', value: clamp(input.gamesAttended * 10), weight: 0.15, available: input.gamesAttended > 0 },
    { label: 'Achievements', value: 0, weight: 0.1, available: false },
  ];
  const available = values.filter((component) => component.available);
  if (!available.length) return { score: null, components: values, dataPoints: 0, reason: 'Start participating to establish a fan score.' };
  const weight = available.reduce((sum, component) => sum + component.weight, 0);
  return { score: Number((available.reduce((sum, component) => sum + component.value * component.weight, 0) / weight).toFixed(2)), components: values, dataPoints: input.posts + input.comments + input.predictions + input.communityActions + input.gamesAttended };
}

export function calculateFantasyPoints(stats: { points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number }, rules = { points: 1, rebounds: 1.2, assists: 1.5, steals: 3, blocks: 3, turnovers: -1 }) {
  return Number(Math.max(0, stats.points * rules.points + stats.rebounds * rules.rebounds + stats.assists * rules.assists + stats.steals * rules.steals + stats.blocks * rules.blocks + stats.turnovers * rules.turnovers).toFixed(2));
}
