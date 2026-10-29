import { LeagueCenterExperience } from '@/components/LeagueCenterExperience';

export const metadata = {
  title: 'Rich City League | A New Era of Virginia Basketball',
  description: 'Rich City League’s professional basketball season is planned for November 2027. Follow summer 2027 tryouts, Draft Night and Virginia franchise updates.',
  alternates: { canonical: '/league' },
};

export default function LeagueCenterPage() {
  return <LeagueCenterExperience />;
}
