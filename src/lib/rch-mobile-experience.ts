/** Full member/social tools remain in the installed mobile PWA. */
export function isBrowserAccountRoute(pathname: string): boolean {
  // Command administrators must be able to enroll and verify MFA in Safari.
  // This only lifts the client presentation gate; middleware still requires sign-in.
  return pathname === '/account/security' || pathname === '/account/security/'
    || pathname === '/command' || pathname.startsWith('/command/')
    || pathname === '/member-access'
    || pathname === '/app'
    || pathname === '/profile'
    || pathname.startsWith('/auth/')
    || pathname === '/auth'
    || pathname.startsWith('/legal/')
    || pathname === '/legal';
}

/** Public basketball information is readable without installing the PWA.
 * Keep this an explicit allowlist: app-only routes must never become public
 * simply because their prefix happens to match a public section.
 */
const PUBLIC_BROWSER_PAGES = new Set([
  '/', '/about', '/league', '/richmond-basketball-league',
  '/richmond-basketball-runs', '/network', '/community', '/sponsors',
  '/sponsors/start', '/organizations', '/network/partners',
  '/network/partners/apply', '/membership', '/news', '/players',
  '/teams', '/games', '/standings', '/leaderboards', '/schedule',
  '/stats', '/rankings', '/coaches', '/runs', '/draft', '/media',
  '/shop', '/faq', '/register', '/coaches',
]);
const PUBLIC_DETAIL_SECTIONS = new Set(['teams', 'players', 'games', 'news', 'organizations']);
const PRIVATE_DETAIL_SLUGS = new Set(['new', 'create', 'edit', 'settings', 'dashboard', 'manage', 'admin']);

export function isBrowserPublicRoute(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PUBLIC_BROWSER_PAGES.has(normalized)) return true;

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 2 && PUBLIC_DETAIL_SECTIONS.has(parts[0])) {
    return !PRIVATE_DETAIL_SLUGS.has(parts[1].toLowerCase());
  }
  if (parts.length === 3 && parts[0] === 'organizations' && parts[1] === 'region') return true;
  if (parts.length === 3 && parts[0] === 'network' && parts[1] === 'events') return true;
  return false;
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
