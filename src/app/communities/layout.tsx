import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Communities",
  description: "Find and join your Rich City League basketball communities.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
