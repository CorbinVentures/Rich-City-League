import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Communities",
  description: "Find and join your Rich City League basketball communities.",
  // Community discovery is currently client-rendered and user-generated.
  // Keep it out of search until public community content is server-rendered.
  robots: { index: false, follow: true, noarchive: true },
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
