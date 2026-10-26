/** Mixtapes v1 may only replay member-authored public uploads, never arbitrary embed/tracker URLs. */
export function mixtapeOwnVideoUrl(media: unknown, ownerId: string, storageOrigin?: string): string | null {
  if (!Array.isArray(media) || !storageOrigin ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId)) return null;
  let trusted: URL;
  try { trusted = new URL(storageOrigin); } catch { return null; }
  if (trusted.protocol !== 'https:') return null;
  const prefix = '/storage/v1/object/public/media/' + ownerId.toLowerCase() + '/posts/';
  for (const candidate of media) {
    if (typeof candidate !== 'string') continue;
    try {
      const video = new URL(candidate);
      if (video.protocol === 'https:' && video.origin === trusted.origin &&
          video.pathname.toLowerCase().startsWith(prefix) &&
          /\.(mp4|webm|mov|m4v|ogv)$/i.test(video.pathname)) return candidate;
    } catch { /* Ignore unsupported media. */ }
  }
  return null;
}
