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

export const SOCIAL_MEDIA_ACCEPT = Object.keys(mediaExtensions).join(',');

export function socialMediaError(file: { type: string; size: number }): string | null {
  if (!Object.prototype.hasOwnProperty.call(mediaExtensions, file.type)) {
    return 'Choose a JPG, PNG, GIF, WebP, AVIF, MP4, WebM, MOV, or Ogg file.';
  }
  if (file.size <= 0) return 'This file is empty. Please choose another file.';
  if (file.size > 50 * 1024 * 1024) return 'Media must be 50MB or smaller.';
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
