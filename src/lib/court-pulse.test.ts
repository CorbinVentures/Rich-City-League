import { describe, expect, it } from 'vitest';
import { courtPulseImageUrl, courtPulseRunIds } from './court-pulse';

describe('Court Pulse media and source integrity', () => {
  it('uses HTTPS image assets only, without inventing thumbnails', () => {
    expect(courtPulseImageUrl(['https://cdn.example.com/run/photo.WEBP?quality=80'])).toBe('https://cdn.example.com/run/photo.WEBP?quality=80');
    expect(courtPulseImageUrl(['https://cdn.example.com/movie.mp4'])).toBe(null);
    expect(courtPulseImageUrl(['http://cdn.example.com/photo.jpg'])).toBe(null);
    expect(courtPulseImageUrl(['javascript:alert(1).jpg'])).toBe(null);
    expect(courtPulseImageUrl(null)).toBe(null);
    expect(courtPulseImageUrl(['https://cdn.example.com/video.mp4', 'https://cdn.example.com/photo.png'])).toBe('https://cdn.example.com/photo.png');
  });

  it('only includes unique valid Run IDs from database-shaped rows', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const second = '22222222-2222-4222-8222-222222222222';
    expect(courtPulseRunIds([{ id }, { id }, { id: second }, { id: 'not-a-uuid' }, null, {}, 'string'])).toEqual([id, second]);
    expect(courtPulseRunIds(undefined)).toEqual([]);
    expect(courtPulseRunIds({ id })).toEqual([]);
  });
});
