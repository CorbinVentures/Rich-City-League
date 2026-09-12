import type { Metadata } from 'next';
import { StandingsExperience } from '@/components/StandingsExperience';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'RCL Standings | Richmond Basketball League Table',
  description: 'Official Rich City League standings, team records, scores, streaks, and Richmond basketball results.',
};

export default async function StandingsPage() {
  const { standings, teams, seasons, divisions, teamSeasons, games, venues } = await getLeagueSnapshot();
  return <StandingsExperience seasons={seasons} divisions={divisions} teams={teams} teamSeasons={teamSeasons} standings={standings} games={games} venues={venues} />;
}
