import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RCL Draft Night',
  description: 'Rich City League Draft Night — Richmond basketball, real players, real opportunity.',
  alternates: { canonical: '/draft' },
  openGraph: {
    title: 'RCL Draft Night | Rich City League',
    description: 'Follow the official Rich City League draft board, prospects, order, and live selections.',
    url: '/draft',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RCL Draft Night | Rich City League',
    description: 'Richmond basketball. Real players. Real opportunity.',
  },
};

export default function DraftLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
