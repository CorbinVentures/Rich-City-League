import { describe, expect, it } from 'vitest';
import { mixtapeOwnVideoUrl } from './rch-mixtapes';

describe('RCH Mixtape own media eligibility', () => {
  const member = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const origin = 'https://rch.supabase.co';
  const allowed = origin + '/storage/v1/object/public/media/' + member + '/posts/clip.mp4?version=2';

  it('accepts an authored, published first-party post upload', () => {
    expect(mixtapeOwnVideoUrl([allowed], member, origin)).toBe(allowed);
    expect(mixtapeOwnVideoUrl([origin + '/storage/v1/object/public/media/' + member + '/posts/clip.webm'], member, origin))
      .toContain('clip.webm');
  });

  it('never previews someone else\'s clip or an external CDN tracker', () => {
    expect(mixtapeOwnVideoUrl([allowed], other, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl(['https://external.example.com/storage/v1/object/public/media/' + member + '/posts/x.mp4'], member, origin))
      .toBe(null);
    expect(mixtapeOwnVideoUrl(['https://rch.supabase.co.evil.test/storage/v1/object/public/media/' + member + '/posts/x.mp4'], member, origin))
      .toBe(null);
  });

  it('excludes draft, signed, story, non-video, invalid and insecure media', () => {
    expect(mixtapeOwnVideoUrl([origin + '/storage/v1/object/sign/media/' + member + '/posts/x.mp4'], member, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl([origin + '/storage/v1/object/public/media/' + member + '/stories/x.mp4'], member, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl([origin + '/storage/v1/object/public/media/' + member + '/posts/x.jpg'], member, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl(['http://rch.supabase.co/storage/v1/object/public/media/' + member + '/posts/x.mp4'], member, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl(['javascript:alert(1).mp4'], member, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl(null, member, origin)).toBe(null);
    expect(mixtapeOwnVideoUrl([allowed], member)).toBe(null);
  });
});
