'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isLaunchContentReady,
  RCH_LAUNCH_FALLBACK_MS,
  RCH_LAUNCH_MIN_DISPLAY_MS,
  RCH_LAUNCH_ROUTE_DELAY_MS,
} from '@/lib/pwa-launch';

const authRoute = (pathname: string) => /^\/auth(?:\/|$)/.test(pathname);

/**
 * One global loading screen for first PWA boot and slow client navigation.
 * Do not add another full-screen route overlay: this is also the destination
 * of the first-load bootstrap in pwa-launch.ts.
 */
export function PWALaunchIntro() {
  const pathname = usePathname();
  const hasMounted = useRef(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // Arm the loader before Next finishes a slow route. usePathname fires only
  // after navigation commits and cannot, by itself, show a pending transition.
  useEffect(() => {
    let timer: number | undefined;
    const clear = () => { if (timer !== undefined) window.clearTimeout(timer); };
    const arm = () => {
      clear();
      timer = window.setTimeout(() => {
        if (!authRoute(window.location.pathname) && document.documentElement.dataset.rchLaunch !== 'active') {
          document.documentElement.dataset.rchLaunch = 'active';
        }
      }, RCH_LAUNCH_ROUTE_DELAY_MS);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.hasAttribute('download') || (link.getAttribute('target') && link.getAttribute('target') !== '_self')) return;
      let next: URL;
      try { next = new URL(link.href, window.location.href); } catch { return; }
      const current = new URL(window.location.href);
      if (next.origin !== current.origin || !['http:', 'https:'].includes(next.protocol) || authRoute(next.pathname)) return;
      if (next.pathname === current.pathname) return;
      // React may prevent default in a handler after the native capture phase.
      clear();
      timer = window.setTimeout(arm, 0);
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', arm);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', arm);
      clear();
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const firstLoad = !hasMounted.current;
    hasMounted.current = true;

    if (authRoute(pathname)) {
      root.dataset.rchLaunch = 'done';
      return;
    }

    let released = false;
    let allowRelease = false;
    let observer: MutationObserver | undefined;
    let revealDelay: number | undefined;
    let minimumTime: number | undefined;
    let readyCheck: number | undefined;
    let fallback: number | undefined;

    const release = () => {
      if (released) return;
      released = true;
      root.dataset.rchLaunch = 'done';
      observer?.disconnect();
      if (revealDelay !== undefined) window.clearTimeout(revealDelay);
      if (minimumTime !== undefined) window.clearTimeout(minimumTime);
      if (readyCheck !== undefined) window.clearTimeout(readyCheck);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };

    const check = () => {
      if (allowRelease && isLaunchContentReady(document)) release();
    };

    const alreadyShowing = root.dataset.rchLaunch === 'active';
    if (firstLoad || alreadyShowing) {
      root.dataset.rchLaunch = 'active';
      minimumTime = window.setTimeout(() => {
        allowRelease = true;
        check();
      }, RCH_LAUNCH_MIN_DISPLAY_MS);
    } else {
      root.dataset.rchLaunch = 'done';
      allowRelease = true;
      if (!isLaunchContentReady(document)) {
        revealDelay = window.setTimeout(() => {
          if (!released && !isLaunchContentReady(document)) root.dataset.rchLaunch = 'active';
        }, RCH_LAUNCH_ROUTE_DELAY_MS);
      }
    }

    observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-rch-launch-pending'],
    });
    readyCheck = window.setTimeout(check, 0);
    fallback = window.setTimeout(release, RCH_LAUNCH_FALLBACK_MS);

    return () => {
      released = true;
      observer?.disconnect();
      if (revealDelay !== undefined) window.clearTimeout(revealDelay);
      if (minimumTime !== undefined) window.clearTimeout(minimumTime);
      if (readyCheck !== undefined) window.clearTimeout(readyCheck);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, [pathname]);

  return (
    <div className="rch-launch" aria-label="Rich City Hoops is loading" aria-busy="true">
      <button type="button" className="rch-launch-skip" onClick={() => { document.documentElement.dataset.rchLaunch = 'done'; }}>
        Skip loading animation
      </button>
      <div className="rch-launch-brand">
        <img className="rch-launch-poster" src="/brand/rch-loader-poster.svg" alt="" aria-hidden="true" />
        {!videoFailed && (
          <video
            className={'rch-launch-video' + (videoReady ? ' is-ready' : '')}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/brand/rch-loader-poster.svg"
            aria-hidden="true"
            onLoadedData={() => setVideoReady(true)}
            onError={() => setVideoFailed(true)}
          >
            <source src="/brand/rch-loader.mp4" type="video/mp4" />
          </video>
        )}
      </div>
      <div className="rch-launch-footer" role="status" aria-live="polite">
        <p>Loading your basketball world...</p>
        <div className="rch-launch-dots" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </div>
  );
}
