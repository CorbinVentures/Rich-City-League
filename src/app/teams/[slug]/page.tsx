import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/Container';
import { getTeamDetail } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

export default async function TeamDetailPage({ params }: { params: { slug: string } }) {
  const data = await getTeamDetail(params.slug);
  if (!data) notFound();
  const { team, league, seasons, divisions, teamSeasons, rosters, players, coaches, games, standings, playerStats, teamStats, venues } = data;
  const playerById = new Map(players.map((player) => [player.id, player]));
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const divisionById = new Map(divisions.map((division) => [division.id, division]));
  const currentSeason = seasons.find((season) => season.status === 'active') ?? seasons[0];
  const currentTeamSeason = teamSeasons.find((item) => item.season_id === currentSeason?.id);
  const currentRoster = currentTeamSeason ? rosters.filter((item) => item.team_season_id === currentTeamSeason.id) : rosters;
  const teamGames = games.filter((game) => game.status === 'completed' || game.status === 'scheduled' || game.status === 'live');
  const upcoming = teamGames.filter((game) => new Date(game.scheduled_at) >= new Date() && game.status !== 'completed').slice(0, 4);
  const recent = teamGames.filter((game) => game.status === 'completed').slice(-4).reverse();
  const record = standings.find((standing) => standing.season_id === currentSeason?.id);

  return (
    <main>
      <Container maxWidth="xl" className="py-12">
        <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:flex-row sm:items-center">
          {team.logo_url ? <img src={team.logo_url} alt={`${team.name} logo`} className="h-24 w-24 rounded-2xl object-cover" /> : <div className="h-24 w-24 rounded-2xl" style={{ backgroundColor: team.primary_color ?? '#FFD700' }} />}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Team detail</p>
            <h1 className="mt-2 font-display text-4xl font-bold">{team.name}</h1>
            <p className="mt-2 text-gray-400">{team.city ?? 'Richmond'}, Virginia · {league?.name ?? 'Rich City League'}</p>
            {team.description && <p className="mt-4 max-w-2xl text-gray-300">{team.description}</p>}
          </div>
          <div className="rounded-2xl border border-white/10 p-4 text-center">
            <p className="text-xs uppercase text-gray-500">Record</p>
            <p className="mt-1 text-2xl font-bold">{record ? `${record.wins}–${record.losses}` : '—'}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Roster</p><h2 className="mt-2 font-display text-2xl font-bold">{currentSeason?.name ?? 'Current roster'}</h2></div>
              <p className="text-sm text-gray-500">{currentRoster.length} player{currentRoster.length === 1 ? '' : 's'}</p>
            </div>
            {currentRoster.length === 0 ? <p className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-center text-gray-500">No players are currently assigned to this roster.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{currentRoster.map((roster) => { const player = playerById.get(roster.player_id); if (!player) return null; return <Link key={roster.id} href={`/players/${player.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 hover:border-rcl-gold/50"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-rcl-gold font-bold text-black">{roster.jersey_number ?? player.jersey_number ?? '—'}</div><div><p className="font-semibold">{player.first_name} {player.last_name}</p><p className="text-sm text-gray-500">{player.position ?? 'Player'}{roster.is_captain ? ' · Captain' : ''}</p></div></Link>; })}</div>}
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Team information</p>
            <dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-gray-500">Season</dt><dd>{currentSeason?.name ?? 'Not assigned'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Division</dt><dd>{divisionById.get(currentTeamSeason?.division_id ?? '')?.name ?? 'Not assigned'}</dd></div><div className="flex justify-between gap-4"><dt className="text-gray-500">Coach</dt><dd>{coaches.length ? `${coaches.length} assigned` : 'Not assigned'}</dd></div></dl>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Upcoming games</p><div className="mt-5 space-y-3">{upcoming.length === 0 ? <p className="text-gray-500">No upcoming games are scheduled.</p> : upcoming.map((game) => <div key={game.id} className="rounded-xl border border-white/10 p-4"><p className="font-semibold">{game.home_team_id === team.id ? 'vs home' : 'at away'}</p><p className="mt-1 text-sm text-gray-400">{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)} · {venues.find((venue) => venue.id === game.venue_id)?.name ?? 'Venue TBA'}</p><p className="mt-1 text-xs uppercase text-gray-500">{seasonById.get(game.season_id)?.name ?? 'Season'} · {game.status}</p></div>)}</div></section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Recent results</p><div className="mt-5 space-y-3">{recent.length === 0 ? <p className="text-gray-500">No completed results are available.</p> : recent.map((game) => <div key={game.id} className="flex items-center justify-between rounded-xl border border-white/10 p-4"><div><p className="font-semibold">{game.home_team_id === team.id ? 'Home game' : 'Away game'}</p><p className="text-sm text-gray-400">{formatDate(game.scheduled_at)}</p></div><p className="font-display text-2xl font-bold">{game.home_team_id === team.id ? `${game.home_score}–${game.away_score}` : `${game.away_score}–${game.home_score}`}</p></div>)}</div></section>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Team statistics</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-gray-500">Games recorded</p><p className="mt-1 text-2xl font-bold">{teamStats.length}</p></div><div><p className="text-sm text-gray-500">Player stat lines</p><p className="mt-1 text-2xl font-bold">{playerStats.length}</p></div><div><p className="text-sm text-gray-500">Points recorded</p><p className="mt-1 text-2xl font-bold">{playerStats.reduce((total, stat) => total + stat.points, 0)}</p></div></div></section>
      </Container>
    </main>
  );
}
