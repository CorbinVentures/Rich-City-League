import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "RCL Shop",
  description: "Explore Rich City League merchandise.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
