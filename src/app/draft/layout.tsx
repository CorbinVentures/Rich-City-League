import type { Metadata } from 'next';
import { DraftConfiguredRules } from '@/components/DraftConfiguredRules';

export const metadata: Metadata = {
  title: 'RCL Draft Night',
  description: 'Rich City League Draft Night — Richmond basketball, real players, real opportunity.',
  alternates: { canonical: '/draft' },
  openGraph: {
    images: [{ url: 'https://richcityhoops.com/rcl-share-20261002.png', width: 1200, height: 630, alt: 'RCL — Richmond basketball social' }],
    title: 'RCL Draft Night | Rich City League',
    description: 'Follow the official Rich City League draft board, prospects, order, and live selections.',
    url: '/draft',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RCL Draft Night | Rich City League',
    description: 'Richmond basketball. Real players. Real opportunity.',
    images: ['https://richcityhoops.com/rcl-share-20261002.png'],
  },
};

export default function DraftLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}<DraftConfiguredRules /></>;
}
