const INTERNAL_URL_BASE = 'https://rcl.invalid';

const POST_AUTH_BLOCKED_PATHS = ['/member-access', '/access'] as const;

function isBlockedPostAuthPath(pathname: string) {
  return pathname.startsWith('/auth/')
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
