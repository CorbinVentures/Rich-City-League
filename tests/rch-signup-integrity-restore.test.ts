import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('RCH public signup integrity', () => {
  const migration = readFileSync('supabase/migrations/20261031210000_rch_signup_integrity_restore.sql', 'utf8');
  const form = readFileSync('src/components/AuthForm.tsx', 'utf8');

  it('keeps social provider accounts incomplete until age/legal checks pass', () => {
    expect(migration).toContain('completed := dob is not null and terms_at is not null and privacy_at is not null');
    expect(migration).toContain('onboarding_complete');
    expect(migration).toContain("requested_role = 'coach'::public.app_role and completed");
    expect(migration).toContain("requested_role = 'fan'::public.app_role and completed");
  });

  it('prevents duplicate requested handles from failing the Auth transaction', () => {
    expect(migration).toContain('on conflict (username) do nothing');
    expect(migration).toContain('if not found then');
    expect(migration).toContain('new.id, null,');
    expect(form).toContain("'rch_username_available', { p_username: normalizedUsername }");
    expect(form).toContain('That username is already taken.');
  });

  it('preserves age and legal safeguards and never grants coach privileges from signup', () => {
    expect(migration).toContain("current_date - interval '16 years'");
    expect(migration).toContain("else 'player'::public.app_role");
    expect(migration).toContain("'pending'");
    expect(form).toContain('acceptedLegal');
    expect(form).toContain('dateOfBirth');
  });
});
