import type { Metadata } from 'next';
import { StandingsExperience } from '@/components/StandingsExperience';
import { getLeagueSnapshot } from '@/lib/public-data';
import { RCL_PRO_SEASON } from '@/lib/rcl-pro-season';

export const revalidate = 60;
export const metadata: Metadata = {
  title: { absolute: 'RCL Standings | Richmond Basketball League Table' },
  description: 'Official Rich City League standings, team records, scores, streaks, and Richmond basketball results.',
  alternates: { canonical: '/standings' },
};

export default async function StandingsPage() {
  const { standings, teams, seasons, divisions, teamSeasons, games, venues } = await getLeagueSnapshot();
  return <><div className="mx-auto max-w-7xl px-4 pt-5 text-sm text-white/70"><p className="rounded-xl border border-rcl-orange/25 bg-[#071522] p-4"><strong className="text-rcl-orange">RCL PRO SEASON · {RCL_PRO_SEASON.startLabel}</strong> planned. Official pro standings will begin after the new season&apos;s games; any earlier standings below are historical/imported league records.</p></div><StandingsExperience seasons={seasons} divisions={divisions} teams={teams} teamSeasons={teamSeasons} standings={standings} games={games} venues={venues}/></>;
}
