import type { Metadata } from 'next';
import { AdminRouteFrame } from '@/components/AdminRouteFrame';
import './admin-theme.css';

export const metadata: Metadata = {
  title: 'Administration',
  description: 'Manage Rich City Hoops league operations and the RCH platform.',
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminRouteFrame>{children}</AdminRouteFrame>;
}
