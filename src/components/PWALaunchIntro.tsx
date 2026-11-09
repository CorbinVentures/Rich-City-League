'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isLaunchContentReady,
  canDismissLaunch,
  RCH_LAUNCH_BOOT_FALLBACK_MS,
  RCH_LAUNCH_FALLBACK_MS,
  RCH_LAUNCH_MIN_DISPLAY_MS,
  RCH_LAUNCH_ROUTE_DELAY_MS,
} from '@/lib/pwa-launch';

const BELT_IMAGE = '/brand/rcl-championship-belt.webp';
const BOOT_HOLD_MS = 650;
const SPLIT_DURATION_MS = 760;

const protectedRoute = (path: string) =>
  /^\/auth(?:\/|$)/.test(path) || path === '/command' || path.startsWith('/command/');
const runsRoute = (path: string) => path === '/runs' || path.startsWith('/runs/');

/**
 * A lightweight championship-belt reveal for an installed RCH mobile PWA.
 * The transparent belt and charcoal curtains split from the middle, revealing
 * the already-rendered page. No video, audio or heavy animation libraries.
 */
export function PWALaunchIntro() {
  const pathname = usePathname();
  const mounted = useRef(false);
  const bootInProgress = useRef(false);
  const beltLoaded = useRef(false);
  const beltFailed = useRef(false);
  const checkReadyRef = useRef<() => void>(() => {});
  const dismissRef = useRef<() => void>(() => {});
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);

  // Keep the existing fast-navigation contract: only delayed client-side
  // transitions get a short loader. The cinematic split is for cold boot.
  useEffect(() => {
    let armTimer: number | undefined;
    let safetyTimer: number | undefined;
    const clear = () => {
      if (armTimer !== undefined) window.clearTimeout(armTimer);
      if (safetyTimer !== undefined) window.clearTimeout(safetyTimer);
    };
    const arm = () => {
      clear();
      if (runsRoute(window.location.pathname)) return;
      armTimer = window.setTimeout(() => {
        const root = document.documentElement;
        if (bootInProgress.current || protectedRoute(window.location.pathname) || root.dataset.rchLaunch === 'active') return;
        root.dataset.rchLaunch = 'active';
        setOpening(false);
        setVisible(true);
        safetyTimer = window.setTimeout(() => {
          if (!bootInProgress.current && root.dataset.rchLaunch === 'active') {
            root.dataset.rchLaunch = 'done';
            setVisible(false);
          }
        }, RCH_LAUNCH_FALLBACK_MS);
      }, RCH_LAUNCH_ROUTE_DELAY_MS);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.hasAttribute('download') || (anchor.getAttribute('target') && anchor.getAttribute('target') !== '_self')) return;
      let next: URL;
      try { next = new URL(anchor.href, window.location.href); } catch { return; }
      const current = new URL(window.location.href);
      if (next.origin !== current.origin || !['http:', 'https:'].includes(next.protocol) || protectedRoute(next.pathname) || runsRoute(next.pathname)) return;
      if (next.pathname === current.pathname) return;
      clear();
      armTimer = window.setTimeout(arm, 0);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', arm);
    return () => {
      clear();
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', arm);
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const firstMount = !mounted.current;
    mounted.current = true;

    if (protectedRoute(pathname) || runsRoute(pathname)) {
      bootInProgress.current = false;
      root.dataset.rchLaunch = 'done';
      root.dataset.rchLaunchBoot = 'done';
      setVisible(false);
      return;
    }

    const boot = firstMount && root.dataset.rchLaunchBoot === 'pending';
    if (firstMount && !boot) return;

    let stopped = false;
    let holdFinished = false;
    let routeReady = false;
    let splitStarted = false;
    let observer: MutationObserver | undefined;
    const timeouts: number[] = [];
    const later = (fn: () => void, ms: number) => {
      const timeout = window.setTimeout(fn, ms);
      timeouts.push(timeout);
    };
    const dismiss = () => {
      if (stopped) return;
      stopped = true;
      bootInProgress.current = false;
      root.dataset.rchLaunch = 'done';
      root.dataset.rchLaunchBoot = 'done';
      setVisible(false);
      observer?.disconnect();
      timeouts.forEach(id => window.clearTimeout(id));
    };
    dismissRef.current = dismiss;

    const checkReady = () => {
      if (stopped || !canDismissLaunch(isLaunchContentReady(document), boot, holdFinished, routeReady)) return;
      if (boot) {
        if (!beltLoaded.current && !beltFailed.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (splitStarted) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          dismiss();
          return;
        }
        splitStarted = true;
        setOpening(true);
        later(dismiss, SPLIT_DURATION_MS);
      } else {
        dismiss();
      }
    };

    checkReadyRef.current = checkReady;

    if (boot) {
      bootInProgress.current = true;
      root.dataset.rchLaunch = 'active';
      setOpening(false);
      setVisible(true);
      later(() => {
        holdFinished = true;
        checkReady();
      }, BOOT_HOLD_MS);
      // Never block account access when an image or a content request stalls.
      later(dismiss, RCH_LAUNCH_BOOT_FALLBACK_MS);
    } else if (root.dataset.rchLaunch === 'active') {
      setOpening(false);
      setVisible(true);
      later(() => {
        routeReady = true;
        checkReady();
      }, RCH_LAUNCH_MIN_DISPLAY_MS);
      later(dismiss, RCH_LAUNCH_FALLBACK_MS);
    } else {
      routeReady = true;
      if (!isLaunchContentReady(document)) {
        later(() => {
          if (!stopped && !isLaunchContentReady(document)) {
            root.dataset.rchLaunch = 'active';
            setOpening(false);
            setVisible(true);
          }
        }, RCH_LAUNCH_ROUTE_DELAY_MS);
      }
      later(dismiss, RCH_LAUNCH_FALLBACK_MS);
    }

    observer = new MutationObserver(checkReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-rch-launch-pending'],
    });
    later(checkReady, 0);

    return () => {
      stopped = true;
      observer?.disconnect();
      timeouts.forEach(id => window.clearTimeout(id));
    };
  }, [pathname]);

  return (
    <div className={'rch-launch' + (opening ? ' is-opening' : '')} role="status" aria-label="Opening Rich City League" aria-busy={visible && !opening}>
      <div className="rch-launch-door rch-launch-door-left" aria-hidden="true" />
      <div className="rch-launch-door rch-launch-door-right" aria-hidden="true" />
      {visible && (
        <div className="rch-launch-belt" aria-hidden="true">
          <div className="rch-launch-belt-half rch-launch-belt-left">
            <img src={BELT_IMAGE} alt="" draggable={false} fetchPriority="high" onLoad={() => { beltLoaded.current = true; checkReadyRef.current(); }} onError={() => { beltFailed.current = true; checkReadyRef.current(); }} />
          </div>
          <div className="rch-launch-belt-half rch-launch-belt-right">
            <img src={BELT_IMAGE} alt="" draggable={false} fetchPriority="high" onLoad={() => { beltLoaded.current = true; checkReadyRef.current(); }} onError={() => { beltFailed.current = true; checkReadyRef.current(); }} />
          </div>
        </div>
      )}
      <button type="button" className="rch-launch-skip" onClick={() => dismissRef.current()}>
        Skip intro
      </button>
    </div>
  );
}
