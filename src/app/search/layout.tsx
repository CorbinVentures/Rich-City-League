import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Search RCL",
  description: "Find players, teams, games, and community members.",
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
