import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PWA_LAUNCH_BOOTSTRAP, isLaunchContentReady, canDismissLaunch, RCH_LAUNCH_BOOT_FALLBACK_MS, RCH_LAUNCH_FALLBACK_MS, RCH_LAUNCH_ROUTE_DELAY_MS } from '../src/lib/pwa-launch';

function launch({ path = '/social', standalone = true, userAgent = 'iPhone', platform = 'iPhone', maxTouchPoints = 1 }: {
  path?: string;
  standalone?: boolean;
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
} = {}) {
  const dataset: Record<string, string> = {};
  const timers: Array<{ callback: () => void; delay: number }> = [];
  runInNewContext(PWA_LAUNCH_BOOTSTRAP, {
    document: { documentElement: { dataset } },
    location: { pathname: path },
    navigator: { userAgent, platform, maxTouchPoints, standalone },
    window: {
      matchMedia: () => ({ matches: standalone }),
      setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }),
    },
  });
  return { dataset, timers };
}

describe('page launch intro', () => {
  it('starts for installed mobile app page loads', () => {
    expect(launch().dataset.rchLaunch).toBe('active');
    expect(launch().dataset.rchLaunchBoot).toBe('pending');
    expect(launch({ path: '/discover' }).dataset.rchLaunch).toBe('active');
  });
  it('does not cover ordinary browsers or desktop PWAs', () => {
    expect(launch({ standalone: false }).dataset.rchLaunch).toBeUndefined();
    expect(launch({ standalone: true, userAgent: 'Mozilla/5.0 Windows NT 10.0', platform: 'Win32' }).dataset.rchLaunch).toBeUndefined();
    expect(launch({ standalone: true, userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 }).dataset.rchLaunch).toBeUndefined();
  });
  it('does not cover account recovery', () => {
    expect(launch({ path: '/auth/confirm' }).dataset.rchLaunch).toBeUndefined();
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
  it('requires the actual final video frame before dismissing an installed-app intro', () => {
    expect(canDismissLaunch(true, true, false, true)).toBe(false);
    expect(canDismissLaunch(true, true, true, false)).toBe(true);
    expect(canDismissLaunch(false, true, true, true)).toBe(false);
    // A page-to-page transition is allowed to end as soon as it is ready.
    expect(canDismissLaunch(true, false, false, true)).toBe(true);
    expect(canDismissLaunch(true, false, false, false)).toBe(false);
    expect(RCH_LAUNCH_FALLBACK_MS).toBe(4000);
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
