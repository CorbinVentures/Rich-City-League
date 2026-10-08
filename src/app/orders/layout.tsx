import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Your orders",
  description: "Track your Rich City League orders.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
