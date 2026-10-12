/** Only published direct-video media should be placed in RCH Clips; never iframe/embed URLs. */
export function isRchClipVideoUrl(candidate: unknown): candidate is string {
  if (typeof candidate !== 'string') return false;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && /\.(?:mp4|webm|mov|m4v|ogv)$/i.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
}

export function pickRchClipUrl(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  const candidate = media.find(isRchClipVideoUrl);
  return candidate || null;
}

export type ClipSortMode = 'for-you' | 'following' | 'trending';
export type RankedClip = { id: string; author_id: string; reaction_count: number; comment_count: number; created_at: string };

/** Chronology remains available; trending only considers real platform engagement. */
export function rankRchClips<T extends RankedClip>(clips: T[], mode: ClipSortMode, follows: string[], viewerId?: string) {
  const eligible = mode === 'following' ? clips.filter((clip) => follows.includes(clip.author_id) || clip.author_id === viewerId) : clips;
  if (mode !== 'trending') return [...eligible].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return [...eligible].sort((a, b) =>
    (b.reaction_count + b.comment_count * 2) - (a.reaction_count + a.comment_count * 2) ||
    Date.parse(b.created_at) - Date.parse(a.created_at)
  );
}
