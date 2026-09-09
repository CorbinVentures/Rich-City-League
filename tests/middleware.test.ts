import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let session: unknown = null;

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createMiddlewareClient: () => ({
    auth: {
      getSession: async () => ({ data: { session } }),
    },
  }),
}));

import { middleware } from '../middleware';

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
});
