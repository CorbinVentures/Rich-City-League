'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminControlShortcut } from '@/components/AdminControlShortcut';
import { LegalFooter } from '@/components/LegalFooter';

export function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAccessGateway = pathname === '/access';
  const isImmersiveScorebook = pathname === '/portal/scorebook';

  if (isAccessGateway) {
    return <div className="rcl-access-gateway"><a className="rcl-skip-link" href="#rcl-content">Skip to content</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  if (isImmersiveScorebook) {
    return <div className="min-h-svh bg-[#03070d]"><a className="rcl-skip-link" href="#rcl-content">Skip to scorebook</a><div id="rcl-content" tabIndex={-1}>{children}</div></div>;
  }

  return (
    <>
      <a className="rcl-skip-link" href="#rcl-content">Skip to content</a>
      <SiteHeader />
      <AdminControlShortcut />
      <div id="rcl-content" tabIndex={-1} className="rcl-platform-root">{children}</div>
      <LegalFooter />
    </>
  );
}
