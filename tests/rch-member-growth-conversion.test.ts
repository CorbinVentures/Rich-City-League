import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('RCH free membership growth safeguards', () => {
  it('leads with real basketball opportunities instead of a generic product directory', () => {
    const page = read('src/components/RCHBrowserHomepage.tsx');
    expect(page).toContain('YOUR COURT.');
    expect(page).toContain('YOUR LEGACY.');
    expect(page.indexOf('id="whats-happening"')).toBeLessThan(page.indexOf('rch-browser-feature-grid'));
    expect(page).toContain('players.slice(0, 6)');
    expect(page).toContain('More than another feed.');
    expect(page).toContain('trackingContext="home_hero"');
    expect(page).not.toContain('rch-browser-phone-screen');
  });

  it('keeps a clear public site hierarchy and PWA separation', () => {
    const nav = read('src/components/RCHPublicWebShell.tsx');
    const gate = read('src/components/RCHExperienceGate.tsx');
    expect(nav).toContain("const secondaryNav = [");
    expect(nav).toContain("name: 'Community', href: '/community'");
    expect(nav).toContain('rch-public-mobile-drawer');
    expect(gate).toContain("mode === 'mobile-app'");
  });

  it('provides purposeful, free and role-specific joining with safe destinations', () => {
    const route = read('src/app/join/[audience]/page.tsx');
    const form = read('src/components/AuthForm.tsx');
    for (const audience of ['players', 'fans', 'coaches', 'creators', 'organizations']) {
      expect(route).toContain(audience + ': {');
    }
    expect(route).toContain("encodeURIComponent(entry.destination)");
    expect(form).toContain("requestedRole === 'player'");
    expect(form).toContain('if (Number.isNaN(birth.getTime()) || age < 16)');
    expect(form).toContain('if (!acceptedLegal)');
  });

  it('records minimal opt-out-aware conversion events without personal data', () => {
    const tracker = read('src/lib/analytics/conversion.ts');
    const migration = read('supabase/migrations/20261031030208_rch_member_conversion_events.sql');
    expect(tracker).toContain("globalPrivacyControl === true");
    expect(tracker).toContain("privacy.doNotTrack === '1'");
    expect(tracker).toContain('session_id: session');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('grant insert (session_id, event_type, context)');
    expect(migration).not.toContain('email_address');
    expect(migration).not.toContain('password');
  });

  it('does not show an app-install prompt before an account is used', () => {
    expect(read('src/components/AuthForm.tsx')).not.toContain("rch:registration-complete");
  });
});
