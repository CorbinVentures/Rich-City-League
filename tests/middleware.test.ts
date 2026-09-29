import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let sessionUser: { id:string } | null = null;
let sessionProfile: { role:string; is_active:boolean } | null = null;

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
import { getSafeNextPath } from '../src/lib/auth-redirect';

describe('member platform middleware', () => {
  beforeEach(() => {
    sessionUser = null;
    sessionProfile = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it.each(['/dashboard', '/portal/profile', '/portal/operations', '/league', '/players'])(
    'sends anonymous member route %s to the member access wall',
    async (pathname) => {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/member-access');
      expect(location.searchParams.get('next')).toBe(pathname);
    },
  );

  it('does not allow the retired preview cookie to bypass membership', async () => {
    const response = await middleware(new NextRequest('http://localhost/league', {
      headers: { cookie: 'rcl_preview_access=rcl-beta-2026' },
    }));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/member-access');
  });

  it('allows an authenticated active member profile to continue', async () => {
    sessionUser = { id: 'player-user' };
    sessionProfile = { role: 'player', is_active: true };
    const response = await middleware(new NextRequest('http://localhost/dashboard'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends a signed-in account without an RCL profile to profile setup', async () => {
    sessionUser = { id: 'new-user' };
    sessionProfile = null;
    const response = await middleware(new NextRequest('http://localhost/league?view=season'));
    const location = new URL(response.headers.get('location')!);
    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('profile')).toBe('1');
    expect(location.searchParams.get('next')).toBe('/league?view=season');
  });

  it('keeps profile setup reachable for a signed-in account without a profile', async () => {
    sessionUser = { id: 'new-user' };
    sessionProfile = null;
    const response = await middleware(new NextRequest('http://localhost/profile'));
    expect(response.status).toBe(200);
  });

  it('blocks an inactive member profile', async () => {
    sessionUser = { id: 'inactive-user' };
    sessionProfile = { role: 'fan', is_active: false };
    const response = await middleware(new NextRequest('http://localhost/social'));
    const location = new URL(response.headers.get('location')!);
    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('inactive')).toBe('1');
  });

  it.each(['/portal/scorebook', '/portal/team', '/portal/operations'])(
    'keeps fan accounts out of operator workspace %s',
    async (pathname) => {
      sessionUser = { id: 'fan-user' };
      sessionProfile = { role: 'fan', is_active: true };
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get('location')!).pathname).toBe('/league');
    },
  );

  it('allows a coach into team and scorebook workspaces', async () => {
    sessionUser = { id: 'coach-user' };
    sessionProfile = { role: 'coach', is_active: true };
    for (const pathname of ['/portal/team', '/portal/scorebook']) {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(200);
    }
  });

  it('keeps non-admin members out of admin routes', async () => {
    sessionUser = { id: 'coach-user' };
    sessionProfile = { role: 'coach', is_active: true };
    const response = await middleware(new NextRequest('http://localhost/admin/operations'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/league');
  });

  it('allows an admin into admin routes', async () => {
    sessionUser = { id: 'admin-user' };
    sessionProfile = { role: 'admin', is_active: true };
    const response = await middleware(new NextRequest('http://localhost/admin/operations'));
    expect(response.status).toBe(200);
  });

  it('keeps authentication and legal pages reachable anonymously', async () => {
    for (const pathname of ['/auth/sign-in', '/auth/forgot-password', '/legal/privacy', '/member-access']) {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    }
  });

  it('keeps social share metadata reachable anonymously', async () => {
    const response = await middleware(new NextRequest('http://localhost/opengraph-image'));
    expect(response.status).toBe(200);
  });

  it.each(['/manifest.webmanifest', '/sw.js', '/favicon.svg', '/icons/rcl-app-180.png', '/icons/rcl-app-192.png', '/icons/rcl-app-512.png', '/icons/rcl-app-maskable-512.png'])(
    'keeps PWA asset %s reachable anonymously',
    async (pathname) => {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    },
  );

  it('keeps sign-in reachable when authentication configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await middleware(new NextRequest('http://localhost/auth/sign-in'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('keeps PWA assets reachable when authentication configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await middleware(new NextRequest('http://localhost/manifest.webmanifest'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('returns 503 for protected pages when authentication configuration is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await middleware(new NextRequest('http://localhost/league'));
    expect(response.status).toBe(503);
  });

  it('preserves an internal route and query in the member access redirect', async () => {
    const response = await middleware(new NextRequest('http://localhost/portal/operations?view=queue'));
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/member-access');
    expect(location.searchParams.get('next')).toBe('/portal/operations?view=queue');
  });

  it.each(['https://evil-site.com', '//evil-site.com', 'javascript:alert(1)', '/\\evil-site.com'])(
    'legacy auth redirect helper rejects unsafe next destination %s',
    (next) => {
      expect(getSafeNextPath(next)).toBe('/dashboard');
    },
  );

  it('legacy auth redirect helper preserves a trusted internal query string', () => {
    expect(getSafeNextPath('/portal/operations?view=queue')).toBe('/portal/operations?view=queue');
  });
});
