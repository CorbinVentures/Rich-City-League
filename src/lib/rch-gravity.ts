/**
 * RCH Gravity — a shared, explainable relevance engine.
 *
 * Only rank records that the caller has already established are visible to the
 * member. Do not use this function as authorization, access control, or a
 * substitute for Supabase RLS. Never infer sensitive characteristics.
 *
 * The objective is meaningful basketball participation, not screen time.
 */
export type GravityIntent = 'play' | 'watch' | 'connect' | 'create' | 'grow';
export type GravityGoal = 'hoop' | 'compete' | 'improve' | 'noticed';
export type GravityCategory =
  | 'run' | 'tournament' | 'training' | 'league' | 'tryout' | 'event'
  | 'game' | 'post' | 'video' | 'community' | 'profile'
  | 'mission' | 'organization';

export type GravityCandidate = {
  id: string;
  category: GravityCategory;
  title?: string;
  keywords?: string;
  city?: string | null;
  ownerId?: string | null;
  createdAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  unavailable?: boolean;
  isVerified?: boolean;
  isSaved?: boolean;
  popularity?: number; // Verified, real interaction count only.
  completion?: number; // Verified mission completion fraction (0-1).
};

export type GravityContext = {
  intent?: GravityIntent | null;
  goal?: GravityGoal | null;
  city?: string | null; // Only explicit user-selected city, never precise GPS.
  userId?: string | null;
  followingIds?: readonly string[];
  hiddenIds?: readonly string[];
  blockedOwnerIds?: readonly string[];
  now?: number;
};

export type GravityScore = { score: number; reasons: string[] };

const INTENT_CATEGORIES: Record<GravityIntent, readonly GravityCategory[]> = {
  play: ['run', 'game', 'tournament', 'league', 'training', 'tryout'],
  watch: ['game', 'video', 'post', 'event'],
  connect: ['community', 'profile', 'post', 'run'],
  create: ['video', 'post', 'mission', 'event'],
  grow: ['training', 'tryout', 'organization', 'tournament', 'mission'],
};
const GOAL_CATEGORIES: Record<GravityGoal, readonly GravityCategory[]> = {
  hoop: ['run', 'game', 'tournament', 'league'],
  compete: ['tournament', 'league', 'tryout', 'game'],
  improve: ['training', 'run', 'mission'],
  noticed: ['tryout', 'tournament', 'video', 'profile', 'event'],
};
const TOPIC_REGEX: Partial<Record<GravityIntent, RegExp>> = {
  play: /\b(run|pickup|court|basketball|hoop|scrimmage|game|tournament|league)\b/i,
  watch: /\b(watch|clip|stream|highlights?|game|scores?|film|show|tv)\b/i,
  connect: /\b(community|meet|team|players?|friends?|court|conversation)\b/i,
  create: /\b(post|video|film|highlights?|creator|photos?|content)\b/i,
  grow: /\b(coach|tryouts?|training|scout|exposure|development|organization)\b/i,
};

const DAY = 86_400_000;
const clamp01 = (n: number) => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
const dateMs = (date?: string | null) => {
  if (!date) return null;
  const value = Date.parse(date);
  return Number.isFinite(value) ? value : null;
};

export function isGravityIntent(value: string | null | undefined): value is GravityIntent {
  return value === 'play' || value === 'watch' || value === 'connect'
    || value === 'create' || value === 'grow';
}

export function isGravityGoal(value: string | null | undefined): value is GravityGoal {
  return value === 'hoop' || value === 'compete' || value === 'improve' || value === 'noticed';
}

export function gravityCandidateEligible(item: GravityCandidate, context: GravityContext): boolean {
  if (!item.id || item.unavailable || context.hiddenIds?.includes(item.id)) return false;
  if (item.ownerId && context.blockedOwnerIds?.includes(item.ownerId)) return false;
  const now = context.now ?? Date.now();
  const ends = dateMs(item.endsAt);
  const starts = dateMs(item.startsAt);
  // Do not recommend events that have ended or already started when they are
  // explicitly future opportunities. Live games should omit startsAt.
  if (ends !== null && ends <= now) return false;
  if (starts !== null && starts < now && item.category !== 'game') return false;
  return true;
}

