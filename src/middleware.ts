import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from './lib/supabase-config';

type AccessProfile = { role: string | null; is_active: boolean | null; onboarding_complete?: boolean | null };

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
  const metadataAsset = pathname === '/opengraph-image' || pathname === '/twitter-image' || pathname === '/icon' || pathname === '/apple-icon';
  const pwaAsset = pathname === '/manifest.webmanifest'
    || pathname === '/sw.js'
    || pathname === '/favicon.svg'
    || pathname.startsWith('/icons/');
  const publicAccess = pathname === '/member-access' || pathname.startsWith('/auth/') || pathname.startsWith('/legal/') || metadataAsset || pwaAsset;
  const config = getSupabaseConfig();

  // RCL is a member platform. Authentication must be available before protected
  // basketball content can be served; there is no anonymous preview-cookie bypass.
  if (config.status !== 'configured') {
    return publicAccess
      ? NextResponse.next()
      : NextResponse.json({ error: 'RCL member authentication is temporarily unavailable.' }, { status: 503 });
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
    if (publicAccess) return response;
    return NextResponse.redirect(memberAccessUrl(request));
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  const profile = profileData as AccessProfile | null;

  // A signed-in auth account is not platform membership by itself. Members must
  // have a real RCL profile; /profile remains reachable so they can create it.
  if (!profile && pathname !== '/profile' && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(memberAccessUrl(request, { profile: true }));
  }

  // Apple/Google can securely prove identity before RCL has collected the local
  // 16+ age screen, role choice, username and legal acknowledgements. Keep those
  // new social identities inside onboarding until the RCL-specific profile is done.
  if (profile?.onboarding_complete === false && !pathname.startsWith('/auth/')) {
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
