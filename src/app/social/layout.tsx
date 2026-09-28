import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "RCL Social",
  description: "Connect with Richmond basketball players, coaches, and fans.",
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
