import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Container } from '@/components/Container';
import { LiveGameScore } from '@/components/LiveGameScore';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import type { PlayerGameStats, PublicPlayer, TeamGameStats } from '@/types/database';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const snapshot = await getLeagueSnapshot();
  const { id } = await params;
  const game = snapshot.games.find((item) => item.id === id);
  if (!game) notFound();
  const home = snapshot.teams.find((team) => team.id === game.home_team_id);
  const away = snapshot.teams.find((team) => team.id === game.away_team_id);
  const venue = snapshot.venues.find((item) => item.id === game.venue_id);
  const season = snapshot.seasons.find((item) => item.id === game.season_id);
  const client = getPublicClient();
  let playerStats: PlayerGameStats[] = [];
  let teamStats: TeamGameStats[] = [];
  let players: PublicPlayer[] = [];
  if (client) {
    const [playerResult, teamResult] = await Promise.all([
      client.from('player_game_stats').select('*').eq('game_id', game.id),
      client.from('team_game_stats').select('*').eq('game_id', game.id),
    ]);
    playerStats = playerResult.data ?? [];
    teamStats = teamResult.data ?? [];
    if (playerStats.length) {
      const result = await client.from('public_players').select('*').in('id', playerStats.map((stat) => stat.player_id));
      players = result.data ?? [];
    }
  }
  const playerById = new Map(players.map((player) => [player.id, player]));
  const topScorer = [...playerStats].sort((a, b) => b.points - a.points)[0];
  const teamStat = (teamId: string) => teamStats.find((stat) => stat.team_id === teamId);

  return <main><Container maxWidth="xl" className="py-10 sm:py-16">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">{game.status} · {season?.name ?? 'RCL'}</p><p className="text-xs uppercase tracking-widest text-gray-500">{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)}</p></div>
    <h1 className="mt-5 font-display text-4xl font-black uppercase sm:text-6xl">{away?.name ?? 'Away team'} <span className="text-rcl-gold">at</span> {home?.name ?? 'Home team'}</h1>
    <p className="mt-4 text-sm uppercase tracking-widest text-gray-500">{venue?.name ?? 'Venue TBA'}{venue?.city ? ` · ${venue.city}` : ''}</p>
    <LiveGameScore initialGame={game} homeName={home?.name ?? 'Home team'} awayName={away?.name ?? 'Away team'} />
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="border border-white/10 bg-white/[.025] p-5 sm:p-7"><Heading>Team stats</Heading><div className="mt-5 grid grid-cols-2 gap-3">{[away, home].map((team) => { const stat = team ? teamStat(team.id) : undefined; return <div key={team?.id} className="border border-white/10 p-4"><p className="font-display text-lg font-black uppercase">{team?.short_name ?? team?.name ?? 'Team'}</p><div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-400"><span>PTS <b className="text-white">{stat?.points ?? '—'}</b></span><span>REB <b className="text-white">{stat?.rebounds ?? '—'}</b></span><span>AST <b className="text-white">{stat?.assists ?? '—'}</b></span><span>TO <b className="text-white">{stat?.turnovers ?? '—'}</b></span></div></div>; })}</div></section>
      <section className="border border-white/10 bg-white/[.025] p-5 sm:p-7"><Heading>Top performers</Heading>{topScorer ? <div className="mt-5"><p className="text-xs uppercase tracking-widest text-gray-500">Scoring leader</p><p className="mt-2 font-display text-2xl font-black uppercase">{playerById.get(topScorer.player_id) ? `${playerById.get(topScorer.player_id)?.first_name} ${playerById.get(topScorer.player_id)?.last_name}` : 'Player'}</p><p className="mt-1 text-rcl-gold">{topScorer.points} PTS · {topScorer.rebounds} REB · {topScorer.assists} AST</p></div> : <p className="mt-5 text-sm text-gray-500">Player of the game will be announced when official stats are recorded.</p>}</section>
    </div>
    <section className="mt-6 border border-white/10 bg-white/[.025] p-5 sm:p-7"><Heading>Box score</Heading>{playerStats.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-[10px] uppercase tracking-widest text-gray-500"><tr>{['Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG', '3PT', 'FT'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody>{playerStats.map((stat) => { const player = playerById.get(stat.player_id); return <tr key={stat.id} className="border-t border-white/5"><td className="px-3 py-3 font-semibold">{player ? `${player.first_name} ${player.last_name}` : 'Player'}</td><td className="px-3 py-3 text-gray-400">{stat.minutes ?? '—'}</td><td className="px-3 py-3 font-bold">{stat.points}</td><td className="px-3 py-3">{stat.rebounds}</td><td className="px-3 py-3">{stat.assists}</td><td className="px-3 py-3">{stat.steals}</td><td className="px-3 py-3">{stat.blocks}</td><td className="px-3 py-3">{stat.turnovers}</td><td className="px-3 py-3">{stat.field_goals_made}/{stat.field_goals_attempted}</td><td className="px-3 py-3">{stat.three_pointers_made}/{stat.three_pointers_attempted}</td><td className="px-3 py-3">{stat.free_throws_made}/{stat.free_throws_attempted}</td></tr>; })}</tbody></table></div> : <p className="mt-5 text-sm text-gray-500">Official player statistics will appear after they are recorded.</p>}</section>
    {game.notes && <section className="mt-6 border border-white/10 p-5"><Heading>Game notes</Heading><p className="mt-3 text-sm text-gray-400">{game.notes}</p></section>}
  </Container></main>;
}

function Heading({ children }: { children: ReactNode }) { return <h2 className="font-display text-xl font-black uppercase tracking-wide">{children}</h2>; }
