import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Your profile",
  description: "Manage your Rich City League profile.",
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
