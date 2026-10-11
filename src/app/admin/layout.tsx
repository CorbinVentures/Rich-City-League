import type { Metadata } from 'next';
import { AdminTopbar, AdminWorkspace } from '@/components/AdminWorkspace';
import './admin-theme.css';

export const metadata: Metadata = {
  title: 'Administration',
  description: 'Manage Rich City Hoops league operations and the RCH platform.',
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
