import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('public homepage SSR and anonymous-cache contract', () => {
  it('resolves the root route at request time while retaining a separate 60-second data cache', () => {
    const home = read('src/app/page.tsx');
    expect(home).toContain("import { connection } from 'next/server'");
    expect(home).toContain('await connection()');
    expect(home).toContain('unstable_cache(');
    expect(home).toContain("revalidate: 60, tags: ['rch-public-home']");
    expect(home).not.toContain('export const revalidate = 60');
    expect(home).not.toContain("export const dynamic = 'force-dynamic'");
    expect(home).toContain('RCHBrowserHomepage');
    expect(home).toContain('RCLHomeExperience');
    expect(home).toContain('MemberHomeRedirect');
  });

  it('preserves the latest public-author filters so no private targeted posts enter shared cache', () => {
    const home = read('src/app/page.tsx');
    expect(home).toContain(".eq('author.profile_visibility', 'public')");
    expect(home).toContain(".eq('author.is_active', true)");
    expect(home).toContain(".is('target_profile_id', null)");
    expect(home).toContain("client.from('public_players')");
    expect(home).toContain(".eq('status', 'published')");
  });

  it('retains the browser shell for first render and mobile-only installed PWA gating', () => {
    const gate = read('src/components/RCHExperienceGate.tsx');
    const layout = read('src/app/layout.tsx');
    expect(gate).toContain("if (isBrowserPublicRoute(pathname) && mode !== 'mobile-app')");
    expect(gate).toContain('<RCHPublicWebShell>{publicContent}</RCHPublicWebShell>');
    expect(gate).toContain('setMode(isMobileStandaloneExperience(');
    expect(layout).toContain('<RCHExperienceGate publicContent={children}');
    expect(layout).toContain('<PlatformChrome>{children}</PlatformChrome>');
    expect(read('scripts/check-public-home-first-response.mjs')).toContain('response.headers.get');
  });
});
