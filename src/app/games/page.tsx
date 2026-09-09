import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

export default async function GamesPage() {
  const { games, teams, seasons } = await getLeagueSnapshot();
  return (
    <main><Container maxWidth="xl" className="py-12">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Game Center</p>
      <h1 className="mt-2 font-display text-4xl font-bold">Scores & schedule</h1>
      <p className="mt-3 max-w-2xl text-gray-400">Track every RCL matchup, from upcoming tipoffs to final scores.</p>
      <div className="mt-10 space-y-4">
        {games.length === 0 && <p className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-gray-500">No games have been published yet.</p>}
        {games.map((game) => {
          const home = teams.find((team) => team.id === game.home_team_id)?.name ?? 'Home team';
          const away = teams.find((team) => team.id === game.away_team_id)?.name ?? 'Away team';
          const season = seasons.find((item) => item.id === game.season_id)?.name;
          return <Link key={game.id} href={`/games/${game.id}`} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-rcl-gold/50 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div><p className="text-lg font-bold">{away}</p><p className="mt-1 text-sm text-gray-500">{season ?? 'RCL'} · {game.status}</p></div>
            <div className="text-center text-sm"><p className="font-semibold">{game.status === 'completed' ? `${game.away_score} — ${game.home_score}` : 'vs'}</p><p className="mt-1 text-gray-500">{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)}</p></div>
            <p className="text-lg font-bold sm:text-right">{home}</p>
          </Link>;
        })}
      </div>
    </Container></main>
  );
}
