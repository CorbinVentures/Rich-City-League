import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shell = readFileSync('src/components/RCHPublicWebShell.tsx', 'utf8');
const popup = readFileSync('src/components/RCHHomepageRegistrationModal.tsx', 'utf8');
const gate = readFileSync('src/components/RCHExperienceGate.tsx', 'utf8');

describe('RCH homepage free app registration notice', () => {
  it('mounts on the public homepage only and uses existing guest auth state', () => {
    expect(shell).toContain("pathname === '/' && <RCHHomepageRegistrationModal");
    expect(shell).toContain('authenticated={Boolean(user)} loading={authLoading}');
    expect(gate).toContain('isBrowserPublicRoute(pathname)');
    expect(gate).toContain('<RCHPublicWebShell>{publicContent}</RCHPublicWebShell>');
  });

  it('never opens while auth resolves or for an existing member', () => {
    expect(popup).toContain('if (loading || authenticated)');
    expect(popup).toContain('if (!open || authenticated || loading) return null');
    expect(popup).toContain('window.sessionStorage.getItem(DISMISS_KEY)');
    expect(popup).toContain('window.sessionStorage.setItem(DISMISS_KEY');
  });

  it('uses real free signup and sign-in destinations without blocking public browsing', () => {
    expect(popup).toContain('href="/auth/sign-up"');
    expect(popup).toContain('href="/auth/sign-in"');
    expect(popup).toContain('Continue exploring the public site');
    expect(popup).toContain('Public pages remain open to everyone.');
    expect(popup).toContain("trackRchConversion('join_click', 'home_hero')");
  });

  it('includes accessible dialog, escape, focus trapping and scroll restoration', () => {
    expect(popup).toContain('role="dialog"');
    expect(popup).toContain('aria-modal="true"');
    expect(popup).toContain('aria-labelledby="rch-register-title"');
    expect(popup).toContain("event.key === 'Escape'");
    expect(popup).toContain("event.key !== 'Tab'");
    expect(popup).toContain('document.body.style.overflow = previousOverflow');
    expect(popup).toContain('previousFocus?.focus()');
  });
});
