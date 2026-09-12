import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let session: unknown = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: session ? (session as { user: unknown }).user : null } }),
    },
  }),
}));

import { middleware } from '../middleware';
import { getSafeNextPath } from '../src/lib/auth-redirect';

describe('protected route middleware', () => {
  beforeEach(() => {
    session = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('redirects anonymous users away from dashboard and portal routes', async () => {
    for (const pathname of ['/dashboard', '/portal/profile', '/portal/operations']) {
      const response = await middleware(new NextRequest(`http://localhost${pathname}`));

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/sign-in');
    }
  });

  it('allows an authenticated session to continue to protected routes', async () => {
    session = { user: { id: 'player-user' } };

    const response = await middleware(new NextRequest('http://localhost/dashboard'));

    expect(response.status).toBe(200);
  });

  it('preserves only the internal destination in the sign-in redirect', async () => {
    const response = await middleware(new NextRequest('http://localhost/portal/operations?view=queue'));
    const location = new URL(response.headers.get('location')!);

    expect(location.pathname).toBe('/auth/sign-in');
    expect(location.searchParams.get('next')).toBe('/portal/operations?view=queue');
  });

  it.each(['https://evil-site.com', '//evil-site.com', 'javascript:alert(1)', '/\\evil-site.com'])(
    'rejects unsafe next destination %s',
    (next) => {
      expect(getSafeNextPath(next)).toBe('/dashboard');
    },
  );

  it('preserves a trusted internal query string', () => {
    expect(getSafeNextPath('/portal/operations?view=queue')).toBe('/portal/operations?view=queue');
  });
});
