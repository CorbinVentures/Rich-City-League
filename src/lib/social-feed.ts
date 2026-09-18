export type SocialFeedPost = {
  id: string;
  author_id: string;
  body: string;
  media_urls?: string[];
  created_at: string;
  comments?: Array<unknown>;
  reactions?: Array<unknown>;
};

type FeedContext = {
  userId?: string;
  following: string[];
  now?: number;
};

/**
 * RCL feed ranking is designed around relevance + community discovery.
 *
 * The psychological concepts are translated into healthy product signals:
 * - Variable rewards -> an exploration lane that periodically surfaces
 *   different relevant posts instead of showing the same authors repeatedly.
 * - Belonging -> boosts followed people and community/city conversations.
 * - FOMO -> time-sensitive content is surfaced by freshness, never by fake
 *   scarcity or deceptive countdowns.
 * - Social proof -> uses only real reactions/comments/saves represented by
 *   available post data.
 * - Identity expression -> gives media-rich posts and player/team identity
 *   content a modest relevance boost.
 *
 * No signal should fabricate engagement, hide controls, or punish users for
 * not engaging. Keep ranking explainable and allow chronological/following
 * views alongside the personalized feed.
 */
export function scoreSocialPost(post: SocialFeedPost, context: FeedContext) {
  const now = context.now ?? Date.now();
  const ageHours = Math.max(0, (now - new Date(post.created_at).getTime()) / 3_600_000);
  const recency = Math.max(0, 1 - ageHours / 72);
  const reactionCount = post.reactions?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;
  const engagement = Math.min(1, (reactionCount * 0.035 + commentCount * 0.09));
  const following = post.author_id === context.userId ? 0.2 : context.following.includes(post.author_id) ? 0.34 : 0;
  const media = (post.media_urls?.length ?? 0) > 0 ? 0.08 : 0;

  const body = post.body.toLowerCase();
  const community =
    /804|richmond|rva|southside|northside|east end|west end|court|pickup|hooping|community/.test(body) ? 0.12 : 0;

  // Stable exploration value: changes every 30 minutes, but does not jump
  // randomly on every render. This creates discovery variety without making
  // the feed unpredictable in a way that overwhelms users.
  const bucket = Math.floor(now / 1_800_000);
  let hash = 2166136261;
  for (const char of `${post.id}:${bucket}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const exploration = ((hash >>> 0) / 4_294_967_295) * 0.16;

  return (
    recency * 0.34 +
    engagement * 0.20 +
    following +
    community +
    media +
    exploration
  );
}

export function rankSocialPosts(posts: SocialFeedPost[], context: FeedContext) {
  return [...posts]
    .map((post, index) => ({ post, index, score: scoreSocialPost(post, context) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ post }) => post);
}
