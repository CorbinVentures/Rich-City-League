import { isBrowserAccountRoute, isBrowserPublicRoute } from './rch-mobile-experience';

const INTERNAL_URL_BASE = 'https://rcl.invalid';

const POST_AUTH_BLOCKED_PATHS = ['/member-access', '/access'] as const;

function isBlockedPostAuthPath(pathname: string) {
  return pathname === '/auth' || pathname.startsWith('/auth/')
    || POST_AUTH_BLOCKED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || value.length > 2048 || /[\u0000-\u001f\u007f\\]/.test(value) || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const destination = new URL(value, INTERNAL_URL_BASE);
    if (destination.origin !== INTERNAL_URL_BASE || !destination.pathname.startsWith('/')) {
      return fallback;
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function getSafePostAuthPath(
  value: string | null | undefined,
  fallback = '/today',
): string {
  const destination = getSafeNextPath(value, fallback);

  try {
    const parsed = new URL(destination, INTERNAL_URL_BASE);
    if (isBlockedPostAuthPath(parsed.pathname)) return fallback;
  } catch {
    return fallback;
  }

  return destination;
}

/**
 * The open website is intentionally distinct from the installed member PWA.
 * Never send browser sign-ins straight to the installed-app-only dashboard:
 * the website experience gate would replace it with a guest notice.
 *
 * Keep public destinations and the browser-accessible security, profile and
 * Command Center routes intact. Other member destinations get a browser-native
 * handoff with a verified signed-in state rather than another login loop.
 */
export function getBrowserPostAuthPath(value: string | null | undefined, fallback = '/'): string {
  const path = getSafePostAuthPath(value, fallback);
  const pathname = new URL(path, INTERNAL_URL_BASE).pathname;
  if (isBrowserPublicRoute(pathname) || isBrowserAccountRoute(pathname)) return path;
  return `/member-access?next=${encodeURIComponent(path)}`;
}
