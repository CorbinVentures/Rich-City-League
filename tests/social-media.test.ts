import { describe, expect, it } from 'vitest';
import {
  safeMediaPreviewUrl,
  socialMediaCollectionError,
  socialMediaError,
  socialMediaExtension,
  socialMediaKind,
} from '../src/lib/social-media';

describe('social draft media', () => {
  it.each(['text/html', 'image/svg+xml', 'application/javascript', '', 'constructor'])(
    'rejects unsupported or active media type %s', (type) => {
      expect(socialMediaError({ type, size: 100 })).not.toBeNull();
      expect(socialMediaExtension(type)).toBe('');
      expect(socialMediaKind(type)).toBe('unsupported');
    },
  );

  it('accepts ordinary photos and videos and uses a type-derived extension', () => {
    expect(socialMediaError({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(socialMediaExtension('image/jpeg')).toBe('jpg');
    expect(socialMediaKind('image/jpeg')).toBe('image');
    expect(socialMediaError({ type: 'video/mp4', size: 50 * 1024 * 1024 })).toBeNull();
    expect(socialMediaExtension('video/mp4')).toBe('mp4');
    expect(socialMediaKind('video/mp4')).toBe('video');
  });

  it('uses tighter photo limits while preserving the current storage-safe clip limit', () => {
    expect(socialMediaError({ type: 'image/png', size: 15 * 1024 * 1024 })).toBeNull();
    expect(socialMediaError({ type: 'image/png', size: 15 * 1024 * 1024 + 1 })).toContain('15MB');
    expect(socialMediaError({ type: 'video/mp4', size: 50 * 1024 * 1024 + 1 })).toContain('50MB');
  });

  it('rejects empty and invalid media collections before upload', () => {
    expect(socialMediaError({ type: 'image/png', size: 0 })).not.toBeNull();
    expect(socialMediaCollectionError([
      { type: 'image/jpeg', size: 1024 },
      { type: 'video/mp4', size: 1024 },
    ])).toContain('either one video clip or a set of photos');
    expect(socialMediaCollectionError([
      { type: 'video/mp4', size: 1024 },
      { type: 'video/mp4', size: 1024 },
    ])).toContain('one video clip');
  });

  it('allows up to ten photos in a single post', () => {
    const ten = Array.from({ length: 10 }, () => ({ type: 'image/jpeg', size: 1024 }));
    const eleven = Array.from({ length: 11 }, () => ({ type: 'image/jpeg', size: 1024 }));
    expect(socialMediaCollectionError(ten)).toBeNull();
    expect(socialMediaCollectionError(eleven)).toContain('10 photos');
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
