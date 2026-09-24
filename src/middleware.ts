import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from './lib/supabase-config';

const PREVIEW_COOKIE = 'rcl_preview_access';
const PREVIEW_COOKIE_VALUE = 'rcl-beta-2026';
const REFERRAL_TOKEN = 'rcl-preview-804';
const WALL_END = Date.UTC(2026, 9, 1); // Oct 1, 2026 UTC

function previewWallActive() {
  return Date.now() < WALL_END;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/portal') || pathname.startsWith('/admin') || pathname.startsWith('/account');
  const config = getSupabaseConfig();

  // A referral link grants temporary preview access and immediately removes
  // the token from the visible URL.
  if (previewWallActive() && request.nextUrl.searchParams.get('ref') === REFERRAL_TOKEN) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete('ref');
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(PREVIEW_COOKIE, PREVIEW_COOKIE_VALUE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(WALL_END),
    });
    return response;
  }

  if (config.status !== 'configured') {
    if (previewWallActive() && pathname !== '/access' && request.cookies.get(PREVIEW_COOKIE)?.value !== PREVIEW_COOKIE_VALUE) {
      const accessUrl = request.nextUrl.clone();
      accessUrl.pathname = '/access';
      accessUrl.search = '';
      return NextResponse.redirect(accessUrl);
    }
    return protectedPath
      ? NextResponse.json({ error: 'Authentication is temporarily unavailable.' }, { status: 503 })
      : NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url!, config.anonKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();

  // Through Sept. 30 the public site is a private preview. Existing signed-in
  // members bypass the wall; invited visitors use a referral link or password.
  const wallExempt = pathname === '/access' || pathname.startsWith('/auth/');
  const hasPreviewAccess = request.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_COOKIE_VALUE;
  if (previewWallActive() && !wallExempt && !user && !hasPreviewAccess) {
    const accessUrl = request.nextUrl.clone();
    accessUrl.pathname = '/access';
    accessUrl.search = '';
    return NextResponse.redirect(accessUrl);
  }

  if (protectedPath && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/sign-in';
    signInUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (user && request.nextUrl.pathname.startsWith('/portal/operations')) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const profile = profileData as { role: string } | null;
    if (!profile || !['coach', 'staff', 'admin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = (profileData as { role?: string } | null)?.role;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
