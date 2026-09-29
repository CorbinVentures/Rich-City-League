const mediaExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/ogg': 'ogv',
};

const MB = 1024 * 1024;
export const SOCIAL_IMAGE_MAX_BYTES = 15 * MB;
export const SOCIAL_VIDEO_MAX_BYTES = 50 * MB;
export const SOCIAL_MAX_IMAGES = 10;

export const SOCIAL_MEDIA_ACCEPT = Object.keys(mediaExtensions).join(',');
export const SOCIAL_IMAGE_ACCEPT = Object.keys(mediaExtensions).filter((type) => type.startsWith('image/')).join(',');
export const SOCIAL_VIDEO_ACCEPT = Object.keys(mediaExtensions).filter((type) => type.startsWith('video/')).join(',');

export type SocialMediaKind = 'image' | 'video' | 'unsupported';

export function socialMediaKind(type: string): SocialMediaKind {
  if (!Object.prototype.hasOwnProperty.call(mediaExtensions, type)) return 'unsupported';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  return 'unsupported';
}

export function socialMediaError(file: { type: string; size: number }): string | null {
  const kind = socialMediaKind(file.type);
  if (kind === 'unsupported') {
    return 'Choose a JPG, PNG, GIF, WebP, AVIF, MP4, WebM, MOV, or Ogg file.';
  }
  if (file.size <= 0) return 'This file is empty. Please choose another file.';
  if (kind === 'image' && file.size > SOCIAL_IMAGE_MAX_BYTES) return 'Photos must be 15MB or smaller.';
  if (kind === 'video' && file.size > SOCIAL_VIDEO_MAX_BYTES) return 'Video clips must be 50MB or smaller.';
  return null;
}

export function socialMediaCollectionError(files: ArrayLike<{ type: string; size: number }>): string | null {
  const items = Array.from(files);
  if (!items.length) return null;

  for (const file of items) {
    const issue = socialMediaError(file);
    if (issue) return issue;
  }

  const kinds = new Set(items.map((file) => socialMediaKind(file.type)));
  if (kinds.size > 1) return 'Choose either one video clip or a set of photos for each post.';
  if (kinds.has('video') && items.length > 1) return 'Upload one video clip at a time. You can add a caption and link with it.';
  if (kinds.has('image') && items.length > SOCIAL_MAX_IMAGES) return `Choose up to ${SOCIAL_MAX_IMAGES} photos per post.`;
  return null;
}

export function socialMediaExtension(type: string): string {
  return Object.prototype.hasOwnProperty.call(mediaExtensions, type) ? mediaExtensions[type] : '';
}

/** Only allow a browser-generated base64 preview for a supported media type. */
export function safeMediaPreviewUrl(value: string): string | undefined {
  return /^data:(?:image\/(?:jpeg|png|gif|webp|avif)|video\/(?:mp4|webm|quicktime|ogg));base64,[A-Za-z0-9+/]*={0,2}$/.test(value)
    ? value
    : undefined;
}

export function readMediaPreview(file: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
