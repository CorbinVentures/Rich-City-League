import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { LiveGameScore } from '@/components/LiveGameScore';
import { getLeagueSnapshot } from '@/lib/public-data';
import type { Venue } from '@/types/database';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

export default async function GameDetailPage({ params }: { params: { id: string } }) {
  const { games, teams, venues, seasons } = await getLeagueSnapshotWithVenueData();
  const game = games.find((item) => item.id === params.id);
  if (!game) notFound();
  const home = teams.find((team) => team.id === game.home_team_id)?.name ?? 'Home team';
  const away = teams.find((team) => team.id === game.away_team_id)?.name ?? 'Away team';
  return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-4xl font-bold">{away} <span className="text-rcl-gold">vs</span> {home}</h1><p className="mt-4 text-gray-400">{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)} · {venues.find((venue) => venue.id === game.venue_id)?.name ?? 'Venue TBA'}</p><LiveGameScore initialGame={game} homeName={home} awayName={away} /><p className="mt-5 text-sm text-gray-500">{seasons.find((season) => season.id === game.season_id)?.name ?? 'Rich City League'}</p></Container></main>;
}

async function getLeagueSnapshotWithVenueData(): Promise<Awaited<ReturnType<typeof getLeagueSnapshot>> & { venues: Venue[] }> {
  const snapshot = await getLeagueSnapshot();
  const { getPublicClient } = await import('@/lib/public-data');
  const client = getPublicClient();
  if (!client) return { ...snapshot, venues: [] };
  const { data } = await client.from('venues').select('*').order('name');
  return { ...snapshot, venues: data ?? [] };
}
