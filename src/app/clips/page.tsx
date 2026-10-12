import type { Metadata } from 'next';
import RchClipsFeed from '@/components/social/RchClipsFeed';

export const metadata: Metadata = {
  title: 'RCH Clips | Basketball Video Feed',
  description: 'Discover real basketball highlights and clips from the Rich City Hoops community.'
};

export default function ClipsPage() {
  return <RchClipsFeed />;
}
