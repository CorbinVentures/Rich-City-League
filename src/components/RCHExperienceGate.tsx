'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RCHBrowserMemberNotice } from '@/components/RCHBrowserMemberNotice';
import { RCHPublicWebShell } from '@/components/RCHPublicWebShell';
import { isBrowserAccountRoute, isBrowserPublicRoute, isMobileStandaloneExperience } from '@/lib/rch-mobile-experience';

type Mode = 'checking' | 'mobile-app' | 'browser';

export function RCHExperienceGate({ children, publicContent }: { children: ReactNode; publicContent: ReactNode; apkUrl: string | null }) {
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

  // Public pages are server-rendered in normal browsers, without mounting member
  // app chrome or background social/notification effects. PWA mode is unchanged.
  if (isBrowserPublicRoute(pathname) && mode !== 'mobile-app') {
    return <RCHPublicWebShell>{publicContent}</RCHPublicWebShell>;
  }

  // Middleware's guest redirect ends at /member-access. Keep that landing
  // browser-native; the original member workspace remains untouched in PWA.
  if (mode === 'browser' && pathname === '/member-access') {
    return <RCHPublicWebShell><RCHBrowserMemberNotice pathname={pathname}/></RCHPublicWebShell>;
  }

  // Profile setup and MFA security remain functional in a browser, but get the
  // website's own shell instead of the installed-PWA wrapper.
  if (mode === 'browser' && (pathname === '/profile' || pathname === '/account/security' || pathname === '/account/security/')) {
    return <RCHPublicWebShell>{publicContent}</RCHPublicWebShell>;
  }

  // Browser-only auth screens share the public brand; installed-PWA auth is unchanged.
  // Security/MFA and Command Center exceptions retain their original protected flow.
  if (mode === 'browser' && (pathname === '/auth' || pathname.startsWith('/auth/'))) {
    return <RCHPublicWebShell>{publicContent}</RCHPublicWebShell>;
  }

  // Account registration, profile setup, recovery and legal policies remain available
  // in normal browsers; member PWA functionality stays in installed mobile mode.
  if (browserAccountRoute || mode === 'mobile-app') return <>{children}</>;

  if (mode === 'checking') {
    return (
      <div className="rch-browser-loading" role="status" aria-label="Opening Rich City Hoops">
        <span className="rch-browser-loading-mark">RCH</span>
        <span>THE CITY. THE GAME. THE COMMUNITY.</span>
      </div>
    );
  }

  // Keep unsupported/private account routes branded and navigable without
  // revealing any member-only data or mounting PWA UI in normal browsers.
  return <RCHPublicWebShell><RCHBrowserMemberNotice pathname={pathname}/></RCHPublicWebShell>;
}
