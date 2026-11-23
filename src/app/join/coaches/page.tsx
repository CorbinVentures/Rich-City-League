import { RCHAudienceJoinPage } from '@/components/RCHAudienceJoinPage';

export const metadata = {
  title: 'Basketball Coaches Network in Virginia',
  description: 'Connect with Richmond and Virginia basketball athletes, discover local opportunities, and build a coaching profile with Rich City Hoops.',
  alternates: { canonical: '/join/coaches' },
  openGraph: {
    type: 'website',
    url: '/join/coaches',
    title: 'Basketball Coaches Network in Virginia',
    description: 'Connect with Richmond and Virginia basketball athletes, discover local opportunities, and build a coaching profile with Rich City Hoops.',
    siteName: 'Rich City Hoops',
    images: [{ url: 'https://www.richcityhoops.com/opengraph-image?v=20261014', width: 1200, height: 630, alt: 'Rich City Hoops — Virginia basketball community' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Basketball Coaches Network in Virginia',
    description: 'Connect with Richmond and Virginia basketball athletes, discover local opportunities, and build a coaching profile with Rich City Hoops.',
    images: ['https://www.richcityhoops.com/opengraph-image?v=20261014'],
  },
};

export default function Page() { return <RCHAudienceJoinPage audience="coaches" />; }
