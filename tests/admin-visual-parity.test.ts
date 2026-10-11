import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const admin = (path: string) => readFileSync(join(root, 'src/app/admin', path), 'utf8');

describe('RCH administration frontend parity', () => {
  it('wraps every admin page in the same shared shell', () => {
    const layout = admin('layout.tsx');
    expect(layout).toContain('<AdminWorkspace />');
    expect(layout).toContain('<AdminTopbar />');
    expect(layout).toContain('className="rch-admin-area"');
    expect(layout).toContain("import './admin-theme.css'");
  });

  it('loads the executive RCH visual system with responsive navigation', () => {
    const styles = admin('admin-theme.css');
    expect(styles).toContain('--rch-admin-ice:#91cef2');
    expect(styles).toContain('.rch-admin-nav-item.is-active');
    expect(styles).toContain('@media (max-width:820px)');
    expect(styles).toContain('focus-visible');
    expect(styles).toContain('prefers-reduced-motion');
  });

  it('has one navigation source with valid destinations and authorization gating', () => {
    const nav = readFileSync(join(root, 'src/components/AdminWorkspace.tsx'), 'utf8');
    expect(nav).toContain("profile?.role === 'admin'");
    expect(nav).toContain("profile?.role === 'staff'");
    expect(nav).toContain("if (loading || (!isAdmin && !isStaff)) return null");
    expect(nav).toContain('aria-current={active ?');
    const routes = [...nav.matchAll(/href: '(\/admin[^']*)'/g)].map((match) => match[1]);
    expect(routes.length).toBeGreaterThanOrEqual(9);
    for (const route of routes) {
      const path = join(root, 'src/app', route.slice(1), 'page.tsx');
      expect(existsSync(path), `Missing admin route: ${route}`).toBe(true);
    }
  });

  it('removes duplicated inline navigation from each admin page', () => {
    const pages = [
      'page.tsx', 'control-center/page.tsx', 'draft/page.tsx',
      'recognition/page.tsx', 'governance/page.tsx',
      'shop/page.tsx', 'leagueapps/page.tsx',
      'league-setup/page.tsx', 'operations/page.tsx',
      'seasonal-themes/page.tsx',
    ];
    for (const page of pages) {
      expect(admin(page), `Duplicate workspace nav on ${page}`).not.toContain('<AdminWorkspace />');
    }
  });

  it('preserves functional overview tabs and replaces legacy branding', () => {
    const overview = admin('page.tsx');
    expect(overview).toContain('role="tablist"');
    expect(overview).toContain('aria-selected={activeTab === tab.id}');
    expect(overview).toContain('role="tabpanel"');
    expect(overview).toContain('loadDashboardData');
    expect(overview).toContain('rch-admin-stat');
    expect(overview).toContain('Platform <span className="text-rcl-gold">Overview</span>');
    expect(overview).not.toContain('RCL <span className="text-rcl-gold">COMMAND CENTER</span>');
  });
});
