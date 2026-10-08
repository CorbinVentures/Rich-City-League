import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Your dashboard",
  description: "Your Rich City League dashboard.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function PrivateAreaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
