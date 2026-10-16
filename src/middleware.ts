import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from './lib/supabase-config';

type AccessProfile = {
  role: string | null;
  is_active: boolean | null;
  onboarding_complete?: boolean | null;
};

const MEMBER_ROUTE_PREFIXES = [
  '/dashboard',
  '/my-hoops',
  '/portal',
  '/admin',
  '/command',
  '/account',
  '/profile',
  '/messages',
  '/notifications',
  '/settings',
  '/orders',
  '/network/dashboard',
  '/sponsors/dashboard',
  '/sponsors/campaigns',
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
  const pathname = request.nextUrl.pathname;
  const protectedPath = requiresMemberAccess(pathname);

  // Public entry to the private Command PWA: credentials are accepted here, but
  // the actual workspace and all data remain protected by middleware + RLS.
  if (pathname === '/command/access' || pathname === '/command/access/') return NextResponse.next();
  if (pathname === '/command/icon.svg' || pathname === '/command/icon.png' || pathname === '/command/apple-icon.png' || pathname === '/command/manifest.webmanifest') return NextResponse.next();
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
    if (matchesRoute(pathname, '/command')) {
      return NextResponse.redirect(new URL('/command/access', request.url));
    }
    return NextResponse.redirect(memberAccessUrl(request));
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role,is_active,onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();
  const profile = profileData as AccessProfile | null;

  if (!profile && pathname !== '/profile' && !pathname.startsWith('/auth/')) {
    if (matchesRoute(pathname, '/command')) return NextResponse.redirect(new URL('/command/access?status=profile', request.url));
    return NextResponse.redirect(memberAccessUrl(request, { profile: true }));
  }

  if (profile?.onboarding_complete === false && pathname !== '/profile' && !pathname.startsWith('/auth/')) {
    if (matchesRoute(pathname, '/command')) return NextResponse.redirect(new URL('/command/access?status=setup', request.url));
    return NextResponse.redirect(socialOnboardingUrl(request));
  }

  if (profile?.is_active === false && pathname !== '/member-access' && !pathname.startsWith('/auth/')) {
    if (matchesRoute(pathname, '/command')) return NextResponse.redirect(new URL('/command/access?status=inactive', request.url));
    return NextResponse.redirect(memberAccessUrl(request, { inactive: true }));
  }

  // An enrolled member must finish MFA on every protected route, not just
  // immediately after a password login. This also covers OAuth, refreshed
  // browser sessions, deep links and the installed PWA.
  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || !assurance) {
    return NextResponse.json({ error: 'Unable to verify the current session security level.' }, { status: 503 });
  }

  const requestedPath = `${pathname}${request.nextUrl.search}`;
  if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
    const challenge = new URL('/auth/mfa', request.url);
    challenge.searchParams.set('next', requestedPath);
    return NextResponse.redirect(challenge);
  }

  // Administrators must enroll and verify TOTP before opening either
  // privileged workspace. Enrollment happens on /account/security.
  const privilegedWorkspace = matchesRoute(pathname, '/admin') ||
    (matchesRoute(pathname, '/command') && pathname !== '/command/access');
  if (privilegedWorkspace && profile?.role === 'admin' && assurance.currentLevel !== 'aal2') {
    const setup = new URL('/account/security', request.url);
    setup.searchParams.set('next', requestedPath);
    return NextResponse.redirect(setup);
  }

  const operatorWorkspace = pathname.startsWith('/portal/operations') || pathname.startsWith('/portal/team') || pathname.startsWith('/portal/scorebook');
  if (operatorWorkspace && (!profile || !['coach', 'staff', 'admin'].includes(profile.role ?? ''))) {
    return NextResponse.redirect(new URL('/league', request.url));
  }

  if (matchesRoute(pathname, '/command') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/command/access?status=denied', request.url));
  }

  if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/league', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
