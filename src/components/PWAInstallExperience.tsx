'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaArrowUpFromBracket, FaDownload, FaXmark } from 'react-icons/fa6';

type InstallChoice = {
  outcome: 'accepted' | 'dismissed';
  platform: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const DISMISS_KEY = 'rcl:pwa-install-dismissed-until';
const VERSION_KEY = 'rcl:pwa-deployment-version';
const REFRESH_GUARD_KEY = 'rcl:pwa-refreshing-version';
const REFRESH_QUERY_KEY = '__rclv';
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

async function readDeploymentVersion() {
  try {
    const response = await fetch('/api/pwa-version', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    const payload = await response.json() as { version?: string };
    return payload.version?.trim() || null;
  } catch {
    return null;
  }
}

async function clearRCLWorkerCaches() {
  if (!('caches' in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('rcl-static-')).map((key) => window.caches.delete(key)));
  } catch {
    // A cache cleanup failure should never block the app from opening.
  }
}

function cleanRefreshQuery() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(REFRESH_QUERY_KEY)) return;
    url.searchParams.delete(REFRESH_QUERY_KEY);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Cosmetic URL cleanup only.
  }
}

async function syncPWADeployment(registration: ServiceWorkerRegistration) {
  try {
    await registration.update();
    registration.waiting?.postMessage({ type: 'RCL_SKIP_WAITING' });
  } catch {
    // Version checking below can still refresh the document.
  }

  const version = await readDeploymentVersion();
  if (!version || version === 'development') return;

  let knownVersion = '';
  let refreshGuard = '';
  try {
    knownVersion = window.localStorage.getItem(VERSION_KEY) ?? '';
    refreshGuard = window.sessionStorage.getItem(REFRESH_GUARD_KEY) ?? '';
  } catch {
    return;
  }

  if (!knownVersion) {
    window.localStorage.setItem(VERSION_KEY, version);
    return;
  }

  if (knownVersion === version) {
    if (refreshGuard === version) window.sessionStorage.removeItem(REFRESH_GUARD_KEY);
    return;
  }

  // Persist before navigation so a successful refresh cannot loop.
  window.localStorage.setItem(VERSION_KEY, version);
  if (refreshGuard === version) return;
  window.sessionStorage.setItem(REFRESH_GUARD_KEY, version);

  await clearRCLWorkerCaches();
  registration.waiting?.postMessage({ type: 'RCL_SKIP_WAITING' });

  const url = new URL(window.location.href);
  url.searchParams.set(REFRESH_QUERY_KEY, version.slice(0, 12));
  window.location.replace(url.toString());
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
}

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function readDismissedUntil() {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function storeDismissedUntil(duration: number) {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + duration));
  } catch {
    // Installation guidance still works when storage is unavailable.
  }
}

export function PWAInstallExperience() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [eligible, setEligible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  const suppressPrompt = pathname === '/access'
    || pathname === '/member-access'
    || pathname.startsWith('/auth/')
    || pathname.startsWith('/legal');

  useEffect(() => {
    const standalone = isStandaloneMode();
    setInstalled(standalone);
    if (standalone) {
      document.documentElement.dataset.rclDisplayMode = 'standalone';
    }

    const iosDevice = isIOSDevice();
    setIos(iosDevice);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      setEligible(true);
    };

    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
      setShowIOSGuide(false);
      setDeferredPrompt(null);
      document.documentElement.dataset.rclDisplayMode = 'standalone';
    };

    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installedHandler);

    if (iosDevice && !standalone) setEligible(true);

    cleanRefreshQuery();

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;

    const syncWorker = async () => {
      if (!('serviceWorker' in navigator) || !window.isSecureContext || disposed) return;
      try {
        registration = registration ?? await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        if (!disposed) await syncPWADeployment(registration);
      } catch {
        // The website remains fully usable if service workers are unavailable.
      }
    };

    const visibleHandler = () => {
      if (document.visibilityState === 'visible') void syncWorker();
    };

    const controllerHandler = () => {
      // A newly activated worker should control the next document immediately.
      // The worker itself also navigates controlled clients for iOS reliability.
      cleanRefreshQuery();
    };

    document.addEventListener('visibilitychange', visibleHandler);
    navigator.serviceWorker?.addEventListener('controllerchange', controllerHandler);

    if (document.readyState === 'complete') void syncWorker();
    else window.addEventListener('load', syncWorker, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installedHandler);
      window.removeEventListener('load', syncWorker);
      document.removeEventListener('visibilitychange', visibleHandler);
      navigator.serviceWorker?.removeEventListener('controllerchange', controllerHandler);
    };
  }, []);

  useEffect(() => {
    if (installed || !eligible || suppressPrompt || Date.now() < readDismissedUntil()) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 2200);
    return () => window.clearTimeout(timer);
  }, [eligible, installed, suppressPrompt]);

  const dismiss = () => {
    storeDismissedUntil(TWO_WEEKS);
    setVisible(false);
    setShowIOSGuide(false);
  };

  const install = async () => {
    if (ios) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') {
      setVisible(false);
    } else {
      storeDismissedUntil(ONE_WEEK);
      setVisible(false);
    }
  };

  if (installed || !visible) return null;

  return (
    <aside className="rcl-pwa-install" aria-label="Install Rich City League app">
      <div className="rcl-pwa-install-card">
        <button type="button" onClick={dismiss} className="rcl-pwa-close" aria-label="Dismiss install prompt">
          <FaXmark />
        </button>

        <div className="rcl-pwa-install-heading">
          <Image src="/icon" alt="" width={58} height={58} className="rcl-pwa-icon" unoptimized />
          <div>
            <span className="rcl-pwa-kicker">RCL APP</span>
            <h2>{ios ? 'Add RCL to your Home Screen' : 'Install the RCL app'}</h2>
          </div>
        </div>

        {!showIOSGuide ? (
          <>
            <p className="rcl-pwa-copy">
              Launch Rich City League full-screen with app-style navigation, faster return access, push alerts, and Home Screen notification badges.
            </p>
            <div className="rcl-pwa-actions">
              <button type="button" onClick={() => void install()} className="rcl-pwa-primary">
                {ios ? <FaArrowUpFromBracket /> : <FaDownload />}
                {ios ? 'Show me how' : 'Install RCL'}
              </button>
              <button type="button" onClick={dismiss} className="rcl-pwa-secondary">Not now</button>
            </div>
          </>
        ) : (
          <div className="rcl-pwa-ios-guide" role="dialog" aria-label="Add Rich City League to Home Screen instructions">
            <p className="rcl-pwa-guide-title">On iPhone or iPad</p>
            <ol>
              <li><span>1</span><b>Tap Share</b><small>Use the square-with-arrow icon in your browser toolbar.</small></li>
              <li><span>2</span><b>Choose “Add to Home Screen”</b><small>Scroll the share sheet if the option is lower down.</small></li>
              <li><span>3</span><b>Tap Add</b><small>Open RCL from the new icon, then enable alerts from Notifications to turn on push and the red unread badge.</small></li>
            </ol>
            <div className="rcl-pwa-actions">
              <button type="button" onClick={() => setShowIOSGuide(false)} className="rcl-pwa-primary">
                <FaArrowUpFromBracket /> Got it
              </button>
              <button type="button" onClick={dismiss} className="rcl-pwa-secondary">Close</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
