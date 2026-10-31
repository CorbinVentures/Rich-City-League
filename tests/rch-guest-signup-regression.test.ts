import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isExpectedMissingSession } from '../src/lib/auth-session';

describe('guest onboarding / authentication regression', () => {
  it('treats an unauthenticated visitor as a guest, not a signup error', () => {
    expect(isExpectedMissingSession({ name: 'AuthSessionMissingError', message: 'Auth session missing!' })).toBe(true);
    expect(isExpectedMissingSession({ code: 'session_not_found' })).toBe(true);
    expect(isExpectedMissingSession(new Error('Auth session missing!'))).toBe(true);
  });

  it('never hides refresh failures, network failures, or server errors as a guest session', () => {
    expect(isExpectedMissingSession({ code: 'refresh_token_not_found', message: 'Invalid refresh token' })).toBe(false);
    expect(isExpectedMissingSession({ status: 500, message: 'Database error saving new user' })).toBe(false);
    expect(isExpectedMissingSession(new Error('Failed to fetch'))).toBe(false);
    expect(isExpectedMissingSession(null)).toBe(false);
  });

  it('keeps real backend errors visible and shows actionable signup guidance', () => {
    const hook = readFileSync('src/hooks/useAuth.ts', 'utf8');
    const form = readFileSync('src/components/AuthForm.tsx', 'utf8');
    expect(hook).toContain('sessionError && !isExpectedMissingSession(sessionError)');
    expect(hook).toContain('await applySession(sessionError ? null : data.user)');
    expect(hook).toContain('status >= 500');
    expect(hook).toContain('account service is temporarily unavailable');
    // Signup 500s can come from GoTrue's database or email path. Preserve the
    // distinction while never surfacing raw SQL/SMTP exception details.
    expect(hook).toContain("message.includes('database error')");
    expect(hook).toContain('RCH-AUTH-DB-500');
    expect(hook).toContain("message.includes('confirmation email')");
    expect(hook).toContain('RCH-AUTH-MAIL-500');
    expect(hook).toContain('RCH-AUTH-HOOK-500');
    expect(hook).toContain('RCH-AUTH-500');
    expect(form).toContain("setMessage(mode === 'sign-up' ? ''");
  });
});
