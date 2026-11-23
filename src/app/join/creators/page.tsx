import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Virginia Basketball Creators & Media',
  description: 'Share basketball highlights, connect with Virginia hoops communities, and explore RCH TV creator opportunities through Rich City Hoops.',
  alternates: { canonical: '/join/creators' },
  openGraph: {
    type: 'website',
    url: '/join/creators',
    title: 'Virginia Basketball Creators & Media',
    description: 'Share basketball highlights, connect with Virginia hoops communities, and explore RCH TV creator opportunities through Rich City Hoops.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Virginia Basketball Creators & Media',
    description: 'Share basketball highlights, connect with Virginia hoops communities, and explore RCH TV creator opportunities through Rich City Hoops.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

export default function Page() { return <RCHAudienceJoinPage audience="creators" />; }
