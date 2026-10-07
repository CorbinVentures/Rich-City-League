import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PWA_LAUNCH_BOOTSTRAP, isLaunchContentReady } from '../src/lib/pwa-launch';

function launch({ standalone = true, ios = false, path = '/social', seen = false, storageDenied = false } = {}) {
  const dataset: Record<string, string> = {};
  const timers: Array<{ callback: () => void; delay: number }> = [];
  const storage = new Map<string, string>(seen ? [['rch-launch-v1', '1']] : []);
  runInNewContext(PWA_LAUNCH_BOOTSTRAP, {
    document: { documentElement: { dataset } },
    navigator: { standalone: ios },
    location: { pathname: path },
    window: { matchMedia: () => ({ matches: standalone }), setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }) },
    sessionStorage: {
      getItem: (key: string) => { if (storageDenied) throw Error('Storage unavailable'); return storage.get(key); },
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  return { dataset, timers, storage };
}

describe('installed PWA launch', () => {
  it('starts immediately for standalone and iOS home-screen launches', () => {
    expect(launch().dataset.rchLaunch).toBe('active');
    expect(launch({ standalone: false, ios: true }).dataset.rchLaunch).toBe('active');
  });
  it('does not cover ordinary browsing or account recovery', () => {
    expect(launch({ standalone: false }).dataset.rchLaunch).toBeUndefined();
    expect(launch({ path: '/auth/confirm' }).dataset.rchLaunch).toBeUndefined();
  });
  it('does not replay after a full navigation in the same session', () => {
    expect(launch().storage.get('rch-launch-v1')).toBe('1');
    expect(launch({ seen: true }).dataset.rchLaunch).toBeUndefined();
  });
  it('always releases the screen even when hydration or storage fails', () => {
    const result = launch({ storageDenied: true });
    expect(result.dataset.rchLaunch).toBe('active');
    expect(result.timers[0].delay).toBe(6000);
    result.timers[0].callback();
    expect(result.dataset.rchLaunch).toBe('done');
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
