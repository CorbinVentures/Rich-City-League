import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isBrowserAccountRoute, isBrowserPublicRoute, isMobileStandaloneExperience } from '../src/lib/rch-mobile-experience';

const read = (path: string) => readFileSync(path, 'utf8');

describe('RCH public browser visual authority and route isolation', () => {
  it('loads browser-only sitewide design after all home and installed-app styles', () => {
    const layout = read('src/app/layout.tsx');
    const old = layout.indexOf("import './rch-public-theme.css';");
    const home = layout.indexOf("import './rch-browser-home.css';");
    const sitewide = layout.indexOf("import './rch-browser-sitewide.css';");
    expect(home).toBeGreaterThan(old);
    expect(sitewide).toBeGreaterThan(home);
    const css = read('src/app/rch-browser-sitewide.css');
    expect(css).toContain('.rcl-platform-root.rch-public-web');
    expect(css).toContain('.rch-browser-route-guide');
    expect(css).toContain('.rch-browser-member-notice');
    expect(css).toContain('.rch-scene-search-input');
    expect(css).not.toContain('.rcl-universal-bottom');
    expect(css).not.toContain('body.rch-premium-app .rcl-platform-root :');
  });

  it('shows exactly one branded public browser shell, including contextual discovery', () => {
    const shell = read('src/components/RCHPublicWebShell.tsx');
    const nav = read('src/components/RCHPublicRouteGuide.tsx');
    expect(shell).toContain('rcl-platform-root rch-public-web');
    expect(shell).toContain('<RCHPublicRouteGuide />');
    expect(shell).toContain('rch-public-header');
    expect(shell).toContain('rch-public-footer');
    expect(shell).toContain('rch-browser-web-to-app');
    expect(nav).toContain("pathname === '/' || pathname === '/pulse'");
    expect(shell).not.toContain('SiteHeader');
    expect(shell).not.toContain('<PlatformChrome');
    expect(shell).not.toContain('rcl-universal-bottom');
  });

  it('preserves installed mobile app routing and isolates all normal-browser content', () => {
    const gate = read('src/components/RCHExperienceGate.tsx');
    expect(gate).toContain("mode === 'mobile-app'");
    expect(gate).toContain('<RCHPublicWebShell>{publicContent}</RCHPublicWebShell>');
    expect(gate).toContain('<RCHBrowserMemberNotice pathname={pathname}/>');
    expect(gate).toContain("pathname.startsWith('/auth/')");
    expect(gate).toContain("pathname === '/member-access'");
    expect(gate).not.toContain('RCHAppDownload');
    expect(isMobileStandaloneExperience({ standalone: true, userAgent: 'Mozilla/5.0 iPhone', platform: 'iPhone' })).toBe(true);
    expect(isMobileStandaloneExperience({ standalone: false, userAgent: 'Mozilla/5.0 iPhone', platform: 'iPhone' })).toBe(false);
    expect(isBrowserAccountRoute('/command')).toBe(true);
  });

  it.each([
    '/', '/app', '/legal', '/legal/privacy', '/legal/terms', '/legal/cookies',
    '/discover', '/runs', '/runs/unique-id', '/league', '/league/royaltee',
    '/league/royaltee/join', '/news', '/news/story-id', '/search', '/pulse',
    '/players', '/players/player-id', '/players/player-id/passport', '/players/compare',
    '/coaches', '/coaches/coach-id', '/teams/team-id', '/seasons',
    '/seasons/season-id', '/divisions', '/standings', '/stats', '/games',
    '/media', '/media/creators', '/media/creators/apply', '/commonwealth',
    '/crews', '/communities', '/city', '/legacy', '/fans/member-name',
    '/shop', '/shop/product-id', '/network/events/event-id', '/organizations/org-id',
  ])('keeps read-only or guest-action basketball navigation public: %s', path => {
    expect(isBrowserPublicRoute(path)).toBe(true);
  });

  it.each([
    '/social', '/legal/account', '/social/profile/private-id', '/messages', '/notifications',
    '/admin', '/admin/operations', '/command', '/dashboard', '/today',
    '/professional', '/account', '/settings/privacy', '/profile/admin',
    '/communities/members-only', '/media/creators/dashboard',
    '/sponsors/dashboard', '/network/dashboard', '/league/royaltee/manage',
    '/league/royaltee/dashboard', '/teams/new', '/organizations/org-id/claim',
    '/portal/scorebook', '/runs/run-id/highlight', '/coaches/scouting', '/coaches/join',
  ])('does not accidentally expose account data through guest browser routing: %s', path => {
    expect(isBrowserPublicRoute(path)).toBe(false);
  });

  it('keeps publicly navigated guest pages free from member-only redirection logic', () => {
    const redirect = read('src/components/MemberHomeRedirect.tsx');
    const shell = read('src/components/RCHPublicWebShell.tsx');
    expect(redirect).toContain('isMobileStandaloneExperience');
    expect(shell).toContain('aria-current');
    expect(shell).toContain('Join Free');
  });
});
