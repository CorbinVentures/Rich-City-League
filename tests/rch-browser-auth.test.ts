import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBrowserPostAuthPath } from '../src/lib/auth-redirect';

const read = (name: string) => readFileSync(name, 'utf8');

describe('RCH browser sign-in handoff regression', () => {
  it('lands a normal browser on its own public website after sign-in', () => {
    expect(getBrowserPostAuthPath(null)).toBe('/');
    expect(getBrowserPostAuthPath(undefined)).toBe('/');
    expect(getBrowserPostAuthPath('/')).toBe('/');
    expect(getBrowserPostAuthPath('/discover?area=richmond')).toBe('/discover?area=richmond');
  });

  it('opens real member pages in the signed-in browser instead of app-only notices', () => {
    expect(getBrowserPostAuthPath('/dashboard')).toBe('/dashboard');
    expect(getBrowserPostAuthPath('/today')).toBe('/today');
    expect(getBrowserPostAuthPath('/social?tab=following'))
      .toBe('/social?tab=following');
    expect(getBrowserPostAuthPath('/portal/scorebook'))
      .toBe('/portal/scorebook');
  });

  it('keeps unknown private routes at a safe informational page', () => {
    expect(getBrowserPostAuthPath('/unrecognized-private-route')).toBe('/member-access?next=%2Funrecognized-private-route');
  });

  it('preserves verified browser account, profile and command routes', () => {
    expect(getBrowserPostAuthPath('/profile')).toBe('/profile');
    expect(getBrowserPostAuthPath('/account/security?next=%2Fcommand')).toBe('/account/security?next=%2Fcommand');
    expect(getBrowserPostAuthPath('/command')).toBe('/command');
  });

  it.each(['/auth', '/auth/sign-in', '/auth/complete-profile', '/member-access?next=/social', '//evil.com', 'https://evil.com', '/\\\\evil.com'])(
    'rejects a blocked or unsafe post-login destination: %s',
    value => expect(getBrowserPostAuthPath(value)).toBe('/'),
  );

  it('does not change installed PWA destinations or member security checks', () => {
    const form = read('src/components/AuthForm.tsx');
    const callback = read('src/app/auth/callback/OAuthCallbackClient.tsx');
    const middleware = read('src/middleware.ts');
    expect(form).toContain("mobileApp ? '/dashboard' : '/'");
    expect(form).toContain("if (!mobileApp) destination = getBrowserPostAuthPath(destination, '/');");
    expect(callback).toContain("getSafePostAuthPath(requestedNext ?? '/social', '/today')");
    expect(callback).toContain("getBrowserPostAuthPath(requestedNext, '/')");
    expect(middleware).toContain('getAuthenticatorAssuranceLevel');
    expect(middleware).toContain("matchesRoute(pathname, '/command')");
  });

  it('renders browser session status and both sign-out controls without mounting PWA chrome', () => {
    const shell = read('src/components/RCHPublicWebShell.tsx');
    const notice = read('src/components/RCHBrowserMemberNotice.tsx');
    const css = read('src/app/rch-browser-sitewide.css');
    expect(shell).toContain('const { user, profile, loading: authLoading } = useAuth();');
    expect(shell).toContain('handleBrowserSignOut');
    expect(shell).toContain('My Profile');
    expect(shell).toContain('Sign out');
    expect(shell).not.toContain('<PlatformChrome');
    expect(notice).toContain('You are signed in to Rich City Hoops.');
    expect(css).toContain('.rch-public-web .rch-public-mobile-drawer-actions button');
    expect(css).not.toContain('.rcl-universal-bottom');
  });
});
