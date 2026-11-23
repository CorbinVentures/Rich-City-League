import type { Metadata } from 'next';
import { RoyalteeJoinForm } from '@/components/RoyalteeJoinForm';

export const metadata: Metadata = {
  title: 'Join Royaltee 18+ Cheer & Step',
  description: 'Request an adult Royaltee cheer or step identity on your existing Rich City Hoops profile.',
  alternates: { canonical: '/league/royaltee/join' },
  openGraph: {
    type: 'website',
    url: '/league/royaltee/join',
    title: 'Join Royaltee 18+ Cheer & Step',
    description: 'Request an adult Royaltee cheer or step identity on your existing Rich City Hoops profile.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join Royaltee 18+ Cheer & Step',
    description: 'Request an adult Royaltee cheer or step identity on your existing Rich City Hoops profile.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

export default function RoyalteeJoinPage(){return <RoyalteeJoinForm/>;}
