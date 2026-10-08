'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RCHAppDownload } from '@/components/RCHAppDownload';
import { isBrowserAccountRoute, isMobileStandaloneExperience } from '@/lib/rch-mobile-experience';

type Mode = 'checking' | 'mobile-app' | 'browser';

export function RCHExperienceGate({ children, apkUrl }: { children: ReactNode; apkUrl: string | null }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>('checking');
  const browserAccountRoute = isBrowserAccountRoute(pathname);

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
    setMode(isMobileStandaloneExperience({
      standalone,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
    }) ? 'mobile-app' : 'browser');
  }, []);

  // Account registration, profile setup, recovery and legal policies remain available
  // in normal browsers; PWA functionality stays inside installed mobile mode.
  if (browserAccountRoute || mode === 'mobile-app') return <>{children}</>;

  if (mode === 'checking') {
    return (
      <div className="rch-browser-loading" role="status" aria-label="Opening Rich City Hoops">
        <span className="rch-browser-loading-mark">RCH</span>
        <span>THE CITY. THE GAME. THE COMMUNITY.</span>
      </div>
    );
  }

  // Do not mount app chrome, calls, notifications, or the social experience in browsers.
  return <div className="rcl-platform-root rch-browser-only"><RCHAppDownload apkUrl={apkUrl} /></div>;
}
