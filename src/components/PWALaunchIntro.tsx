'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isLaunchContentReady,
  RCH_LAUNCH_BOOT_FALLBACK_MS,
  RCH_LAUNCH_FALLBACK_MS,
  RCH_LAUNCH_MIN_DISPLAY_MS,
  RCH_LAUNCH_ROUTE_DELAY_MS,
} from '@/lib/pwa-launch';

const authRoute = (pathname: string) => /^\/auth(?:\/|$)/.test(pathname);

/**
 * Installed-app boot: play the entire four-second RCH film once, then
 * reveal the ready page. Route transitions: only show for slow navigation,
 * and never hold the user for a full film on each click.
 */
export function PWALaunchIntro() {
  const pathname = usePathname();
  const mounted = useRef(false);
  const bootInProgress = useRef(false);
  const bootVideoFinished = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const checkReadyRef = useRef<() => void>(() => {});
  const dismissRef = useRef<() => void>(() => {});
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    let navigationSafety: number | undefined;
    const clear = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (navigationSafety !== undefined) window.clearTimeout(navigationSafety);
    };

    const arm = () => {
      clear();
      timer = window.setTimeout(() => {
        const root = document.documentElement;
        if (bootInProgress.current || authRoute(window.location.pathname) || root.dataset.rchLaunch === 'active') return;
        root.dataset.rchLaunch = 'active';
        setVideoReady(false);
        setVideoVisible(true);
        // A cancelled client-side navigation must never hold a stale overlay.
        navigationSafety = window.setTimeout(() => {
          if (root.dataset.rchLaunch === 'active' && !bootInProgress.current) {
            root.dataset.rchLaunch = 'done';
            setVideoVisible(false);
          }
        }, RCH_LAUNCH_FALLBACK_MS);
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
    const firstMount = !mounted.current;
    mounted.current = true;

    if (authRoute(pathname)) {
      bootInProgress.current = false;
      root.dataset.rchLaunch = 'done';
      root.dataset.rchLaunchBoot = 'done';
      setVideoVisible(false);
      return;
    }

    // Bootstrap marks only a cold-start installed mobile PWA with this flag.
    // An ordinary browser load must not force a four-second advertisement.
    const isBoot = firstMount && root.dataset.rchLaunchBoot === 'pending';
    if (firstMount && !isBoot) return;

    let cancelled = false;
    let routeCanDismiss = false;
    let observer: MutationObserver | undefined;
    let revealDelay: number | undefined;
    let minimumTime: number | undefined;
    let initialCheck: number | undefined;
    let fallback: number | undefined;

    const dismiss = () => {
      if (cancelled) return;
      cancelled = true;
      bootInProgress.current = false;
      root.dataset.rchLaunch = 'done';
      root.dataset.rchLaunchBoot = 'done';
      setVideoVisible(false);
      videoRef.current?.pause();
      observer?.disconnect();
      if (revealDelay !== undefined) window.clearTimeout(revealDelay);
      if (minimumTime !== undefined) window.clearTimeout(minimumTime);
      if (initialCheck !== undefined) window.clearTimeout(initialCheck);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };

    const checkReady = () => {
      if (cancelled || !isLaunchContentReady(document)) return;
      if (isBoot) {
        // Never release the opening screen until the actual video has ended.
        if (bootVideoFinished.current) dismiss();
      } else if (routeCanDismiss) {
        dismiss();
      }
    };
    dismissRef.current = dismiss;
    checkReadyRef.current = checkReady;

    if (isBoot) {
      bootInProgress.current = true;
      bootVideoFinished.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.dataset.rchLaunch = 'active';
      setVideoReady(false);
      if (!bootVideoFinished.current) setVideoVisible(true);
      // Safety fallback only: slow loads must not cut off a playing video at 4s.
      fallback = window.setTimeout(dismiss, RCH_LAUNCH_BOOT_FALLBACK_MS);
    } else if (root.dataset.rchLaunch === 'active') {
      routeCanDismiss = false;
      minimumTime = window.setTimeout(() => {
        routeCanDismiss = true;
        checkReady();
      }, RCH_LAUNCH_MIN_DISPLAY_MS);
      fallback = window.setTimeout(dismiss, RCH_LAUNCH_FALLBACK_MS);
    } else {
      routeCanDismiss = true;
      if (!isLaunchContentReady(document)) {
        revealDelay = window.setTimeout(() => {
          if (!cancelled && !isLaunchContentReady(document)) {
            root.dataset.rchLaunch = 'active';
            setVideoReady(false);
            setVideoVisible(true);
          }
        }, RCH_LAUNCH_ROUTE_DELAY_MS);
      }
      fallback = window.setTimeout(dismiss, RCH_LAUNCH_FALLBACK_MS);
    }

    observer = new MutationObserver(checkReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-busy', 'data-rch-launch-pending'],
    });
    initialCheck = window.setTimeout(checkReady, 0);

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (revealDelay !== undefined) window.clearTimeout(revealDelay);
      if (minimumTime !== undefined) window.clearTimeout(minimumTime);
      if (initialCheck !== undefined) window.clearTimeout(initialCheck);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, [pathname]);

  const onVideoEnded = () => {
    if (bootInProgress.current) {
      bootVideoFinished.current = true;
      checkReadyRef.current();
    } else {
      // Slow route changes can replay; they do not have to complete one loop.
      const video = videoRef.current;
      if (video && document.documentElement.dataset.rchLaunch === 'active') {
        video.currentTime = 0;
        void video.play().catch(() => {});
      }
    }
  };

  return (
    <div className="rch-launch" role="status" aria-label="Rich City Hoops is loading" aria-busy="true">
      <button type="button" className="rch-launch-skip" onClick={() => dismissRef.current()}>
        Skip animation
      </button>
      <div className="rch-launch-brand" aria-hidden="true">
        {videoVisible && (
          <video
            ref={videoRef}
            className={'rch-launch-video' + (videoReady ? ' is-ready' : '')}
            autoPlay
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={(event) => { void event.currentTarget.play().catch(() => {}); }}
            onEnded={onVideoEnded}
            onError={() => {
              bootVideoFinished.current = true;
              checkReadyRef.current();
            }}
          >
            <source src="/brand/rch-loader.mp4?v=full-intro-20261010" type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
}
