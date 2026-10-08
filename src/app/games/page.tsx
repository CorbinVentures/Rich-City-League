import type { Metadata } from 'next';
import { GameCenterExperience } from '@/components/GameCenterExperience';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate = 60;
export const metadata: Metadata = {
  title: { absolute: 'Richmond Basketball Schedule & Scores | RCL' },
  description: 'Rich City League schedules, live scores, game results, standings, and player performances.',
  alternates: { canonical: '/games' },
};

export default async function GamesPage() {
  const { games, teams, seasons, standings, venues } = await getLeagueSnapshot();
  return <main className="relative min-h-screen overflow-hidden"><ContentAssetBackground assetKey="games.cover" opacity={0.12} /><div className="relative z-10"><GameCenterExperience games={games} teams={teams} seasons={seasons} standings={standings} venues={venues} /></div></main>;
}
