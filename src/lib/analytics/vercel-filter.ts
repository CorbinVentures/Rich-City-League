import { canSendExternalAnalytics } from './external-consent';

/**
 * Vercel Web Analytics must never receive an event describing account, private,
 * user-generated or URL-tokenized paths, regardless of script install timing.
 * This filter is a fail-closed implementation of the SDK beforeSend callback.
 */
export function filterVercelPageview(
  event: {type: string; url: string},
  ownOrigin: string,
  currentPath: string,
  optedIn: boolean,
  privacyBlocked: boolean,
): {type: string; url: string}|null {
  if (event.type !== 'pageview') return null;
  try {
    const input = new URL(event.url);
    const own = new URL(ownOrigin);
    if (input.origin !== own.origin) return null;
    if (!canSendExternalAnalytics(input.pathname, optedIn, privacyBlocked)) return null;
    if (!canSendExternalAnalytics(currentPath, optedIn, privacyBlocked)) return null;
    // Drop query parameters, hash fragments, IDs and metadata from the event URL.
    return {...event, url: own.origin + input.pathname};
  } catch {return null;}
}
