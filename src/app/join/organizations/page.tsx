import type { Metadata } from 'next';
import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata: Metadata = {
  title: 'Basketball Organization Websites & Tools',
  description: 'Build your basketball organization’s online presence and explore scheduling, registration and community tools for programs across Virginia.',
  alternates: { canonical: '/join/organizations' },
  openGraph: {
    type: 'website',
    url: '/join/organizations',
    title: 'Basketball Organization Websites & Tools',
    description: 'Build your basketball organization’s online presence and explore scheduling, registration and community tools for programs across Virginia.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Basketball Organization Websites & Tools',
    description: 'Build your basketball organization’s online presence and explore scheduling, registration and community tools for programs across Virginia.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

export default function Page() { return <RCHAudienceJoinPage audience="organizations" />; }
