'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminControlShortcut } from '@/components/AdminControlShortcut';
import { LegalFooter } from '@/components/LegalFooter';

export function PlatformChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAccessGateway = pathname === '/access';

  if (isAccessGateway) {
    return <div className="rcl-access-gateway">{children}</div>;
  }

  return (
    <>
      <SiteHeader />
      <AdminControlShortcut />
      <div className="rcl-platform-root">{children}</div>
      <LegalFooter />
    </>
  );
}
