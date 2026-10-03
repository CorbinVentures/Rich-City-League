import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from './lib/supabase-config';

type AccessProfile = {
  role: string | null;
  is_active: boolean | null;
  onboarding_complete?: boolean | null;
  created_at?: string | null;
};

const MEMBER_ONLY_PREVIEW = true;
const MEMBER_ONLY_PREVIEW_CUTOFF = Date.parse('2026-10-03T20:20:00.000Z');

const PREVIEW_PUBLIC_ROUTE_PREFIXES = [
  '/access',
  '/auth/sign-in',
  '/auth/forgot-password',
  '/auth/update-password',
  '/auth/callback',
  '/auth/confirm',
  '/auth/verify-email',
  '/legal',
] as const;

const MEMBER_ROUTE_PREFIXES = [
  '/dashboard',
  '/my-hoops',
  '/portal',
  '/admin',
  '/account',
  '/profile',
  '/messages',
  '/notifications',
  '/settings',
  '/orders',
  '/network/dashboard',
  '/friends',
  '/connections',
  '/social',
  '/communities',
  '/missions',
  '/fantasy',
  '/pickem',
] as const;

function matchesRoute(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function requiresMemberAccess(pathname: string) {
  return MEMBER_ROUTE_PREFIXES.some((prefix) => matchesRoute(pathname, prefix));
}

function isPreviewPublicPath(pathname: string) {
  return PREVIEW_PUBLIC_ROUTE_PREFIXES.some((prefix) => matchesRoute(pathname, prefix));
}

function comingSoonUrl(request: NextRequest, flags: { profile?: boolean; inactive?: boolean } = {}) {
  const url = request.nextUrl.clone();
  url.pathname = '/access';
  url.search = '';
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (flags.profile) url.searchParams.set('profile', '1');
  if (flags.inactive) url.searchParams.set('inactive', '1');
  return url;
}

function memberAccessUrl(request: NextRequest, flags: { profile?: boolean; inactive?: boolean } = {}) {
  const url = request.nextUrl.clone();
  url.pathname = '/member-access';
  url.search = '';
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (flags.profile) url.searchParams.set('profile', '1');
  if (flags.inactive) url.searchParams.set('inactive', '1');
  return url;
}

function socialOnboardingUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/complete-profile';
  url.search = '';
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return url;
}

function isExistingPreviewMember(profile: AccessProfile | null) {
  if (!profile || profile.is_active !== true || profile.onboarding_complete === false || !profile.created_at) return false;
  const createdAt = Date.parse(profile.created_at);
  return Number.isFinite(createdAt) && createdAt < MEMBER_ONLY_PREVIEW_CUTOFF;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // During the temporary edit window, new account creation is closed. Existing
  // members can still use normal sign-in, recovery and verification routes.
  if (MEMBER_ONLY_PREVIEW && matchesRoute(pathname, '/auth/sign-up')) {
    return NextResponse.redirect(comingSoonUrl(request));
  }

  const previewProtectedPath = MEMBER_ONLY_PREVIEW && !isPreviewPublicPath(pathname);
  const protectedPath = previewProtectedPath || requiresMemberAccess(pathname);

  if (!protectedPath) return NextResponse.next();

  const config = getSupabaseConfig();
  if (config.status !== 'configured') {
    return NextResponse.json({ error: 'RCL member authentication is temporarily unavailable.' }, { status: 503 });
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
  if (!user) {
    return NextResponse.redirect(previewProtectedPath ? comingSoonUrl(request) : memberAccessUrl(request));
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  const profile = profileData as AccessProfile | null;

  if (previewProtectedPath && !isExistingPreviewMember(profile)) {
    return NextResponse.redirect(comingSoonUrl(request, {
      profile: !profile || profile.onboarding_complete === false || !profile.created_at || Date.parse(profile.created_at) >= MEMBER_ONLY_PREVIEW_CUTOFF,
      inactive: profile?.is_active === false,
    }));
  }

  // Standard member-workspace authorization remains in place underneath the
  // temporary site wall so roles and operational permissions do not change.
  if (!profile && pathname !== '/profile' && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(memberAccessUrl(request, { profile: true }));
  }

  if (profile?.onboarding_complete === false && pathname !== '/profile' && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(socialOnboardingUrl(request));
  }

  if (profile?.is_active === false && pathname !== '/member-access' && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(memberAccessUrl(request, { inactive: true }));
  }

  const operatorWorkspace = pathname.startsWith('/portal/operations') || pathname.startsWith('/portal/team') || pathname.startsWith('/portal/scorebook');
  if (operatorWorkspace && (!profile || !['coach', 'staff', 'admin'].includes(profile.role ?? ''))) {
    return NextResponse.redirect(new URL('/league', request.url));
  }

  if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/league', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
