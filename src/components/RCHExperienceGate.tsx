'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { RCHBrowserMemberNotice } from '@/components/RCHBrowserMemberNotice';
import { RCHPublicWebShell } from '@/components/RCHPublicWebShell';
import { isBrowserAccountRoute, isBrowserPublicRoute, isBrowserMemberRoute, isMobileStandaloneExperience } from '@/lib/rch-mobile-experience';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'checking' | 'mobile-app' | 'browser';

function BrowserMemberContent({ pathname, children }: { pathname: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <main className="rch-browser-loading" role="status" aria-live="polite">
      <span className="rch-browser-loading-mark">RCH</span>
      <span>Checking your member session…</span>
    </main>;
  }
  if (!user) return <RCHBrowserMemberNotice pathname={pathname}/>;
  return <div className="rch-browser-member-workspace">
    <div className="rch-browser-member-workspace-label">RCH MEMBER WORKSPACE <span>·</span> SIGNED IN</div>
    {children}
  </div>;
}

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
    return <RCHPublicWebShell>{publicContent}</RCHPublicWebShell>;
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

  // Authenticated browser members can use actual member pages in the website
  // shell (not PlatformChrome). Middleware/RLS still gate privileged routes.
  // Do not render private children while the browser session is unresolved.
  if (mode === 'browser' && isBrowserMemberRoute(pathname)) {
    return <RCHPublicWebShell><BrowserMemberContent pathname={pathname}>{publicContent}</BrowserMemberContent></RCHPublicWebShell>;
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
