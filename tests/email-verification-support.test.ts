import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('RCH email verification and recovery', () => {
  const hook = read('src/hooks/useAuth.ts');
  const verify = read('src/app/auth/verify-email/page.tsx');
  const admin = read('src/app/admin/email-verification/page.tsx');
  const nav = read('src/components/AdminWorkspace.tsx');

  it('does not treat a resend request as proof of mailbox delivery', () => {
    expect(verify).toContain('Request accepted.');
    expect(verify).toContain('delivery to an inbox cannot be guaranteed');
    expect(verify).toContain('notifications@mail.richcityhoops.com');
    expect(verify).toContain('RESEND_COOLDOWN_SECONDS = 60');
    expect(verify).toContain('contact RCH support');
  });

  it('surfaces rate limits instead of hiding them with a generic resend error', () => {
    expect(hook).toContain('status === 429');
    expect(hook).toContain("code === 'over_email_send_rate_limit'");
    expect(hook).toContain('const safeMessage = getAuthErrorMessage(err,');
    expect(hook).toContain('throw new Error(safeMessage);');
    expect(verify).toContain("safeMessage.includes('Too many attempts')");
  });

  it('checks a fresh admin session, verified identity and MFA before using the service role', () => {
    expect(admin).toContain('await requireVerifiedAdmin();');
    expect(admin).toContain('client.auth.getUser()');
    expect(admin).toContain('user.email_confirmed_at');
    expect(admin).toContain("assurance?.currentLevel !== 'aal2'");
    expect(admin).toContain("profile?.role !== 'admin'");
    expect(admin).toContain('getSupabaseAdminClient()');
    expect(admin.indexOf('await requireVerifiedAdmin();')).toBeLessThan(admin.indexOf('report = await loadPending();'));
  });

  it('keeps provider API secrets server-side and never enables direct manual confirmation', () => {
    expect(admin).toContain('process.env.RESEND_API_KEY');
    expect(admin).not.toContain('NEXT_PUBLIC_RESEND_API_KEY');
    expect(admin).not.toContain('email_confirm: true');
    expect(admin).not.toContain('updateUserById(');
    expect(admin).toContain('not proof the member saw the message');
    expect(admin).toContain('does not mean no message was sent');
    expect(nav).toContain("href: '/admin/email-verification'");
  });
});
