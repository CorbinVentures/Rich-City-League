'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import {
  isLaunchContentReady,
  canDismissLaunch,
  RCH_LAUNCH_EXCLUDED_PATH,
  RCH_LAUNCH_MURAL,
  RCH_LAUNCH_BOOT_FALLBACK_MS,
  RCH_LAUNCH_FALLBACK_MS,
  RCH_LAUNCH_MIN_DISPLAY_MS,
  RCH_LAUNCH_ROUTE_DELAY_MS,
} from '@/lib/pwa-launch';

const BOOT_HOLD_MS = 650;
const ART_GRACE_MS = 1400;
const FADE_MS = 280;

const protectedRoute = (path: string) => RCH_LAUNCH_EXCLUDED_PATH.test(path);
const runsRoute = (path: string) => path === '/runs' || path.startsWith('/runs/');

// CSS can paint this server-rendered element as soon as the launch bootstrap opts in.
const muralStyle = { '--rch-launch-art': `url("${RCH_LAUNCH_MURAL}")` } as CSSProperties;

export function PWALaunchIntro() {
  const pathname = usePathname();
  const mounted = useRef(false);
  const bootInProgress = useRef(false);
  const dismissRef = useRef<() => void>(() => {});
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);

  // Only the installed app uses the small, delayed page-to-page loader.
  useEffect(() => {
    if (document.documentElement.dataset.rchLaunchMode !== 'app') return;
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
        const dismissNavigation = () => {
          if (!bootInProgress.current && root.dataset.rchLaunch === 'active') {
            root.dataset.rchLaunch = 'done';
            setVisible(false);
          }
        };
        dismissRef.current = dismissNavigation;
        safetyTimer = window.setTimeout(dismissNavigation, RCH_LAUNCH_FALLBACK_MS);
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

    const boot = root.dataset.rchLaunchBoot === 'pending';
    const installedApp = root.dataset.rchLaunchMode === 'app';
    if (!boot && (firstMount || !installedApp)) return;

    let stopped = false;
    let holdFinished = false;
    let routeReady = false;
    let fading = false;
    let artwork: HTMLImageElement | undefined;
    const contentReady = () => isLaunchContentReady(document, installedApp);
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
      if (stopped || !canDismissLaunch(contentReady(), boot, holdFinished, routeReady)) return;
      if (boot) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          dismiss();
          return;
        }
        if (fading) return;
        fading = true;
        setOpening(true);
        later(dismiss, FADE_MS);
      } else {
        dismiss();
      }
    };

    if (boot) {
      bootInProgress.current = true;
      root.dataset.rchLaunch = 'active';
      setOpening(false);
      setVisible(true);
      let settled = false;
      const finishHold = () => { holdFinished = true; checkReady(); };
      const settleArtwork = (loaded: boolean) => {
        if (settled || stopped) return;
        settled = true;
        if (loaded) {
          root.dataset.rchMuralReady = 'true';
          later(finishHold, BOOT_HOLD_MS);
        } else {
          finishHold();
        }
      };
      artwork = new Image();
      artwork.onload = () => settleArtwork(true);
      artwork.onerror = () => settleArtwork(false);
      artwork.src = RCH_LAUNCH_MURAL;
      if (artwork.complete) settleArtwork(artwork.naturalWidth > 0);
      // Start the hold with a complete image. Let a ready page through on slow connections.
      later(() => settleArtwork(false), ART_GRACE_MS);
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
      if (!contentReady()) {
        later(() => {
          if (!stopped && !contentReady()) {
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
      if (artwork) { artwork.onload = null; artwork.onerror = null; }
      observer?.disconnect();
      timeouts.forEach(id => window.clearTimeout(id));
    };
  }, [pathname]);

  // Authentication and command-access routes must server-render their real controls.
  // Do not leave a decorative "Skip intro" button as the only crawlable form content.
  if (protectedRoute(pathname) || runsRoute(pathname)) return null;

  return (
    <div className={'rch-launch' + (opening ? ' is-opening' : '')} style={muralStyle} role="status" aria-label="Opening Rich City Hoops" aria-busy={visible && !opening}>
      <span className="rch-launch-wordmark" aria-hidden="true">Rich City Hoops</span>
      <div className="rch-launch-art" aria-hidden="true" />
      {visible && (
        <button type="button" className="rch-launch-skip" onClick={() => dismissRef.current()}>
          Skip intro
        </button>
      )}
    </div>
  );
}
