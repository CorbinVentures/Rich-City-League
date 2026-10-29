import type { Metadata } from 'next';
import { GameCenterExperience } from '@/components/GameCenterExperience';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';
import { getLeagueSnapshot } from '@/lib/public-data';
import { RCL_PRO_SEASON } from '@/lib/rcl-pro-season';

export const revalidate = 60;
export const metadata: Metadata = {
  title: { absolute: 'Richmond Basketball Schedule & Scores | RCL' },
  description: 'Rich City League schedules, live scores, game results, standings, and player performances.',
  alternates: { canonical: '/games' },
};

export default async function GamesPage() {
  const { games, teams, seasons, standings, venues } = await getLeagueSnapshot();
  return <main className="relative min-h-screen overflow-hidden"><ContentAssetBackground assetKey="games.cover" opacity={0.12} /><div className="relative z-10"><div className="mx-auto max-w-7xl px-4 pt-5 text-sm text-white/70"><p className="rounded-xl border border-rcl-orange/25 bg-[#071522]/90 p-4"><strong className="text-rcl-orange">PRO SEASON · {RCL_PRO_SEASON.startLabel}</strong> planned. The exact first game and matchups are not yet announced. Older scores and schedules are historical records, not current professional-season games.</p></div><GameCenterExperience games={games} teams={teams} seasons={seasons} standings={standings} venues={venues} /></div></main>;
}
