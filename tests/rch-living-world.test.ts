import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildWorldEvents, filterWorldEvents } from '../src/lib/living-world';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const NOW = Date.parse('2026-10-17T18:00:00Z');

describe('RCH Living World', () => {
  const feed = buildWorldEvents({
    now: NOW,
    territories: [{ court_slug: 'rockwood', crew_id: 'crew-1', since_at: '2026-10-16T19:00:00Z', successful_defenses: 2 }],
    challenges: [
      { id: 'challenge-1', court_slug: 'rockwood', challenger_crew_id: 'crew-2', defender_crew_id: 'crew-1', winning_crew_id: 'crew-2', status: 'resolved', created_at: '2026-10-16T15:00:00Z', resolved_at: '2026-10-17T13:00:00Z', run_id: 'run-1' },
      { id: 'challenge-2', court_slug: 'park-2', challenger_crew_id: 'crew-2', defender_crew_id: 'crew-1', winning_crew_id: null, status: 'requested', created_at: '2026-10-17T14:00:00Z', resolved_at: null, run_id: 'run-2' },
    ],
    highlights: [
      { id: 'post-1', author_id: 'author-1', body: 'Big highlights!', media_urls: ['https://example.org/hoops.jpg'], created_at: '2026-10-17T16:00:00Z' },
      { id: 'text-only', author_id: 'author-1', body: 'No highlights here', media_urls: [], created_at: '2026-10-17T17:00:00Z' },
    ],
    runs: [
      { id: 'run-1', title: '3v3 Saturday', game_format: '3v3', location: 'Richmond', location_slug: 'rockwood', starts_at: '2026-10-18T16:00:00Z', status: 'open' },
      { id: 'cancelled', title: 'Cancelled Run', game_format: '1v1', location: 'Richmond', location_slug: null, starts_at: '2026-10-18T16:00:00Z', status: 'cancelled' },
    ],
    courtNames: { rockwood: 'Rockwood Park · Chesterfield', 'park-2': 'Brown Court · Richmond' },
    crewNames: { 'crew-1': 'Southside', 'crew-2': 'Northside' },
    authorNames: { 'author-1': 'Jordan' },
  });

  it('uses only supplied recorded and eligible source records', () => {
    expect(feed).toHaveLength(5);
    expect(feed.map(e => e.id)).not.toContain('post-text-only');
    expect(feed.map(e => e.id)).not.toContain('run-cancelled');
    expect(feed.filter(e => e.category === 'runs')).toHaveLength(1);
  });
  it('does not misrepresent a pending challenge or user post as independently verified', () => {
    expect(feed.find(e => e.id === 'challenge-challenge-2')?.label).toBe('Crew challenge');
    expect(feed.find(e => e.id === 'challenge-challenge-2')?.description).toContain('not yet accepted');
    expect(feed.find(e => e.id === 'post-post-1')?.label).toContain('not game-verified');
    expect(feed.find(e => e.id === 'challenge-challenge-1')?.label).toBe('Verified takeover');
  });
  it('sorts recorded activity newest first and scheduled Runs later', () => {
    expect(feed[0].id).toBe('post-post-1');
    expect(feed.at(-1)?.id).toBe('run-run-1');
  });
  it('filters by section and explicit city without silently removing all statewide results', () => {
    expect(filterWorldEvents(feed, 'territory', 'chesterfield', true).map(e => e.id)).toEqual(['challenge-challenge-1', 'court-rockwood']);
    expect(filterWorldEvents(feed, 'all', 'richmond', false)).toHaveLength(5);
  });
  it('is a separate, visibly linked surface while preserving the existing Runs and REP implementations', () => {
    const page = read('src/app/world/page.tsx');
    const memberNav = read('src/lib/member-navigation.ts');
    const social = read('src/components/social/NetworkHome.tsx');
    expect(page).toContain("getSupabaseClient(true)");
    expect(page).toContain("rch_rep_wallets");
    expect(page).toContain("rch_run_badge_awards");
    expect(page).toContain("No simulated wins");
    expect(memberNav).toContain("href:'/world'");
    expect(read('src/lib/rch-mobile-experience.ts')).toContain("'/world'");
    expect(read('src/components/RCHPublicWebShell.tsx')).toContain("href: '/world'");
    expect(social).not.toContain('rch-pulse-world-link');
    expect(read('src/lib/rcl-navigation.ts')).toContain("href:'/world'");
    expect(read('src/components/rep/RepExchangeClient.tsx')).toContain("rch_buy_rep_reward");
    expect(read('src/app/runs/page.tsx')).toContain("<CourtDominion initialCourt=");
  });
});
