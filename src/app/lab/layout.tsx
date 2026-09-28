import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The Lab",
  description: "Build workouts and track your basketball development with Rich City League.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
