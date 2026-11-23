import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const pages = [
  { path: 'src/app/join/players/page.tsx', canonical: '/join/players', intent: 'pickup basketball runs' },
  { path: 'src/app/join/fans/page.tsx', canonical: '/join/fans', intent: 'Virginia basketball players' },
  { path: 'src/app/join/coaches/page.tsx', canonical: '/join/coaches', intent: 'basketball athletes' },
  { path: 'src/app/join/creators/page.tsx', canonical: '/join/creators', intent: 'basketball highlights' },
  { path: 'src/app/join/organizations/page.tsx', canonical: '/join/organizations', intent: 'basketball organization' },
];

describe('Weekly SEO: audience landing metadata', () => {
  it('uses distinct, audience-specific search descriptions', () => {
    const descriptions = pages.map(({ path, canonical, intent }) => {
      const source = read(path);
      const title = source.match(/title: '([^']+)'/)?.[1];
      const description = source.match(/description: '([^']+)'/)?.[1];

      expect(title).toBeTruthy();
      expect(title).not.toContain('Rich City Hoops');
      expect(description).toContain(intent);
      expect(source).toContain(`canonical: '${canonical}'`);
      expect(source).toContain(`url: '${canonical}'`);
      expect(source).toContain(`title: '${title}'`);
      expect(source).toContain(`description: '${description}'`);
      return description;
    });

    expect(new Set(descriptions).size).toBe(pages.length);
  });
});
