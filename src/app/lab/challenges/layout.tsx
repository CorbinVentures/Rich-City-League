import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Lab challenges",
  description: "Track measurable basketball practice challenges.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
