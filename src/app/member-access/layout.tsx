import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Member access | Rich City Hoops',
  robots: { index: false, follow: false, noarchive: true },
};

export default function MemberAccessLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
