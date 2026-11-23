import type { Metadata } from 'next';
import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata: Metadata = {
  title: 'Virginia Basketball for Fans',
  description: 'Follow Virginia basketball players, Richmond stories, local highlights and Rich City League updates in one free basketball community.',
  alternates: { canonical: '/join/fans' },
  openGraph: {
    type: 'website',
    url: '/join/fans',
    title: 'Virginia Basketball for Fans',
    description: 'Follow Virginia basketball players, Richmond stories, local highlights and Rich City League updates in one free basketball community.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virginia Basketball for Fans',
    description: 'Follow Virginia basketball players, Richmond stories, local highlights and Rich City League updates in one free basketball community.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

export default function Page() { return <RCHAudienceJoinPage audience="fans" />; }
