import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scoreSocialPost } from '../src/lib/social-feed';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const now = Date.parse('2026-10-23T12:00:00.000Z');
const post = { id:'same-post', author_id:'hooper', created_at:'2026-10-23T11:00:00.000Z', body:'Basketball tonight in Norfolk.' };

describe('RCH PWA activation phase 1', () => {
  it('uses Pulse for manifest launch and authenticated installed home navigation', () => {
    expect(source('src/app/manifest.webmanifest/route.ts')).toContain("start_url: '/social?source=pwa'");
    expect(source('src/components/MemberHomeRedirect.tsx')).toContain("router.replace('/social')");
  });

  it('boosts the chosen city but not Richmond automatically', () => {
    const base = { following:[], now };
    expect(scoreSocialPost(post, {...base, cityName:'Norfolk'}))
      .toBeGreaterThan(scoreSocialPost(post, {...base, cityName:'Richmond'}));
    const richmondPost = { ...post, body:'Basketball tonight in Richmond.' };
    expect(scoreSocialPost(richmondPost, base)).toBe(scoreSocialPost(post, base));
    expect(scoreSocialPost(richmondPost, {...base, cityName:'Richmond'}))
      .toBeGreaterThan(scoreSocialPost(richmondPost, {...base, cityName:'Norfolk'}));
  });

  it('preserves Following and re-ranks For You when city selection changes', () => {
    const feed = source('src/components/social/NetworkHome.tsx');
    expect(feed).toContain("mode === 'following'");
    expect(feed).toContain('cityName:gravityCity?.name');
    expect(feed).toContain('gravityCity?.name]');
  });

  it('offers a dismissible first-device flow with real destinations', () => {
    const discovery = source('src/components/social/RCHFirstSessionDiscovery.tsx');
    expect(discovery).toContain('DISCOVERY_COMPLETE_KEY');
    expect(discovery).toContain('onClick={finish}');
    for (const route of ['/runs?view=list#rch-upcoming-runs','/clips','/discover']) {
      expect(discovery).toContain(route);
    }
  });

  it('separates live-event discovery from cinematic exploration', () => {
    const home = source('src/components/runs/RunsCinematicHome.tsx');
    expect(home).toContain('FIND A REAL RUN');
    expect(home).toContain('EXPLORE WORLD');
    expect(home).toContain('VIEW RUN DETAILS');
    expect(home).not.toContain("'PLAY NOW'");
  });
});
