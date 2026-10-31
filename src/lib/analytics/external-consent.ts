/** Optional cross-provider data sharing. Defaults off; never overrides DNT/GPC. */
export const EXTERNAL_CONSENT_KEY = 'rch:optional-product-analytics-v1';
export const EXTERNAL_CONSENT_EVENT = 'rch:external-analytics-choice';

export function privacySignalBlocked(input: { doNotTrack?: string | null; globalPrivacyControl?: boolean }) {
  return input.doNotTrack === '1' || input.globalPrivacyControl === true;
}

export function readExternalAnalyticsChoice(): boolean {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage.getItem(EXTERNAL_CONSENT_KEY) === 'allow'; }
  catch { return false; }
}

export function setExternalAnalyticsChoice(allowed: boolean) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(EXTERNAL_CONSENT_KEY, allowed ? 'allow' : 'deny');
    window.dispatchEvent(new Event(EXTERNAL_CONSENT_EVENT));
    return true;
  } catch { return false; }
}

/**
 * Only allow predefined, public landing pages. Never send URLs, queries,
 * private messages, profiles, account, admin, settings, organization sub-sites,
 * registration, checkout, or any user-generated detail page to an external vendor.
 */
export const SAFE_ANALYTICS_PAGES = new Set([
  '/', '/about', '/news', '/runs', '/league', '/media', '/website-creator',
  '/discover', '/players', '/teams', '/schedule', '/commonwealth',
  '/crews', '/fantasy', '/sponsors', '/app', '/membership', '/faq',
  '/richmond-basketball-runs', '/richmond-basketball-league',
]);

export function externalAnalyticsSection(pathname: string): string | null {
  const normalized = pathname === '/' ? pathname : pathname.replace(/\/+$/, '');
  if (!SAFE_ANALYTICS_PAGES.has(normalized)) return null;
  return normalized === '/' ? 'home' : normalized.slice(1).replaceAll('-', '_');
}

export function canSendExternalAnalytics(pathname: string, optedIn: boolean, privacyBlocked: boolean) {
  return optedIn && !privacyBlocked && externalAnalyticsSection(pathname) !== null;
}
