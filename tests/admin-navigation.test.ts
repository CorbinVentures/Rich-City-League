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
});
