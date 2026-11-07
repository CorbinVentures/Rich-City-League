import { LeagueCenterExperience } from '@/components/LeagueCenterExperience';
import type { LeaguePublicSnapshot } from '@/components/LeaguePublicHub';
import { getLeagueSnapshot } from '@/lib/public-data';
import { isRclProSeasonRecord } from '@/lib/rcl-pro-season';

export const metadata = {
  title: 'Rich City League | A New Era of Virginia Basketball',
  description: 'Follow the Rich City League season, its twelve franchises, game schedule, highlights, and community stories across Virginia.',
  alternates: { canonical: '/league' },
};

export default async function LeagueCenterPage() {
  const snapshot = await getLeagueSnapshot();
  const league = snapshot.leagues.find(item => item.slug === 'rich-city-league');
  const teams = snapshot.teams.filter(team => team.league_id === league?.id).slice(0, 12);
  const seasons = snapshot.seasons.filter(season => season.league_id === league?.id && isRclProSeasonRecord(season));
  const currentSeason = seasons.find(season => season.status === 'active')
    ?? seasons.find(season => season.status === 'registration')
    ?? seasons[0];
  const initialLeagueSnapshot: LeaguePublicSnapshot = {
    teams: teams.map(({ id, name, slug, logo_url, primary_color, secondary_color }) => ({ id, name, slug, logo_url, primary_color, secondary_color })),
    games: currentSeason ? snapshot.games.filter(game => game.season_id === currentSeason.id).map(({ id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score }) => ({ id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score })) : [],
    standings: currentSeason ? snapshot.standings.filter(standing => standing.season_id === currentSeason.id).map(({ team_id, wins, losses, rank }) => ({ team_id, wins, losses, rank })) : [],
    seasonName: currentSeason?.name ?? '',
  };
  return <LeagueCenterExperience initialLeagueSnapshot={initialLeagueSnapshot} />;
}
