import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getPlayerDetail } from '@/lib/public-data';
import { formatDate } from '@/utils/helpers';

export const revalidate = 60;

export default async function PlayerDetailPage({ params }: { params: { id: string } }) {
  const data = await getPlayerDetail(params.id);
  if (!data) notFound();
  const { player, rosters, teamSeasons, teams, seasons, divisions, games, stats } = data;
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const divisionById = new Map(divisions.map((division) => [division.id, division]));
  const teamSeasonById = new Map(teamSeasons.map((item) => [item.id, item]));
  const statByGame = new Map(stats.map((stat) => [stat.game_id, stat]));

  return <main><Container maxWidth="lg" className="py-12">
    <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:flex-row sm:items-center">{player.photo_url ? <img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`} className="h-24 w-24 rounded-full object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rcl-gold text-3xl font-bold text-black">{player.first_name?.[0] ?? ''}{player.last_name?.[0] ?? ''}</div>}<div><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Player profile</p><h1 className="mt-2 font-display text-4xl font-bold">{player.first_name} {player.last_name}</h1><p className="mt-2 text-gray-400">{player.position ?? 'Player'}{player.hometown ? ` · ${player.hometown}` : ''}</p></div></div>
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Team assignments</p>{rosters.length === 0 ? <p className="mt-5 text-gray-500">This player is not currently assigned to a roster.</p> : <div className="mt-5 space-y-3">{rosters.map((roster) => { const teamSeason = teamSeasonById.get(roster.team_season_id); const team = teamSeason ? teamById.get(teamSeason.team_id) : undefined; if (!teamSeason || !team) return null; return <div key={roster.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><Link href={`/teams/${team.slug}`} className="font-semibold hover:text-rcl-gold">{team.name}</Link><p className="mt-1 text-sm text-gray-400">{seasonById.get(teamSeason.season_id)?.name ?? 'Season'} · {divisionById.get(teamSeason.division_id ?? '')?.name ?? 'Division not assigned'}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-sm">#{roster.jersey_number ?? player.jersey_number ?? '—'}</span></div>; })}</div>}</section>
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Statistics</p>{stats.length === 0 ? <p className="mt-5 text-gray-500">No game statistics have been recorded for this player.</p> : <><div className="mt-5 grid gap-4 sm:grid-cols-4"><div><p className="text-sm text-gray-500">Games</p><p className="mt-1 text-2xl font-bold">{stats.length}</p></div><div><p className="text-sm text-gray-500">Points</p><p className="mt-1 text-2xl font-bold">{stats.reduce((total, stat) => total + stat.points, 0)}</p></div><div><p className="text-sm text-gray-500">Rebounds</p><p className="mt-1 text-2xl font-bold">{stats.reduce((total, stat) => total + stat.rebounds, 0)}</p></div><div><p className="text-sm text-gray-500">Assists</p><p className="mt-1 text-2xl font-bold">{stats.reduce((total, stat) => total + stat.assists, 0)}</p></div></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="pb-3">Game</th><th className="pb-3">Date</th><th className="pb-3">PTS</th><th className="pb-3">REB</th><th className="pb-3">AST</th></tr></thead><tbody>{games.map((game) => { const stat = statByGame.get(game.id); if (!stat) return null; return <tr key={game.id} className="border-b border-white/5"><td className="py-3">{game.home_team_id === stat.team_id ? 'Home' : 'Away'}</td><td className="py-3 text-gray-400">{formatDate(game.scheduled_at)}</td><td className="py-3">{stat.points}</td><td className="py-3">{stat.rebounds}</td><td className="py-3">{stat.assists}</td></tr>; })}</tbody></table></div></>}</section>
  </Container></main>;
}
