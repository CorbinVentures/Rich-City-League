import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "League administration",
  description: "Manage Rich City League operations.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
