/**
 * Supabase getUser() returns AuthSessionMissingError when a visitor has
 * never signed in. That is the normal guest state, not a service outage.
 * Real refresh-token/network failures are deliberately NOT swallowed.
 */
export function isExpectedMissingSession(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown; message?: unknown };
  const name = typeof record.name === 'string' ? record.name : '';
  const code = typeof record.code === 'string' ? record.code : '';
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : '';

  return name === 'AuthSessionMissingError'
    || code === 'session_not_found'
    || message.includes('auth session missing');
}
