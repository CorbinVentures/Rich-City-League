import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Account settings",
  description: "Manage your Rich City League account preferences.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
