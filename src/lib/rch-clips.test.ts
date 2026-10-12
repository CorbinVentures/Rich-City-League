import { describe, expect, it } from 'vitest';
import { isRchClipVideoUrl, pickRchClipUrl, rankRchClips } from './rch-clips';

describe('RCH Clips media safety', () => {
  it('only plays HTTPS direct-video media', () => {
    expect(isRchClipVideoUrl('https://cdn.example.com/media/clip.MP4?token=abc')).toBe(true);
    expect(isRchClipVideoUrl('https://youtube.com/watch?v=123')).toBe(false);
    expect(isRchClipVideoUrl('javascript:alert(1).mp4')).toBe(false);
    expect(isRchClipVideoUrl('http://example.com/clip.mp4')).toBe(false);
  });
  it('selects videos from mixed media posts', () => {
    expect(pickRchClipUrl(['https://example.com/image.jpg', 'https://example.com/tape.webm'])).toBe('https://example.com/tape.webm');
    expect(pickRchClipUrl(['https://example.com/image.jpg'])).toBe(null);
    expect(pickRchClipUrl(null)).toBe(null);
  });
});

describe('RCH Clips feed sorting', () => {
  const clips = [
    { id: 'a', author_id: 'one', reaction_count: 1, comment_count: 1, created_at: '2026-10-10T10:00:00Z' },
    { id: 'b', author_id: 'two', reaction_count: 20, comment_count: 2, created_at: '2026-10-09T10:00:00Z' }
  ];
  it('keeps For You chronological', () => expect(rankRchClips(clips, 'for-you', []).map((p) => p.id)).toEqual(['a', 'b']));
  it('filters Following to real connections', () => expect(rankRchClips(clips, 'following', ['two']).map((p) => p.id)).toEqual(['b']));
  it('ranks Trending by real interactions', () => expect(rankRchClips(clips, 'trending', []).map((p) => p.id)).toEqual(['b', 'a']));
});
