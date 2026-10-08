/** The browser remains an account/installation gateway; the full UI runs in a mobile standalone PWA. */
export function isBrowserAccountRoute(pathname: string): boolean {
  return pathname === '/app'
    || pathname === '/profile'
    || pathname.startsWith('/auth/')
    || pathname === '/auth'
    || pathname.startsWith('/legal/')
    || pathname === '/legal';
}

export function isMobileStandaloneExperience(input: {
  standalone: boolean;
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
}): boolean {
  const mobile = /iPhone|iPad|iPod|Android|Mobile/i.test(input.userAgent)
    || (input.platform === 'MacIntel' && (input.maxTouchPoints ?? 0) > 1);
  return mobile && input.standalone;
}

/**
 * Browsers don't send a trustworthy installed-PWA flag to the server.
 * This is a presentation gate, not an authorization or API security boundary.
 */
export function verifiedRCHApkUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.pathname.toLowerCase().endsWith('.apk') ? url.toString() : null;
  } catch {
    return null;
  }
}