function stableExplore(id: string, seed: string) {
  let hash = 2166136261;
  for (const char of id + ':' + seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/** Score a single *authorized and eligible* object on a bounded 0..1 scale. */
export function scoreGravityCandidate(item: GravityCandidate, context: GravityContext): GravityScore {
  if (!gravityCandidateEligible(item, context)) return {score: -1, reasons: []};
  const now = context.now ?? Date.now();
  const reasons: string[] = [];
  const intentMatches = Boolean(context.intent && INTENT_CATEGORIES[context.intent].includes(item.category));
  const topicMatches = Boolean(context.intent && TOPIC_REGEX[context.intent]?.test([item.title, item.keywords].join(' ')));
  const goalMatches = Boolean(context.goal && GOAL_CATEGORIES[context.goal].includes(item.category));
  const hasPreference = Boolean(context.intent || context.goal);

  const preference = !hasPreference ? 0.35 : goalMatches ? 1
    : intentMatches ? 0.85 : topicMatches ? 0.65 : 0.08;
  if (goalMatches || intentMatches || topicMatches) reasons.push('Matches your basketball goals');

  const explicitCity = context.city?.trim().toLocaleLowerCase();
  const candidateCity = item.city?.trim().toLocaleLowerCase();
  const local = explicitCity && candidateCity
    ? (explicitCity === candidateCity ? 1 : 0.1)
    : 0.35;
  if (explicitCity && candidateCity && explicitCity === candidateCity) reasons.push('In your selected city');

  const following = Boolean(item.ownerId && context.followingIds?.includes(item.ownerId));
  if (following) reasons.push('From someone you follow');

  const start = dateMs(item.startsAt);
  const created = dateMs(item.createdAt);
  const daysUntil = start === null ? null : (start - now) / DAY;
  const ageDays = created === null ? null : Math.max(0, (now - created) / DAY);
  // Reward real, near-term opportunities without false urgency or countdowns.
  const timely = daysUntil !== null
    ? daysUntil <= 2 && daysUntil >= 0 ? 1 : daysUntil <= 7 && daysUntil >= 0 ? 0.8 : 0.4
    : ageDays !== null ? Math.exp(-ageDays / 7) : 0.35;
  if (daysUntil !== null && daysUntil >= 0 && daysUntil <= 2) reasons.push('Happening soon');

  // Relevance and meaningful action dominate raw popularity.
  const activity = clamp01(Math.log1p(Math.max(0, item.popularity ?? 0)) / Math.log1p(40));
  const progress = item.completion === undefined ? 0 : clamp01(item.completion);
  if (progress >= 0.7 && progress < 1) reasons.push('Close to a verified milestone');
  const actionable = item.unavailable ? 0 : Math.max(item.isSaved ? 0.85 : 0.4, progress);

  // Rotate a small exploration component daily; no randomness per render.
  const daySeed = new Date(now).toISOString().slice(0, 10);
  const discovery = stableExplore(item.id, [context.userId || 'guest', daySeed].join(':'));
  const verified = item.isVerified ? 1 : 0;

  const score = preference * 0.27 + local * 0.18 + (following ? 1 : 0) * 0.16
    + actionable * 0.15 + timely * 0.11 + activity * 0.06
    + discovery * 0.05 + verified * 0.02;
  return {score: clamp01(score), reasons: reasons.slice(0, 2)};
}

/**
 * Site-wide ranking used by Discover, Pulse and Today.
 * Diversify the first six cards when possible without hiding any eligible
 * records. If a source is sparse, fall back to the highest-ranked candidates.
 */
export function rankGravityCandidates<T extends GravityCandidate>(items: readonly T[], context: GravityContext): T[] {
  const ranked = items
    .map((item, index) => ({item, index, score: scoreGravityCandidate(item, context).score}))
    .filter(entry => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const result: typeof ranked = [];
  const categoryCount = new Map<GravityCategory, number>();
  const ownerCount = new Map<string, number>();
  const remaining = [...ranked];
  while (remaining.length && result.length < 6) {
    let index = remaining.findIndex(({item}) =>
      (categoryCount.get(item.category) ?? 0) < 2
      && (!item.ownerId || (ownerCount.get(item.ownerId) ?? 0) < 2));
    if (index < 0) index = 0;
    const [entry] = remaining.splice(index, 1);
    result.push(entry);
    categoryCount.set(entry.item.category, (categoryCount.get(entry.item.category) ?? 0) + 1);
    if (entry.item.ownerId) ownerCount.set(entry.item.ownerId, (ownerCount.get(entry.item.ownerId) ?? 0) + 1);
  }
  return [...result, ...remaining].map(entry => entry.item);
}
