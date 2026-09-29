export type ReputationStatus = { key: string; label: string; minLevel: number; nextLevel: number | null };
export type ReputationDimension = 'hooper' | 'community' | 'creator' | 'coach' | 'reliability';

export const REPUTATION_DIMENSIONS: Array<{ key: ReputationDimension; label: string; description: string }> = [
  { key: 'hooper', label: 'Hooper REP', description: 'Verified games, performance, training and basketball development.' },
  { key: 'community', label: 'Community REP', description: 'Participation, conversation, Pick’em and positive league activity.' },
  { key: 'creator', label: 'Creator REP', description: 'Posts, stories, media, highlights and basketball content.' },
  { key: 'coach', label: 'Coach REP', description: 'Scouting, coaching activity and basketball leadership.' },
  { key: 'reliability', label: 'Reliability REP', description: 'Showing up for runs, check-ins and commitments.' },
];

const STATUS_TIERS: ReputationStatus[] = [
  { key: 'rookie', label: 'Rookie', minLevel: 1, nextLevel: 3 },
  { key: 'prospect', label: 'Prospect', minLevel: 3, nextLevel: 6 },
  { key: 'starter', label: 'Starter', minLevel: 6, nextLevel: 10 },
  { key: 'all-city', label: 'All-City', minLevel: 10, nextLevel: 16 },
  { key: 'elite', label: 'Elite', minLevel: 16, nextLevel: 25 },
  { key: 'legend', label: 'Legend', minLevel: 25, nextLevel: null },
];

export function xpForLevel(level: number) {
  const safe = Math.max(1, Math.floor(level));
  return safe === 1 ? 0 : 100 * (safe - 1) * (safe - 1);
}

export function reputationStatus(level: number) {
  const safe = Math.max(1, Math.floor(level));
  return [...STATUS_TIERS].reverse().find((tier) => safe >= tier.minLevel) ?? STATUS_TIERS[0];
}

export function reputationProgress(rep: number, level: number) {
  const safeRep = Math.max(0, rep);
  const safeLevel = Math.max(1, Math.floor(level));
  const start = xpForLevel(safeLevel);
  const next = xpForLevel(safeLevel + 1);
  return { start, next, remaining: Math.max(0, next - safeRep), percent: Math.min(100, Math.max(4, ((safeRep - start) / Math.max(1, next - start)) * 100)) };
}

export function formatReputation(rep: number) {
  return rep >= 1000 ? (rep / 1000).toFixed(1) + 'K' : String(rep);
}
