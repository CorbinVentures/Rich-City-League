import VirginiaWorld from '@/components/discover/VirginiaWorld';

export const metadata = {
  title: 'Discover Basketball | Virginia World | Rich City Hoops',
  description: 'Explore a 3D Virginia basketball map. Find courts, open runs, published events and city basketball communities.',
  alternates: { canonical: '/discover' },
};

export default function DiscoverBasketballPage() {
  return <VirginiaWorld />;
}
