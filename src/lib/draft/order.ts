/**
 * League-approved standard draft sequences. Fantasy-exclusive auction bidding
 * is intentionally not used for actual season-roster assignments.
 */
export type SeasonDraftFormat = 'linear' | 'snake';
export function generateSeasonDraftOrder(teamIds: string[], rounds: number, format: SeasonDraftFormat): string[] {
  if (teamIds.length < 2 || !Number.isInteger(rounds) || rounds < 1 || rounds > 20) return [];
  if (new Set(teamIds).size !== teamIds.length || teamIds.some(id=>!id.trim())) return [];
  return Array.from({length:rounds},(_,round)=>
    format==='snake'&&round%2===1?[...teamIds].reverse():[...teamIds]
  ).flat();
}
