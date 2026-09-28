import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Player Lab",
  description: "Track your basketball assessments, programs, and private notes.",
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
