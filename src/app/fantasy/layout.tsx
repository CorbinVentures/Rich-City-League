import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Fantasy basketball",
  description: "Follow Rich City League fantasy basketball.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
