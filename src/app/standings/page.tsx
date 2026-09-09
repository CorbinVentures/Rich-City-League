import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';

export const revalidate = 60;

export default async function StandingsPage() {
  const { standings, teams, seasons } = await getLeagueSnapshot();
  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">League table</p><h1 className="mt-2 font-display text-4xl font-bold">Standings</h1><div className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04]"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500"><tr><th className="px-5 py-4">Rank</th><th className="px-5 py-4">Team</th><th className="px-5 py-4">Season</th><th className="px-5 py-4">W</th><th className="px-5 py-4">L</th><th className="px-5 py-4">PF</th><th className="px-5 py-4">PA</th></tr></thead><tbody>{standings.map((standing) => <tr key={standing.id} className="border-b border-white/5"><td className="px-5 py-4 text-rcl-gold">{standing.rank ?? '—'}</td><td className="px-5 py-4 font-semibold">{teams.find((team) => team.id === standing.team_id)?.name ?? 'Team'}</td><td className="px-5 py-4 text-gray-400">{seasons.find((season) => season.id === standing.season_id)?.name ?? 'Season'}</td><td className="px-5 py-4">{standing.wins}</td><td className="px-5 py-4">{standing.losses}</td><td className="px-5 py-4">{standing.points_for}</td><td className="px-5 py-4">{standing.points_against}</td></tr>)}</tbody></table>{standings.length === 0 && <p className="p-10 text-center text-gray-500">Standings will appear after games are recorded.</p>}</div></Container></main>;
}
