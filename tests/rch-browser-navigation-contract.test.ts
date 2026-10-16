import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isBrowserMemberRoute, isBrowserPublicRoute } from '../src/lib/rch-mobile-experience';
import { getBrowserPostAuthPath } from '../src/lib/auth-redirect';

const read = (p: string) => readFileSync(p, 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const pages = walk('src/app').filter(p => /\/page\.(tsx|ts|jsx|js)$/.test(p));
function routeForPage(file: string) {
  if (relative('src/app', file) === 'page.tsx') return '/';
  const route = relative('src/app', file)
    .replace(/\\/g, '/').replace(/\/page\.(tsx|ts|jsx|js)$/, '')
    .split('/').filter(segment => !/^\(.*\)$/.test(segment))
    .join('/');
  return '/' + route;
}
const routePatterns = pages.map(routeForPage).map(path => {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\[[^\]]+\\\]/g, '[^/]+');
  return new RegExp('^' + escaped + '/?$');
});
function targetExists(path: string) {
  const cleaned = path.split(/[?#]/)[0] || '/';
  return routePatterns.some(pattern => pattern.test(cleaned));
}
const importantFiles = [
  'src/components/RCHPublicWebShell.tsx',
  'src/components/RCHBrowserHomepage.tsx',
  'src/components/RCHPublicRouteGuide.tsx',
  'src/components/RCHBrowserMemberNotice.tsx',
  'src/components/RCHPulseMemberRedirect.tsx',
  'src/app/pulse/page.tsx',
  'src/app/coaches/page.tsx',
  'src/app/media/page.tsx',
  'src/app/crews/page.tsx',
  'src/app/membership/page.tsx',
  'src/app/community/page.tsx',
  'src/app/organizations/page.tsx',
];

describe('browser navigation route contract', () => {
  it('resolves every literal internal link on major public navigation surfaces', () => {
    const invalid: string[] = [];
    for (const file of importantFiles) {
      const source = read(file);
      const matches = [
        ...source.matchAll(/\bhref\s*=\s*["'](\/[^"']*)["']/g),
        ...source.matchAll(/\bhref\s*=\s*\{\s*["'](\/[^"']*)["']\s*\}/g),
      ];
      for (const match of matches) {
        const href = match[1];
        if (href.startsWith('/api/')) continue;
        if (!targetExists(href)) invalid.push(`${file}: ${href}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it('separates public SEO previews from authenticated web workspaces', () => {
    expect(isBrowserPublicRoute('/pulse')).toBe(true);
    expect(isBrowserPublicRoute('/social')).toBe(false);
    for (const path of [
      '/social', '/social/profile/me', '/social/post/123', '/messages',
      '/notifications', '/dashboard', '/my-hoops', '/professional',
      '/media/submit', '/league/royaltee/manage', '/admin/roles',
    ]) {
      expect(isBrowserMemberRoute(path), path).toBe(true);
      expect(getBrowserPostAuthPath(path), path).toBe(path);
    }
    expect(isBrowserMemberRoute('/social-engine')).toBe(false);
    expect(isBrowserMemberRoute('/messages-public')).toBe(false);
  });

  it('keeps browser and PWA layouts distinct while using actual member children', () => {
    const gate = read('src/components/RCHExperienceGate.tsx');
    expect(gate).toContain('isBrowserMemberRoute(pathname)');
    expect(gate).toContain('<BrowserMemberContent pathname={pathname}>{publicContent}</BrowserMemberContent>');
    expect(gate).toContain("mode === 'mobile-app'");
    expect(gate).toContain('<RCHPublicWebShell>');
    const shell = read('src/components/RCHPublicWebShell.tsx');
    expect(shell).toContain("href === '/pulse' ? '/social' : href");
    expect(shell).toContain("href={user ? '/social' : '/pulse'}");
  });

  it('does not send authenticated Pulse visitors to a fresh sign-up', () => {
    const pulse = read('src/app/pulse/page.tsx');
    const redirect = read('src/components/RCHPulseMemberRedirect.tsx');
    const link = read('src/components/RCHBrowserAccountLink.tsx');
    expect(pulse).toContain('<RCHPulseMemberRedirect />');
    expect(pulse).toContain('memberHref="/social"');
    expect(pulse).toContain('memberHref="/social?compose=1"');
    expect(pulse).toContain('memberHref={`/social?post=');
    expect(redirect).toContain("router.replace('/social')");
    expect(redirect).toContain('if (!installed)');
    expect(link).toContain('if (loading) return');
  });
});
