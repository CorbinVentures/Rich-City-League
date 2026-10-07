'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isLaunchContentReady } from '@/lib/pwa-launch';

/** The same lightweight intro covers each document and client-side page transition. */
export function PWALaunchIntro() {
  const pathname = usePathname();
  const firstPathname = useRef(pathname);

  useEffect(() => {
    const root = document.documentElement;
    if (/^\/auth(?:\/|$)/.test(pathname)) {
      root.dataset.rchLaunch = 'done';
      return;
    }
    root.dataset.rchLaunch = 'active';
    let released = false;
    const finishWhenReady = () => {
      if (released) return;
      if (!isLaunchContentReady(document)) return;
      released = true;
      root.dataset.rchLaunch = 'done';
      observer.disconnect();
      window.clearTimeout(minimumDisplay);
    };
    const observer = new MutationObserver(finishWhenReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-rch-launch-pending'],
    });
    const minimumDisplay = window.setTimeout(finishWhenReady, firstPathname.current === pathname ? 0 : 250);
    const timeout = window.setTimeout(() => {
      released = true;
      root.dataset.rchLaunch = 'done';
      observer.disconnect();
    }, 6000);
    return () => { released = true; observer.disconnect(); window.clearTimeout(minimumDisplay); window.clearTimeout(timeout); };
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
