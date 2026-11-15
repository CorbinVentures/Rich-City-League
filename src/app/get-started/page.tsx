import type { Metadata } from 'next';
import { PlatformGettingStarted } from '@/components/PlatformGettingStarted';

export const metadata: Metadata = {
  title: { absolute: 'Get Started | Rich City Hoops' },
  description: 'A guided tour of the Rich City Hoops platform for players: profiles, social, discovery, Runs, communities, RCH TV, league updates, REP and badges.',
  alternates: { canonical: '/get-started' },
};

export default function GetStartedPage() {
  return <PlatformGettingStarted />;
}
