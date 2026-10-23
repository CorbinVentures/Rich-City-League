import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Public RCH Pulse author joins', () => {
  it('selects the real author relationship when posts also target other profiles', () => {
    const pulse = readFileSync('src/app/pulse/page.tsx', 'utf8');
    expect(pulse).toContain('author:profiles!posts_author_id_fkey!inner(display_name,username,first_name,last_name)');
    expect(pulse).not.toContain('author:profiles!inner(');
  });

  it('shows only published public-authored non-wall posts on both entrypoints', () => {
    for (const pathname of ['src/app/page.tsx', 'src/app/pulse/page.tsx']) {
      const page = readFileSync(pathname, 'utf8');
      expect(page).toContain('author:profiles!posts_author_id_fkey!inner(');
      expect(page).toContain(".eq('author.profile_visibility', 'public')");
      expect(page).toContain(".eq('author.is_active', true)");
      expect(page).toContain(".eq('status', 'published')");
      expect(page).toContain(".is('target_profile_id', null)");
    }
  });

  it('continues using the RLS-governed public client without a service-role bypass', () => {
    const homepage = readFileSync('src/app/page.tsx', 'utf8');
    const pulse = readFileSync('src/app/pulse/page.tsx', 'utf8');
    expect(homepage).toContain('getPublicClient()');
    expect(pulse).toContain('getPublicClient()');
    expect(pulse).not.toContain('service_role');
  });
});
