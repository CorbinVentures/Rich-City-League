export type SocialFeedPost = {
  id: string;
  author_id: string;
  body: string;
  media_urls?: string[];
  created_at: string;
  comments?: Array<unknown>;
  reactions?: Array<unknown>;
  author?: { is_system_account?: boolean | null } | null;
};

type FeedContext = {
  userId?: string;
  following: string[];
  connections?: string[];
  communityPeers?: string[];
  teammates?: string[];
  interactedAuthors?: string[];
  now?: number;
};

/**
 * RCL's For You feed uses explainable basketball-network signals.
 *
 * Strongest signals are explicit relationships the member created: following,
 * accepted connections and teammates. Joined-community proximity and prior
 * real interactions provide smaller relevance boosts. Recency, real reactions
 * and comments still matter, and official RCL activity receives a modest boost
 * so game/REP updates can reach members without dominating the feed.
 *
 * Ranking never fabricates engagement, hides content for non-engagement or
 * removes user control. Following, Latest and Trending remain available beside
 * For You so members can choose how they browse the network.
 */
export function scoreSocialPost(post: SocialFeedPost, context: FeedContext) {
  const now = context.now ?? Date.now();
  const ageHours = Math.max(0, (now - new Date(post.created_at).getTime()) / 3_600_000);
  const recency = Math.max(0, 1 - ageHours / 96);
  const reactionCount = post.reactions?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;
  const engagement = Math.min(1, reactionCount * 0.035 + commentCount * 0.09);

  const relationships = [
    post.author_id === context.userId ? 0.20 : 0,
    context.following.includes(post.author_id) ? 0.34 : 0,
    context.teammates?.includes(post.author_id) ? 0.32 : 0,
    context.connections?.includes(post.author_id) ? 0.28 : 0,
    context.communityPeers?.includes(post.author_id) ? 0.16 : 0,
    context.interactedAuthors?.includes(post.author_id) ? 0.14 : 0,
  ];
  const relationship = Math.max(...relationships);
  const media = (post.media_urls?.length ?? 0) > 0 ? 0.07 : 0;
  const official = post.author?.is_system_account ? 0.08 : 0;

  const body = post.body.toLowerCase();
  const localBasketball = /804|richmond|rva|southside|northside|east end|west end|court|pickup|hooping|run|team|player/.test(body) ? 0.08 : 0;

  // Stable exploration value changes every 30 minutes instead of every render.
  // It introduces some discovery without making the feed feel arbitrary.
  const bucket = Math.floor(now / 1_800_000);
  let hash = 2166136261;
  for (const char of `${post.id}:${bucket}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const exploration = ((hash >>> 0) / 4_294_967_295) * 0.12;

  return (
    recency * 0.34 +
    engagement * 0.19 +
    relationship +
    localBasketball +
    media +
    official +
    exploration
  );
}

export function rankSocialPosts<T extends SocialFeedPost>(posts: T[], context: FeedContext): T[] {
  const ranked = [...posts]
    .map((post, index) => ({ post, index, score: scoreSocialPost(post, context) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  // Small deterministic diversity pass: avoid long runs from one author or
  // official account when another similarly relevant post is available.
  const output: typeof ranked = [];
  const remaining = [...ranked];
  const authorCounts = new Map<string, number>();

  while (remaining.length) {
    const windowSize = Math.min(8, remaining.length);
    let bestIndex = 0;
    let bestAdjusted = Number.NEGATIVE_INFINITY;
    const previous = output[output.length - 1]?.post;

    for (let index = 0; index < windowSize; index += 1) {
      const candidate = remaining[index];
      const seen = authorCounts.get(candidate.post.author_id) ?? 0;
      const repeatedAuthor = previous?.author_id === candidate.post.author_id ? 0.11 : 0;
      const repeatedOfficial = previous?.author?.is_system_account && candidate.post.author?.is_system_account ? 0.07 : 0;
      const adjusted = candidate.score - Math.min(0.18, seen * 0.045) - repeatedAuthor - repeatedOfficial;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    output.push(picked);
    authorCounts.set(picked.post.author_id, (authorCounts.get(picked.post.author_id) ?? 0) + 1);
  }

  return output.map(({ post }) => post);
}
