import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PWA_LAUNCH_BOOTSTRAP, isLaunchContentReady } from '../src/lib/pwa-launch';

function launch({ path = '/social' } = {}) {
  const dataset: Record<string, string> = {};
  const timers: Array<{ callback: () => void; delay: number }> = [];
  runInNewContext(PWA_LAUNCH_BOOTSTRAP, {
    document: { documentElement: { dataset } },
    location: { pathname: path },
    window: { setTimeout: (callback: () => void, delay: number) => timers.push({ callback, delay }) },
  });
  return { dataset, timers };
}

describe('page launch intro', () => {
  it('starts for every regular page load', () => {
    expect(launch().dataset.rchLaunch).toBe('active');
    expect(launch({ path: '/discover' }).dataset.rchLaunch).toBe('active');
  });
  it('does not cover account recovery', () => {
    expect(launch({ path: '/auth/confirm' }).dataset.rchLaunch).toBeUndefined();
  });
  it('always releases the screen after the safety timeout', () => {
    const result = launch();
    expect(result.dataset.rchLaunch).toBe('active');
    expect(result.timers.at(-1)?.delay).toBe(6000);
    result.timers.at(-1)?.callback();
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
