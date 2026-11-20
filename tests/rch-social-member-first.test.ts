import { describe, expect, it } from 'vitest';
import { isRecentMemberPost } from '../src/lib/social-feed';
import { readFileSync } from 'node:fs';

const now = Date.parse('2026-11-20T12:00:00Z');
const post = (daysAgo: number, is_automated: boolean) => ({
  created_at: new Date(now - daysAgo * 86_400_000).toISOString(),
  is_automated,
});

describe('member-first social timeline', () => {
  it('elevates actual recent member contributions, not scheduled posts or old content', () => {
    expect(isRecentMemberPost(post(0, false), now)).toBe(true);
    expect(isRecentMemberPost(post(6, false), now)).toBe(true);
    expect(isRecentMemberPost(post(8, false), now)).toBe(false);
    expect(isRecentMemberPost(post(0, true), now)).toBe(false);
    expect(isRecentMemberPost({ created_at: 'invalid', is_automated: false }, now)).toBe(false);
    expect(isRecentMemberPost({ created_at: new Date(now+1000).toISOString(), is_automated: false }, now)).toBe(false);
  });

  it('retrieves human posts in their own candidate window and offers a member-only chronology', () => {
    const source = readFileSync('src/components/social/NetworkHome.tsx', 'utf8');
    expect(source).toContain("const [memberPostsResult, automatedPostsResult");
    expect(source).toContain(".eq('is_automated', false)");
    expect(source).toContain(".eq('is_automated', true)");
    expect(source).toContain("mode === 'latest' && item.post.is_automated !== false");
    expect(source).toContain("isRecentMemberPost(b.post, rankingNow)");
    expect(source).toContain("document.addEventListener('visibilitychange', refreshIfStale)");
  });
});
