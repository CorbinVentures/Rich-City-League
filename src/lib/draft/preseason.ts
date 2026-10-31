import { generateSeasonDraftOrder } from './order';

/** A published preseason allocation, not a playable draft event. */
export type PreseasonDraftOrder = {
  season_label: string;
  status: 'established';
  format: 'snake';
  rounds: number;
  first_round_team_ids: string[];
  draw_seed: string;
  generated_at: string;
};

export function parsePreseasonDraftOrder(value: unknown, activeTeamIds: string[]): PreseasonDraftOrder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const ids = input.first_round_team_ids;
  if (input.status !== 'established' || input.format !== 'snake' ||
    typeof input.season_label !== 'string' || !input.season_label.trim() ||
    typeof input.draw_seed !== 'string' || !/^[a-f0-9]{32}$/.test(input.draw_seed) ||
    typeof input.generated_at !== 'string' || !Number.isFinite(Date.parse(input.generated_at)) ||
    !Number.isInteger(input.rounds) || (input.rounds as number) < 1 || (input.rounds as number) > 20 ||
    !Array.isArray(ids) || ids.some((id) => typeof id !== 'string') ||
    ids.length < 2 || new Set(ids).size !== ids.length ||
    ids.length !== activeTeamIds.length ||
    !ids.every((id) => activeTeamIds.includes(id as string))) return null;
  return {
    season_label: input.season_label as string,
    status: 'established',
    format: 'snake',
    rounds: input.rounds as number,
    first_round_team_ids: ids as string[],
    draw_seed: input.draw_seed as string,
    generated_at: input.generated_at as string,
  };
}

export function plannedDraftPicks(config: PreseasonDraftOrder) {
  return generateSeasonDraftOrder(config.first_round_team_ids, config.rounds, config.format)
    .map((teamId, index) => ({
      pickNumber: index + 1,
      roundNumber: Math.floor(index / config.first_round_team_ids.length) + 1,
      teamId,
    }));
}
