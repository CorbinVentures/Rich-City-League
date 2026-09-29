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
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

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

    if ('serviceWorker' in navigator && window.isSecureContext) {
      const register = () => {
        void navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((registration) => registration.update())
          .catch(() => undefined);
      };
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installedHandler);
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
