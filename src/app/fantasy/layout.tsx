import type { Metadata } from 'next';
import { FantasyLeagueNavigator } from '@/components/FantasyLeagueNavigator';

export const metadata: Metadata = {
  title: 'Rich City Hoops Fantasy',
  description: 'Build an RCL Fantasy franchise, compete in the public league or create an invite-only private league powered by official Rich City League player stats.',
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><FantasyLeagueNavigator />{children}</>;
}
