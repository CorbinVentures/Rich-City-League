/**
 * RCH TV stores uploads as relative paths in the public "media" bucket.
 * Never send a raw bucket path to a browser image/video element.
 */
export function resolveRchMediaUrl(
  path: string | null | undefined,
  getPublicUrl: (path: string) => string,
): string | null {
  const value = path?.trim();
  if (!value) return null;

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
