import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const adminRoot = join(root, 'src/app/admin');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function routeToPage(route: string): string {
  if (route === '/') return join(root, 'src/app/page.tsx');
  return join(root, 'src/app', route.replace(/^\//, ''), 'page.tsx');
}

describe('admin navigation integrity', () => {
  it('keeps every admin section backed by a real App Router page', () => {
    const expected = [
      '/admin',
      '/admin/league-setup',
      '/admin/operations',
      '/admin/leagueapps',
      '/admin/shop',
      '/admin/control-center',
      '/admin/governance',
      '/admin/recognition',
    ];

    for (const route of expected) {
      expect(existsSync(routeToPage(route)), `Missing page for ${route}`).toBe(true);
    }
  });

  it('does not contain broken static internal links in admin UI', () => {
    const files = [
      ...walk(adminRoot).filter((file) => file.endsWith('.tsx')),
      join(root, 'src/components/AdminWorkspace.tsx'),
      join(root, 'src/components/AdminControlShortcut.tsx'),
    ];

    const routes = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/(?:href\s*=\s*["'`]([^"'#?`]+)|href:\s*["'`]([^"'#?`]+))/g)) {
        const route = match[1] ?? match[2];
        if (route?.startsWith('/') && !route.startsWith('/api/')) routes.add(route);
      }
    }

    const broken = [...routes].filter((route) => !route.includes('${') && !existsSync(routeToPage(route)));
    expect(broken, `Broken admin links: ${broken.join(', ')}`).toEqual([]);
  });

  it('provides direct Command Center entry points without bypassing administrator access', () => {
    const rail = readFileSync(join(root, 'src/components/AdminWorkspace.tsx'), 'utf8');
    const dashboard = readFileSync(join(root, 'src/app/admin/page.tsx'), 'utf8');
    const menu = readFileSync(join(root, 'src/lib/rcl-navigation.ts'), 'utf8');
    const siteHeader = readFileSync(join(root, 'src/components/SiteHeader.tsx'), 'utf8');
    const command = readFileSync(join(root, 'src/app/command/page.tsx'), 'utf8');
    const middleware = readFileSync(join(root, 'src/middleware.ts'), 'utf8');

    expect(existsSync(routeToPage('/command'))).toBe(true);
    expect(rail).toContain("label: 'RCL Command Center', href: '/command'");
    expect(dashboard).toContain('href="/command"');
    expect(menu).toContain("RCL_COMMAND_NAV_ITEM:RCLNavItem={label:'RCL Command Center',href:'/command'");
    expect(siteHeader).toContain("profile?.role==='admin'?RCL_ADMIN_NAV_GROUP");
    expect(siteHeader).toContain("item.href!==RCL_COMMAND_NAV_ITEM.href");
    expect(command).toContain("profile?.role!=='admin'");
    expect(middleware).toContain("assurance.currentLevel !== 'aal2'");
  });

});
