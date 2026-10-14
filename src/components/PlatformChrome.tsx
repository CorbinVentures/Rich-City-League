'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminControlShortcut } from '@/components/AdminControlShortcut';
import { LegalFooter } from '@/components/LegalFooter';
import { RCHContinueJourney } from '@/components/RCHContinueJourney';

export function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAccessGateway = pathname === '/access';
  const isStandalonePage = pathname === '/app' || pathname === '/profile' || pathname === '/league/royaltee' || pathname.startsWith('/auth/') || pathname.startsWith('/legal/');
  const isImmersiveScorebook = pathname === '/portal/scorebook';
  const isCommand = pathname === '/command' || pathname.startsWith('/command/');

  if (pathname === '/clips') {
    return <div className="rch-clips-immersive"><a className="rcl-skip-link" href="#rcl-content">Skip to clips</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  if (pathname === '/admin/rch-tv/studio') {
    return <div className="rch-broadcast-root"><a className="rcl-skip-link" href="#rcl-content">Skip to broadcast studio</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  if (isStandalonePage) {
    return <div className="rcl-platform-root rch-isolated-page"><a className="rcl-skip-link" href="#rcl-content">Skip to content</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  if (isAccessGateway) {
    return <div className="rcl-access-gateway"><a className="rcl-skip-link" href="#rcl-content">Skip to content</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  if (isCommand) return <div className="rcl-command-immersive">{children}</div>;

  if (isImmersiveScorebook) {
    return <div className="rcl-scorebook-immersive min-h-svh bg-[#03070d]"><a className="rcl-skip-link" href="#rcl-content">Skip to scorebook</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  return (
    <>
      <a className="rcl-skip-link" href="#rcl-content">Skip to content</a>
      <SiteHeader />
      <AdminControlShortcut />
      <div id="rcl-content" tabIndex={-1} className="rcl-platform-root">{children}<RCHContinueJourney pathname={pathname}/></div>
      <LegalFooter />
    </>
  );
}
