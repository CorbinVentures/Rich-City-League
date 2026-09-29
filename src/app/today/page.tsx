import type { Metadata } from 'next';
import { BasketballOSToday } from '@/components/BasketballOSToday';

export const metadata: Metadata = {
  title: { absolute: 'Today in RCL | Rich City League' },
  description: 'Your personalized Rich City League basketball command center for games, REP, missions, runs, training, highlights and community activity.',
  alternates: { canonical: '/today' },
};

export default function TodayPage() {
  return <BasketballOSToday />;
}
