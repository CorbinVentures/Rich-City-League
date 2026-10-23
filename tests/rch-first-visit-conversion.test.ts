import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getBrowserPostAuthPath, getSafePostAuthPath } from '../src/lib/auth-redirect';

const read = (name: string) => readFileSync(name, 'utf8');

describe('RCH first-visit basketball conversion', () => {
  it('keeps a safe basketball destination and rejects redirects away from RCH', () => {
    expect(getSafePostAuthPath('/runs', '/runs')).toBe('/runs');
    expect(getBrowserPostAuthPath('/runs', '/runs')).toBe('/runs');
    expect(getSafePostAuthPath('/runs/123?from=home', '/runs')).toBe('/runs/123?from=home');
    expect(getSafePostAuthPath('//attacker.test', '/runs')).toBe('/runs');
    expect(getSafePostAuthPath('https://attacker.test', '/runs')).toBe('/runs');
    expect(getSafePostAuthPath('/auth/sign-in', '/runs')).toBe('/runs');
  });

  it('connects both Join Free calls to real runs after registration', () => {
    const homepage = read('src/components/RCHBrowserHomepage.tsx');
    const ctas = homepage.match(/guestHref="\/auth\/sign-up\?next=%2Fruns"/g) ?? [];
    expect(ctas).toHaveLength(2);
    expect(homepage).toContain('guestLabel="Join Free"');
    expect(homepage).toContain('href="/runs"');
  });

  it('keeps essential safeguards but postpones optional profile completion', () => {
    const form = read('src/components/AuthForm.tsx');
    expect(form).toContain('setSignupDestination(getSafePostAuthPath');
    expect(form).toContain('Add basketball details (optional — update later)');
    expect(form).toContain('if (Number.isNaN(birth.getTime()) || age < 16)');
    expect(form).toContain("if (!acceptedLegal)");
    expect(form).toContain("legal_terms_accepted_at");
    expect(form).toContain("privacy_policy_acknowledged_at");
    expect(form).toContain("getBrowserPostAuthPath(signupDestination, '/runs')");
    expect(form).toContain('Browse public runs');
    expect(form).toContain('Sign in and continue');
    expect(form).not.toContain('Get the RCH mobile app');
  });

  it('uses the shared RCH palette throughout account entry', () => {
    const shell = read('src/components/AuthShell.tsx');
    const authProviders = read('src/components/SocialAuthOptions.tsx');
    expect(shell).toContain('Rich City Hoops · Virginia');
    expect(shell).toContain('var(--rch-brand-accent-text)');
    expect(shell).not.toContain('bg-rcl-black');
    expect(authProviders).toContain('Create your Rich City Hoops account');
    expect(authProviders).toContain('var(--rch-brand-surface)');
  });
});
