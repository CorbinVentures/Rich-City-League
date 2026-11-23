import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const section = (source: string, start: string, end: string) => {
  const startAt = source.indexOf(start);
  const endAt = source.indexOf(end, startAt + start.length);
  expect(startAt).toBeGreaterThanOrEqual(0);
  expect(endAt).toBeGreaterThan(startAt);
  return source.slice(startAt, endAt);
};

describe('SEO: transient public-data failures are not false 404s', () => {
  it('throws when a news article lookup is unavailable but keeps true missing slugs distinct', () => {
    const source = read('src/lib/public-data.ts');
    const lookup = section(source, 'export async function getNewsBySlug', 'export async function getLeagueSnapshot');
    expect(lookup).toContain("if (!client) throw new Error(");
    expect(lookup).toMatch(/if \(error\) \{[\s\S]*throw new Error\(/);
    expect(lookup).toContain('return (data ?? null) as PublicNews | null;');
  });

  it('throws on primary player and team lookup errors while retaining null for missing records', () => {
    const source = read('src/lib/public-data.ts');
    const team = section(source, 'export async function getTeamDetail', 'export async function getPlayerDetail');
    const player = section(source, 'export async function getPlayerDetail', 'export async function getSocialFeed');

    expect(team).toContain("if (!client) throw new Error(");
    expect(team).toMatch(/if \(teamError\) \{[\s\S]*throw new Error\(/);
    expect(team).toContain('if (!team) return null;');

    expect(player).toContain("if (!client) throw new Error(");
    expect(player).toMatch(/if \(playerError\) \{[\s\S]*throw new Error\(/);
    expect(player).toContain('if (!player) return null;');
  });

  it('uses strict core data checks on both game metadata and page rendering', () => {
    const source = read('src/lib/public-data.ts');
    const gamesPage = read('src/app/games/[id]/page.tsx');

    expect(source).toContain('getLeagueSnapshot(options: { strictCore?: boolean } = {})');
    expect(source).toContain('if (options.strictCore && coreError)');
    expect(gamesPage.match(/getLeagueSnapshot\(\{ strictCore: true \}\)/g)?.length).toBe(2);
  });
});
