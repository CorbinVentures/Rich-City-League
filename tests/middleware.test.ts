import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let sessionUser: { id:string } | null = null;
let sessionProfile: { role:string; is_active:boolean; onboarding_complete?:boolean } | null = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: sessionUser } }),
    },
    from: (table:string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table in middleware test: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: sessionProfile, error: null }),
          }),
        }),
      };
    },
  }),
}));

import { middleware } from '../src/middleware';
import { getSafeNextPath, getSafePostAuthPath } from '../src/lib/auth-redirect';

describe('public launch middleware', () => {
  beforeEach(() => {
    sessionUser = null;
    sessionProfile = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it.each([
    '/', '/league', '/players', '/teams', '/schedule', '/games', '/standings', '/stats', '/rankings',
    '/news', '/media', '/about', '/network', '/organizations', '/organizations/region/central-virginia',
    '/organizations/rich-city-league', '/organizations/example/claim', '/network/partners', '/network/partners/apply',
    '/network/events/example-event', '/runs', '/shop',
  ])('keeps public launch route %s reachable anonymously', async (pathname) => {
    const response = await middleware(new NextRequest(`http://localhost${pathname}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it.each([
    '/dashboard', '/portal/profile', '/portal/operations', '/portal/team', '/portal/scorebook', '/admin',
    '/account', '/profile', '/messages', '/notifications', '/settings/notifications', '/orders',
    '/network/dashboard', '/network/dashboard/profile', '/friends', '/connections', '/social', '/communities',
    '/missions', '/fantasy', '/pickem',
  ])('sends anonymous private route %s to member access', async (pathname) => {
    const response = await middleware(new NextRequest(`http://localhost${pathname}`));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('next')).toBe(pathname);
  });

  it('allows a signed-in active member into private member routes', async () => {
    sessionUser = { id: 'player-user' };
    sessionProfile = { role: 'player', is_active: true, onboarding_complete: true };
    const response = await middleware(new NextRequest('http://localhost/dashboard'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('does not force incomplete identities through onboarding while browsing public pages', async () => {
    sessionUser = { id: 'oauth-user' };
    sessionProfile = { role: 'fan', is_active: true, onboarding_complete: false };
    const response = await middleware(new NextRequest('http://localhost/organizations'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends an incomplete social identity to onboarding when entering a member workspace', async () => {
    sessionUser = { id: 'oauth-user' };
    sessionProfile = { role: 'fan', is_active: true, onboarding_complete: false };
    const response = await middleware(new NextRequest('http://localhost/social?tab=network'));
    const location = new URL(response.headers.get('location')!);
    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/auth/complete-profile');
    expect(location.searchParams.get('next')).toBe('/social?tab=network');
  });

  it('keeps authentication and onboarding pages public', async () => {
    for (const pathname of ['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/complete-profile', '/legal/privacy', '/member-access', '/access']) {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('sends a signed-in account without an RCL profile to profile setup only for private routes', async () => {
    sessionUser = { id: 'new-user' };
    sessionProfile = null;

    const publicResponse = await middleware(new NextRequest('http://localhost/league?view=season'));
    expect(publicResponse.status).toBe(200);

    const privateResponse = await middleware(new NextRequest('http://localhost/dashboard?view=season'));
    const location = new URL(privateResponse.headers.get('location')!);
    expect(privateResponse.status).toBe(307);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('profile')).toBe('1');
    expect(location.searchParams.get('next')).toBe('/dashboard?view=season');
  });

  it('keeps profile setup reachable for a signed-in account without a profile', async () => {
    sessionUser = { id: 'new-user' };
    sessionProfile = null;
    const response = await middleware(new NextRequest('http://localhost/profile'));
    expect(response.status).toBe(200);
  });

  it('blocks inactive accounts from private workspaces but not public discovery', async () => {
    sessionUser = { id: 'inactive-user' };
    sessionProfile = { role: 'fan', is_active: false, onboarding_complete: true };

    const publicResponse = await middleware(new NextRequest('http://localhost/network'));
    expect(publicResponse.status).toBe(200);

    const privateResponse = await middleware(new NextRequest('http://localhost/social'));
    const location = new URL(privateResponse.headers.get('location')!);
    expect(privateResponse.status).toBe(307);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('inactive')).toBe('1');
  });

  it.each(['/portal/scorebook', '/portal/team', '/portal/operations'])(
    'keeps fan accounts out of operator workspace %s',
    async (pathname) => {
      sessionUser = { id: 'fan-user' };
      sessionProfile = { role: 'fan', is_active: true, onboarding_complete: true };
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/league');
    },
  );

  it('allows a coach into team and scorebook workspaces', async () => {
    sessionUser = { id: 'coach-user' };
    sessionProfile = { role: 'coach', is_active: true, onboarding_complete: true };
    for (const pathname of ['/portal/team', '/portal/scorebook']) {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(200);
    }
  });

  it('keeps non-admin members out of admin routes', async () => {
    sessionUser = { id: 'coach-user' };
    sessionProfile = { role: 'coach', is_active: true, onboarding_complete: true };
    const response = await middleware(new NextRequest('http://localhost/admin/network/acquisition'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/league');
  });

  it('allows an admin into admin routes', async () => {
    sessionUser = { id: 'admin-user' };
    sessionProfile = { role: 'admin', is_active: true, onboarding_complete: true };
    const response = await middleware(new NextRequest('http://localhost/admin/network/acquisition'));
    expect(response.status).toBe(200);
  });

  it.each(['/manifest.webmanifest', '/sw.js', '/favicon.svg', '/icons/rcl-app-180.png', '/opengraph-image'])(
    'keeps public asset %s reachable anonymously',
    async (pathname) => {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    },
  );

  it('keeps public pages reachable when authentication configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await middleware(new NextRequest('http://localhost/organizations'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('returns 503 for private pages when authentication configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await middleware(new NextRequest('http://localhost/network/dashboard'));
    expect(response.status).toBe(503);
  });

  it('preserves an internal route and query in the member access redirect', async () => {
    const response = await middleware(new NextRequest('http://localhost/portal/operations?view=queue'));
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('next')).toBe('/portal/operations?view=queue');
  });

  it.each(['https://evil-site.com', '//evil-site.com', 'javascript:alert(1)', '/\\evil-site.com'])(
    'auth redirect helper rejects unsafe next destination %s',
    (next) => {
      expect(getSafeNextPath(next)).toBe('/dashboard');
    },
  );

  it('auth redirect helper preserves a trusted internal query string', () => {
    expect(getSafeNextPath('/portal/operations?view=queue')).toBe('/portal/operations?view=queue');
  });

  it.each(['/member-access', '/member-access?next=/social', '/access', '/auth/sign-in', '/auth/complete-profile?next=/social'])(
    'post-auth redirect helper rejects loop destination %s',
    (next) => {
      expect(getSafePostAuthPath(next, '/today')).toBe('/today');
    },
  );

  it('post-auth redirect helper preserves a trusted member path', () => {
    expect(getSafePostAuthPath('/messages?thread=123', '/today')).toBe('/messages?thread=123');
  });
});
