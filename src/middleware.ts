import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from './lib/supabase-config';

type AccessProfile = { role: string | null; is_active: boolean | null; onboarding_complete?: boolean | null };

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

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (hostname === 'www.richcityhoops.com') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = 'richcityhoops.com';
    canonicalUrl.port = '';
    return NextResponse.redirect(canonicalUrl, 308);
  }

  const pathname = request.nextUrl.pathname;
  const protectedPath = requiresMemberAccess(pathname);

  // RCL's public launch is public by default. League discovery, player/team data,
  // news, Network pages, organization listings, partner acquisition, event pages,
  // media, registration and other public surfaces must remain crawlable and usable
  // without an account. Authentication is required only for member workspaces.
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
  if (!user) return NextResponse.redirect(memberAccessUrl(request));

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  const profile = profileData as AccessProfile | null;

  // A signed-in auth identity still needs an RCL profile before member-only tools
  // are available. /profile itself remains reachable so that profile can be built.
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
