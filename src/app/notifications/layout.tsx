import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your Rich City League updates.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
