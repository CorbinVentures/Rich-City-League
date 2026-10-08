import { describe, expect, it } from 'vitest';
import { isBrowserAccountRoute, isMobileStandaloneExperience, verifiedRCHApkUrl } from '../src/lib/rch-mobile-experience';

describe('RCH mobile app experience gate', () => {
  it.each(['/app', '/auth/sign-up', '/auth/sign-in', '/auth/complete-profile', '/auth/confirm', '/auth/update-password', '/legal/privacy', '/profile'])(
    'allows account setup and installation in a normal browser: %s',
    path => expect(isBrowserAccountRoute(path)).toBe(true),
  );

  it.each(['/', '/social', '/messages', '/runs', '/league', '/admin', '/discover', '/today', '/notifications', '/profile/some-user'])(
    'keeps the full platform behind mobile PWA mode: %s',
    path => expect(isBrowserAccountRoute(path)).toBe(false),
  );

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
