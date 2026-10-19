import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(path, 'utf8');
}

describe('public RCH search and Instagram discovery contract', () => {
  it('connects official Instagram identity to the public website', () => {
    expect(source('src/app/layout.tsx')).toContain("sameAs:['https://www.instagram.com/richcityhoops/']");
    expect(source('src/components/RCHPublicWebShell.tsx')).toContain('https://www.instagram.com/richcityhoops/');
  });

  it('targets statewide pickup basketball without blocking public discovery routes', () => {
    expect(source('src/app/page.tsx')).toContain('Virginia Basketball Runs & Leagues');
    expect(source('src/app/runs/layout.tsx')).toContain('pickup basketball runs in Richmond and across Virginia');
    expect(source('src/app/robots.ts')).not.toContain("'/runs',");
    expect(source('src/app/sitemap.ts')).toContain("['/runs',1,'daily']");
  });

  it('preserves the homepage canonical and free signup path', () => {
    expect(source('src/app/page.tsx')).toContain("alternates:{canonical:'/'}");
    expect(source('src/app/richmond-basketball-runs/page.tsx')).toContain('href="/auth/sign-up"');
  });
});
