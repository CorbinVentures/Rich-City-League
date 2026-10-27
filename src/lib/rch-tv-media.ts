/**
 * RCH TV stores uploads as relative paths in the public "media" bucket.
 * Never send a raw bucket path to a browser image/video element.
 */
export const RCH_TV_VIDEO_BUCKET = 'rch-tv-videos';
export const RCH_TV_VIDEO_STORAGE_PREFIX = 'rch-tv-videos:';

export function resolveRchMediaUrl(
  path: string | null | undefined,
  getPublicUrl: (path: string) => string,
  getRchTvPublicUrl?: (path: string) => string,
): string | null {
  const value = path?.trim();
  if (!value) return null;

  if (value.startsWith(RCH_TV_VIDEO_STORAGE_PREFIX)) {
    const objectPath = value.slice(RCH_TV_VIDEO_STORAGE_PREFIX.length);
    if (!getRchTvPublicUrl || !/^[a-f0-9-]{36}\/rch-tv\/[a-f0-9-]{36}\.(?:mp4|webm)$/i.test(objectPath)) return null;
    return getRchTvPublicUrl(objectPath);
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
      return null;
    }
  }
  // Do not accidentally accept javascript:/data: URLs or traverse out of the bucket.
  const cleaned = value.replace(/^\/+/, '');
  if (!cleaned || cleaned.startsWith('storage/') || cleaned.split('/').some((part) => part === '..' || part === '.')
    || /^[a-z][a-z\d+.-]*:/i.test(cleaned)) return null;
  return getPublicUrl(cleaned);
}

export function rchMediaKind(mediaType: string | null | undefined): 'image' | 'video' | 'audio' | 'file' {
  const kind = (mediaType || '').trim().toLowerCase();
  if (kind === 'image' || kind.startsWith('image/')) return 'image';
  if (kind === 'video' || kind.startsWith('video/')) return 'video';
  if (kind === 'audio' || kind.startsWith('audio/')) return 'audio';
  return 'file';
}
