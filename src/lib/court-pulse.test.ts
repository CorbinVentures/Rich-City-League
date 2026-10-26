import { describe, expect, it } from 'vitest';
import { courtPulseImageUrl, courtPulseRunIds } from './court-pulse';

describe('Court Pulse media and source integrity', () => {
  it('only previews first-party published Supabase images, never arbitrary tracking media', () => {
    const origin = 'https://rch.supabase.co';
    const image = origin + '/storage/v1/object/public/media/run/photo.WEBP?quality=80';
    expect(courtPulseImageUrl([image], origin)).toBe(image);
    expect(courtPulseImageUrl([image])).toBe(null);
    expect(courtPulseImageUrl(['https://other.example.com/storage/v1/object/public/media/photo.jpg'], origin)).toBe(null);
    expect(courtPulseImageUrl([origin + '/storage/v1/object/sign/media/private.jpg'], origin)).toBe(null);
    expect(courtPulseImageUrl([origin + '/storage/v1/object/public/media/run/clip.mp4'], origin)).toBe(null);
    expect(courtPulseImageUrl(['javascript:alert(1).jpg'], origin)).toBe(null);
    expect(courtPulseImageUrl(null, origin)).toBe(null);
    expect(courtPulseImageUrl(['http://rch.supabase.co/storage/v1/object/public/media/photo.jpg'], origin)).toBe(null);
  });

  it('only includes unique valid Run IDs from database-shaped rows', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const second = '22222222-2222-4222-8222-222222222222';
    expect(courtPulseRunIds([{ id }, { id }, { id: second }, { id: 'not-a-uuid' }, null, {}, 'string'])).toEqual([id, second]);
    expect(courtPulseRunIds(undefined)).toEqual([]);
    expect(courtPulseRunIds({ id })).toEqual([]);
  });
});
