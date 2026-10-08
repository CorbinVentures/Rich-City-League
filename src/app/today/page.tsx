import type { Metadata } from 'next';
import { BasketballOSToday } from '@/components/BasketballOSToday';

export const metadata: Metadata = {
  title: { absolute: 'RCH Today | Rich City Hoops' },
  description: 'RCH Today: real Richmond basketball activity, local runs, community conversation, organizations, and Rich City League games.',
  alternates: { canonical: '/today' },
};

export default function TodayPage() {
  return <BasketballOSToday />;
}
