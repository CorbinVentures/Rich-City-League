import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('SEO robots and noindex alignment', () => {
  it('uses the www canonical host in Richmond basketball structured data', () => {
    const page = read('src/app/richmond-basketball-league/page.tsx');
    expect(page).toContain("url:'https://www.richcityhoops.com/richmond-basketball-league'");
    expect(page).not.toContain("url:'https://richcityhoops.com/richmond-basketball-league'");
  });

  it('allows crawlers to read noindex metadata on linked auth and account routes', () => {
    const robots = read('src/app/robots.ts');

    for (const blockedPath of ["'/auth/'", "'/account/'", "'/profile'"]) {
      expect(robots).not.toContain(blockedPath);
    }

    for (const layoutPath of [
      'src/app/auth/layout.tsx',
      'src/app/account/layout.tsx',
      'src/app/profile/layout.tsx',
    ]) {
      expect(read(layoutPath)).toContain('index: false');
    }
  });

  it('allows crawlers to read noindex metadata on member-access and client-rendered communities', () => {
    const robots = read('src/app/robots.ts');

    expect(robots).not.toContain("'/member-access'");
    expect(robots).not.toContain("'/communities'");
    expect(read('src/app/member-access/layout.tsx')).toContain('index: false');
    expect(read('src/app/communities/layout.tsx')).toContain('robots: { index: false, follow: true, noarchive: true }');
  });

  it('keeps unrelated member-only areas disallowed', () => {
    const robots = read('src/app/robots.ts');
    expect(robots).toContain("'/dashboard'");
    expect(robots).toContain("'/social'");
    expect(robots).toContain("'/settings/'");
  });
});
