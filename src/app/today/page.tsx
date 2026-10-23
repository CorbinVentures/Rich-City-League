import type { Metadata } from 'next';
import { BasketballOSToday } from '@/components/BasketballOSToday';

export const metadata: Metadata = {
  title: { absolute: 'RCH Today | Rich City Hoops' },
  description: 'RCH Today: Virginia basketball runs, local community conversation, organizations, highlights, and Rich City League games.',
  alternates: { canonical: '/today' },
};

export default function TodayPage() {
  return <BasketballOSToday />;
}
