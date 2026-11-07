import { LeagueCenterExperience } from '@/components/LeagueCenterExperience';

export const metadata = {
  title: 'Rich City League | A New Era of Virginia Basketball',
  description: 'Follow the Rich City League season, its twelve franchises, game schedule, highlights, and community stories across Virginia.',
  alternates: { canonical: '/league' },
};

export default function LeagueCenterPage() {
  return <LeagueCenterExperience />;
}
