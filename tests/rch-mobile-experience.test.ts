import { describe, expect, it } from 'vitest';
import { isBrowserAccountRoute, isBrowserPublicRoute, isMobileStandaloneExperience, verifiedRCHApkUrl } from '../src/lib/rch-mobile-experience';

describe('RCH mobile app experience gate', () => {
  it.each(['/app', '/auth/sign-up', '/auth/sign-in', '/auth/complete-profile', '/auth/confirm', '/auth/update-password', '/legal/privacy', '/profile', '/member-access', '/command', '/command/access', '/account/security', '/account/security/'])(
    'allows account setup and installation in a normal browser: %s',
    path => expect(isBrowserAccountRoute(path)).toBe(true),
  );

  it.each(['/account', '/account/profile', '/account/security/device', '/admin', '/settings'])(
    'does not widen normal-browser access beyond the MFA enrollment screen: %s',
    path => expect(isBrowserAccountRoute(path)).toBe(false),
  );

  it.each(['/', '/social', '/messages', '/runs', '/league', '/admin', '/discover', '/today', '/notifications', '/profile/some-user'])(
    'keeps the full platform behind mobile PWA mode: %s',
    path => expect(isBrowserAccountRoute(path)).toBe(false),
  );

  it.each(['/', '/league', '/richmond-basketball-league', '/richmond-basketball-runs', '/runs', '/news', '/news/richmond-finals', '/players/player-id', '/teams/warriors', '/games/game-id', '/organizations', '/organizations/region/central-virginia', '/organizations/local-hoops', '/network/events/open-run', '/membership', '/register', '/discover', '/search', '/runs/open-run'])(
    'renders public information on the open web: %s',
    path => expect(isBrowserPublicRoute(path)).toBe(true),
  );

  it.each(['/app', '/social', '/messages', '/admin', '/account', '/settings', '/network/dashboard', '/profile/some-user', '/organizations/manage', '/teams/new', '/teams/warriors/edit', '/command', '/command/access', '/member-access'])(
    'keeps member tools and app-only pages outside the public browser allowlist: %s',
    path => expect(isBrowserPublicRoute(path)).toBe(false),
  );

  it('normalizes trailing slashes without opening app-only routes', () => {
    expect(isBrowserPublicRoute('/teams/warriors/')).toBe(true);
    expect(isBrowserPublicRoute('/')).toBe(true);
    expect(isBrowserPublicRoute('/admin/')).toBe(false);
    expect(isBrowserPublicRoute('/organizations/manage/')).toBe(false);
  });

  it('allows installed iOS and Android PWAs but not their browser tabs', () => {
    const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone' };
    const android = { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)', platform: 'Linux armv8l' };
    expect(isMobileStandaloneExperience({ ...iphone, standalone: true })).toBe(true);
    expect(isMobileStandaloneExperience({ ...android, standalone: true })).toBe(true);
    expect(isMobileStandaloneExperience({ ...iphone, standalone: false })).toBe(false);
    expect(isMobileStandaloneExperience({ ...android, standalone: false })).toBe(false);
  });

  it('allows an installed iPad web app, but not an installed desktop PWA', () => {
    expect(isMobileStandaloneExperience({ standalone: true, userAgent: 'Mozilla/5.0 Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isMobileStandaloneExperience({ standalone: true, userAgent: 'Mozilla/5.0 Macintosh', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(isMobileStandaloneExperience({ standalone: true, userAgent: 'Mozilla/5.0 Windows NT 10.0', platform: 'Win32' })).toBe(false);
  });

  it('only advertises HTTPS signed-package locations', () => {
    expect(verifiedRCHApkUrl('https://richcityhoops.com/rch.apk')).toBe('https://richcityhoops.com/rch.apk');
    expect(verifiedRCHApkUrl('http://example.com/rch.apk')).toBeNull();
    expect(verifiedRCHApkUrl('https://example.com/page')).toBeNull();
    expect(verifiedRCHApkUrl()).toBeNull();
  });
});
