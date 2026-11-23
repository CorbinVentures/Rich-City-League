import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Richmond Pickup Basketball Players',
  description: 'Find Richmond pickup basketball runs, meet local players and crews, and build a public basketball profile with Rich City Hoops across Virginia.',
  alternates: { canonical: '/join/players' },
  openGraph: {
    type: 'website',
    url: '/join/players',
    title: 'Richmond Pickup Basketball Players',
    description: 'Find Richmond pickup basketball runs, meet local players and crews, and build a public basketball profile with Rich City Hoops across Virginia.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Richmond Pickup Basketball Players',
    description: 'Find Richmond pickup basketball runs, meet local players and crews, and build a public basketball profile with Rich City Hoops across Virginia.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

export default function Page() { return <RCHAudienceJoinPage audience="players" />; }
