import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PWA_LAUNCH_BOOTSTRAP, isLaunchContentReady, canDismissLaunch, RCH_LAUNCH_MURAL, RCH_LAUNCH_BOOT_FALLBACK_MS, RCH_LAUNCH_FALLBACK_MS, RCH_LAUNCH_ROUTE_DELAY_MS } from '../src/lib/pwa-launch';

function launch({ path = '/social', standalone = true, userAgent = 'iPhone', platform = 'iPhone', maxTouchPoints = 1, storage = new Map<string, string>(), search = '', hash = '' }: {
  path?: string;
  standalone?: boolean;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
  storage?: Map<string, string> | null;
  search?: string;
  hash?: string;
} = {}) {
  const dataset: Record<string, string> = {};
  const timers: Array<{ callback: () => void; delay: number }> = [];
  const preloads: Array<{ href: string }> = [];
  runInNewContext(PWA_LAUNCH_BOOTSTRAP, {
    document: { documentElement: { dataset }, createElement: () => ({}), head: { appendChild: (link: { href: string }) => preloads.push(link) } },
    location: { pathname: path, search, hash },
    navigator: { userAgent, platform, maxTouchPoints, standalone },
    window: {
      matchMedia: () => ({ matches: standalone }),
      sessionStorage: storage && { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) },
      setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }),
    },
  });
  return { dataset, timers, preloads };
}

describe('page launch intro', () => {
  it('starts for installed mobile app page loads', () => {
    expect(launch().dataset.rchLaunch).toBe('active');
    expect(launch().dataset.rchLaunchBoot).toBe('pending');
    expect(launch({ path: '/discover' }).dataset.rchLaunch).toBe('active');
  });
  it('starts once per browser tab on an entrance and skips browser deep links', () => {
    const storage = new Map<string, string>();
    const web = { standalone: false, storage };
    expect(launch({ ...web, path: '/news/story' }).preloads).toHaveLength(0);
    expect(launch({ ...web, path: '/' }).preloads.map(link => link.href)).toEqual([RCH_LAUNCH_MURAL]);
    expect(launch({ ...web, path: '/social' }).dataset.rchLaunch).toBeUndefined();
    expect(launch({ standalone: false, path: '/social/' }).dataset.rchLaunchBoot).toBe('pending');
    expect(launch({ standalone: false, path: '/', storage: null }).dataset.rchLaunch).toBeUndefined();
    expect(launch({ standalone: true, userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0, path: '/discover' }).preloads).toHaveLength(0);
    expect(launch({ standalone: true, userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5, path: '/discover' }).preloads).toHaveLength(1);
  });
  it('bypasses recovery links, operational tools, Runs and tenant sites', () => {
    for (const path of ['/auth/confirm', '/command/access', '/account/security', '/portal/scorebook', '/sites/partner', '/runs', '/runs/room/example']) {
      expect(launch({ path }).preloads).toHaveLength(0);
    }
    expect(launch({ path: '/', search: '?code=example' }).preloads).toHaveLength(0);
    expect(launch({ path: '/', hash: '#access_token=example&refresh_token=example' }).preloads).toHaveLength(0);
  });
  it('always releases the app screen after the safety timeout', () => {
    const result = launch();
    expect(result.dataset.rchLaunch).toBe('active');
    expect(result.timers.at(-1)?.delay).toBe(RCH_LAUNCH_BOOT_FALLBACK_MS);
    expect(RCH_LAUNCH_BOOT_FALLBACK_MS).toBeGreaterThan(4000);
    expect(RCH_LAUNCH_ROUTE_DELAY_MS).toBeGreaterThan(250);
    result.timers.at(-1)?.callback();
    expect(result.dataset.rchLaunch).toBe('done');
  });
  it('requires page readiness and the minimum hold before opening the PWA', () => {
    expect(canDismissLaunch(true, true, false, true)).toBe(false);
    expect(canDismissLaunch(true, true, true, false)).toBe(true);
    expect(canDismissLaunch(false, true, true, true)).toBe(false);
    // A page-to-page transition is allowed to end as soon as it is ready.
    expect(canDismissLaunch(true, false, false, true)).toBe(true);
    expect(canDismissLaunch(true, false, false, false)).toBe(false);
    expect(RCH_LAUNCH_FALLBACK_MS).toBe(4000);
  });
  it('preloads the shipped mural for the installed app on every cold start', () => {
    const storage = new Map<string, string>();
    for (let i = 0; i < 2; i++) {
      expect(launch({ storage }).preloads.map(link => link.href)).toEqual([RCH_LAUNCH_MURAL]);
    }
    const art = readFileSync(`public${RCH_LAUNCH_MURAL}`);
    expect(art.toString('ascii', 8, 12)).toBe('WEBP');
  });
  it('waits for the shell that the visitor actually launched', () => {
    const publicOnly = { querySelector: (selector: string) => selector === '#rch-public-content'
      ? { querySelector: (child: string) => child === 'main' ? {} : null } : null } as unknown as ParentNode;
    expect(isLaunchContentReady(publicOnly, false)).toBe(true);
    expect(isLaunchContentReady(publicOnly, true)).toBe(false);
  });
  it('waits for main content and feed readiness, not photos or unrelated widgets', () => {
    function documentState(main: boolean, pending: boolean) {
      return { querySelector: () => ({ querySelector: (selector: string) => selector === 'main' ? (main ? {} : null) : (pending ? {} : null) }) } as unknown as ParentNode;
    }
    expect(isLaunchContentReady(documentState(false, false))).toBe(false);
    expect(isLaunchContentReady(documentState(true, true))).toBe(false);
    expect(isLaunchContentReady(documentState(true, false))).toBe(true);
  });
});
