import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Film room",
  description: "Save and revisit private basketball film notes.",
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
