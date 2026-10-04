import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const appRoot = join(root, 'src/app');
const srcRoot = join(root, 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function pageFileToRoute(file: string): string {
  const rel = relative(appRoot, file).split(sep).join('/');
  const withoutPage = rel === 'page.tsx' ? '' : rel.replace(/\/page\.tsx$/, '');
  const withoutGroups = withoutPage
    .split('/')
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .join('/');
  return '/' + withoutGroups;
}

function routePatternToRegex(route: string): RegExp {
  if (route === '/') return /^\/$/;
  const parts = route.split('/').filter(Boolean).map((segment) => {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '.*';
    if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
    if (/^\[.+\]$/.test(segment)) return '[^/]+';
    return segment.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp('^/' + parts.join('/') + '/?$');
}

function normalizeCandidate(value: string): string | null {
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  if (
    value.startsWith('/api/') ||
    value.startsWith('/_next/') ||
    value.startsWith('/icons/') ||
    value.startsWith('/images/')
  ) return null;

  const withoutQuery = value.split('?')[0].split('#')[0] || '/';
  if (/\.(?:png|jpe?g|svg|webp|gif|ico|css|js|json|txt|xml|webmanifest)$/i.test(withoutQuery)) return null;
  return withoutQuery.replace(/\$\{[^}]+\}/g, '__dynamic__').replace(/\/{2,}/g, '/');
}

describe('site route integrity', () => {
  it('keeps every static internal navigation target backed by an App Router page', () => {
    const pageFiles = walk(appRoot).filter((file) => file.endsWith(sep + 'page.tsx') || file === join(appRoot, 'page.tsx'));
    const routePatterns = pageFiles.map(pageFileToRoute);
    const routeRegexes = routePatterns.map((route) => routePatternToRegex(route));

    const sourceFiles = walk(srcRoot).filter((file) => /\.(?:ts|tsx)$/.test(file));
    const findings = new Map<string, Set<string>>();

    const patterns = [
      /href\s*=\s*["'`]([^"'`]+)["'`]/g,
      /href\s*=\s*\{\s*["'`]([^"'`]+)["'`]\s*\}/g,
      /href\s*:\s*["'`]([^"'`]+)["'`]/g,
      /(?:router\.(?:push|replace|prefetch)|redirect|permanentRedirect)\(\s*["'`]([^"'`]+)["'`]/g,
      /(?:window\.)?location\.href\s*=\s*["'`]([^"'`]+)["'`]/g,
      /location\.(?:assign|replace)\(\s*["'`]([^"'`]+)["'`]/g,
    ];

    for (const file of sourceFiles) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
          const candidate = normalizeCandidate(match[1] ?? '');
          if (!candidate) continue;
          const sample = candidate.replace(/__dynamic__/g, 'x');
          if (routeRegexes.some((regex) => regex.test(sample))) continue;

          const fileName = relative(root, file).split(sep).join('/');
          const sources = findings.get(candidate) ?? new Set<string>();
          sources.add(fileName);
          findings.set(candidate, sources);
        }
      }
    }

    const broken = [...findings.entries()]
      .map(([route, files]) => ({ route, files: [...files].sort() }))
      .sort((a, b) => a.route.localeCompare(b.route));

    expect(
      broken,
      broken.length
        ? 'Broken internal routes:\n' + broken.map((item) => '- ' + item.route + ': ' + item.files.join(', ')).join('\n')
        : undefined,
    ).toEqual([]);
  });
});
