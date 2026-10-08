'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isLaunchContentReady, RCH_LAUNCH_FALLBACK_MS, RCH_LAUNCH_MIN_DISPLAY_MS, RCH_LAUNCH_ROUTE_DELAY_MS } from '@/lib/pwa-launch';

/**
 * Full branded intro on document load. On client navigation, only show it if
 * the destination is still pending after a short delay. Fast routes stay clear.
 */
export function PWALaunchIntro() {
  const pathname = usePathname();
  const hasMounted = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const isDocumentLoad = !hasMounted.current;
    hasMounted.current = true;

    if (/^\/auth(?:\/|$)/.test(pathname)) {
      root.dataset.rchLaunch = 'done';
      return;
    }

    let released = false;
    let canFinish = !isDocumentLoad;
    let observer: MutationObserver | undefined;
    let showDelay: number | undefined;
    let minimumDisplay: number | undefined;
    let readinessCheck: number | undefined;
    let fallback: number | undefined;

    const release = () => {
      if (released) return;
      released = true;
      root.dataset.rchLaunch = 'done';
      observer?.disconnect();
      if (showDelay !== undefined) window.clearTimeout(showDelay);
      if (minimumDisplay !== undefined) window.clearTimeout(minimumDisplay);
      if (readinessCheck !== undefined) window.clearTimeout(readinessCheck);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };

    const finishWhenReady = () => {
      if (canFinish && isLaunchContentReady(document)) release();
    };

    if (isDocumentLoad) {
      root.dataset.rchLaunch = 'active';
      minimumDisplay = window.setTimeout(() => {
        canFinish = true;
        finishWhenReady();
      }, RCH_LAUNCH_MIN_DISPLAY_MS);
    } else {
      root.dataset.rchLaunch = 'done';
      if (!isLaunchContentReady(document)) {
        showDelay = window.setTimeout(() => {
          if (!released && !isLaunchContentReady(document)) root.dataset.rchLaunch = 'active';
        }, RCH_LAUNCH_ROUTE_DELAY_MS);
      }
    }

    observer = new MutationObserver(finishWhenReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-rch-launch-pending'],
    });
    readinessCheck = window.setTimeout(finishWhenReady, 0);
    fallback = window.setTimeout(release, RCH_LAUNCH_FALLBACK_MS);

    return () => {
      released = true;
      observer?.disconnect();
      if (showDelay !== undefined) window.clearTimeout(showDelay);
      if (minimumDisplay !== undefined) window.clearTimeout(minimumDisplay);
      if (readinessCheck !== undefined) window.clearTimeout(readinessCheck);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, [pathname]);

  return (
    <div className="rch-launch">
      <span className="sr-only" role="status">Opening Rich City Hoops</span>
      <button type="button" className="rch-launch-skip" onClick={() => { document.documentElement.dataset.rchLaunch = 'done'; }}>Skip opening screen</button>
      <div className="rch-launch-brand" aria-hidden="true">
        <svg className="rch-launch-mark" viewBox="0 0 280 205" focusable="false">
          <path fill="currentColor" fillRule="evenodd" d="M62 8 254 4 267 20 240 78 204 108 240 201 161 201 136 141 112 141 79 201 1 201 87 34ZM134 49 113 96 168 83 186 68 191 49Z" />
        </svg>
        <div className="rch-launch-halo"><i /><i /><i /></div>
        <p className="rch-launch-name">RICH CITY HOOPS</p>
      </div>
      <div className="rch-launch-footer" aria-hidden="true">
        <p>Richmond basketball, connected.</p>
        <div className="rch-launch-dots"><i /><i /><i /></div>
      </div>
    </div>
  );
}
