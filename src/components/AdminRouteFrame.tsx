'use client';

import { usePathname } from 'next/navigation';
import { AdminTopbar, AdminWorkspace } from '@/components/AdminWorkspace';

/**
 * Broadcast operation needs a dedicated canvas: the ordinary admin side-rail,
 * breadcrumb and member navigation steal most of the viewport on a phone.
 * Keep the shared admin chrome for every other route.
 */
export function AdminRouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/rch-tv/studio') {
    return <div className="rch-broadcast-stage">{children}</div>;
  }
  return (
    <div className="rch-admin-area">
      <div className="rch-admin-frame">
        <AdminWorkspace />
        <div className="rch-admin-content">
          <AdminTopbar />
          {children}
        </div>
      </div>
    </div>
  );
}
