import { describe, expect, it } from 'vitest';
import { safeMediaPreviewUrl, socialMediaError, socialMediaExtension } from '../src/lib/social-media';

describe('social draft media', () => {
  it.each(['text/html', 'image/svg+xml', 'application/javascript', '', 'constructor'])(
    'rejects unsupported or active media type %s', (type) => {
      expect(socialMediaError({ type, size: 100 })).not.toBeNull();
      expect(socialMediaExtension(type)).toBe('');
    },
  );

  it('accepts ordinary photos and videos and uses a type-derived extension', () => {
    expect(socialMediaError({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(socialMediaExtension('image/jpeg')).toBe('jpg');
    expect(socialMediaError({ type: 'video/mp4', size: 50 * 1024 * 1024 })).toBeNull();
    expect(socialMediaExtension('video/mp4')).toBe('mp4');
  });

  it('rejects empty and oversized media before preview or upload', () => {
    expect(socialMediaError({ type: 'image/png', size: 0 })).not.toBeNull();
    expect(socialMediaError({ type: 'video/mp4', size: 50 * 1024 * 1024 + 1 })).not.toBeNull();
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'https://example.com/photo.jpg', 'blob:javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4='])(
    'does not treat an arbitrary URL as a local draft preview: %s', (value) => {
      expect(safeMediaPreviewUrl(value)).toBeUndefined();
    },
  );

  it('allows only supported base64 media previews', () => {
    expect(safeMediaPreviewUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
  });
});
