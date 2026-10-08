import Link from 'next/link';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import type { PlayerGameStats, PublicPlayer, Team, TeamGameStats } from '@/types/database';
import { FaArrowRight, FaChartSimple } from 'react-icons/fa6';

export const revalidate = 60;

type PlayerTotals = { playerId: string; games: number; points: number; rebounds: number; assists: number };
type TeamTotals = { teamId: string; games: number; points: number; rebounds: number; assists: number };

export default async function StatsPage() {
  const snapshot = await getLeagueSnapshot();
  const client = getPublicClient();
  const currentSeason = snapshot.seasons.find((season) => season.status === 'active')
    ?? snapshot.seasons.find((season) => season.status === 'registration')
    ?? snapshot.seasons[0]
    ?? null;
  const completedGameIds = new Set(snapshot.games.filter((game) => game.status === 'completed' && (!currentSeason || game.season_id === currentSeason.id)).map((game) => game.id));

  let playerStats: PlayerGameStats[] = [];
  let teamStats: TeamGameStats[] = [];
  let players: PublicPlayer[] = [];
  let teams: Team[] = [];
  let error: string | null = null;

  if (client) {
    const [playerResult, teamResult, playersResult, teamsResult] = await Promise.all([
      client.from('player_game_stats').select('*'),
      client.from('team_game_stats').select('*'),
      client.from('public_players').select('*'),
      client.from('teams').select('*').eq('is_active', true),
    ]);
    error = [playerResult, teamResult, playersResult, teamsResult].find((result) => result.error) ? 'Statistics are temporarily unavailable.' : null;
    playerStats = (playerResult.data ?? []).filter((stat) => completedGameIds.has(stat.game_id));
    teamStats = (teamResult.data ?? []).filter((stat) => completedGameIds.has(stat.game_id));
    players = (playersResult.data ?? []).flatMap((row) => row.id ? [{ id: row.id, first_name: row.first_name ?? '', last_name: row.last_name ?? '', jersey_number: row.jersey_number, position: row.position, height_inches: row.height_inches, hometown: row.hometown, photo_url: row.photo_url, is_active: row.is_active ?? true }] : []);
    teams = teamsResult.data ?? [];
  }

  const playerById = new Map(players.map((player) => [player.id, player]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const playerTotals = new Map<string, PlayerTotals>();
  for (const stat of playerStats) {
    const current = playerTotals.get(stat.player_id) ?? { playerId: stat.player_id, games: 0, points: 0, rebounds: 0, assists: 0 };
    current.games += 1; current.points += stat.points; current.rebounds += stat.rebounds; current.assists += stat.assists; playerTotals.set(stat.player_id, current);
  }
  const teamTotals = new Map<string, TeamTotals>();
  for (const stat of teamStats) {
    const current = teamTotals.get(stat.team_id) ?? { teamId: stat.team_id, games: 0, points: 0, rebounds: 0, assists: 0 };
    current.games += 1; current.points += stat.points; current.rebounds += stat.rebounds; current.assists += stat.assists; teamTotals.set(stat.team_id, current);
  }

  const leaders = [...playerTotals.values()].sort((a, b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds).slice(0, 10);
  const teamLeaders = [...teamTotals.values()].sort((a, b) => b.points - a.points || b.assists - a.assists || b.rebounds - a.rebounds).slice(0, 10);
  const totals = [...playerTotals.values()].reduce((result, stat) => ({ points: result.points + stat.points, rebounds: result.rebounds + stat.rebounds, assists: result.assists + stat.assists }), { points: 0, rebounds: 0, assists: 0 });

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow="Official RCL Analytics"
      title="Statistics"
      accent="The production board"
      description={currentSeason ? `${currentSeason.name} totals from finalized RCL box scores. Only completed games feed the official public leaderboard.` : 'Finalized RCL box scores will appear here as official games are completed.'}
      assetKey="league.cover"
      actions={<Link href="/leaderboards" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:border-rcl-blue/60 hover:bg-rcl-blue/15">Full leaderboards <FaArrowRight/></Link>}
      meta={<div className="min-w-48 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Official sample</p><p className="mt-1 font-display text-3xl font-black">{completedGameIds.size}<span className="ml-2 text-xs text-white/35">final games</span></p><p className="mt-2 text-xs text-rcl-blue">{playerTotals.size} players tracked</p></div>}
    />

    <Container maxWidth="xl" className="py-10 sm:py-12">
      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-red-300">Statistics</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Data temporarily unavailable</h2><p className="mt-2 text-sm text-white/50">{error}</p></div> : <>
        <section className="grid gap-4 sm:grid-cols-3">
          {[['Points recorded', totals.points, 'PTS'], ['Rebounds recorded', totals.rebounds, 'REB'], ['Assists recorded', totals.assists, 'AST']].map(([label, value, short]) => <div key={label} className="relative overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5 shadow-[0_16px_45px_rgba(0,0,0,.14)]"><div className="absolute right-4 top-4 text-rcl-blue/20"><FaChartSimple/></div><p className="text-xs font-black uppercase tracking-[.16em] text-white/35">{label}</p><p className="mt-3 font-display text-4xl font-black">{value}</p><p className="mt-2 text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{short}</p></div>)}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <LeaderPanel title="Player leaders" subtitle="Season totals · finalized games only" empty="No finalized player statistics have been recorded for this season yet.">
            {leaders.map((stat, index) => { const player = playerById.get(stat.playerId); const ppg = stat.games ? stat.points / stat.games : 0; return <div key={stat.playerId} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/10 px-5 py-4 first:border-t-0 sm:px-6"><span className="font-display text-lg font-black text-rcl-orange">{String(index + 1).padStart(2,'0')}</span><div className="min-w-0">{player ? <Link href={`/players/${player.id}`} className="truncate font-display font-black uppercase transition hover:text-rcl-blue">{player.first_name} {player.last_name}</Link> : <span className="text-white/45">Player unavailable</span>}<p className="mt-1 text-xs text-white/30">{stat.games} GP · {ppg.toFixed(1)} PPG · {stat.rebounds} REB · {stat.assists} AST</p></div><div className="text-right"><strong className="font-display text-2xl">{stat.points}</strong><span className="ml-1 text-xs font-black text-white/30">PTS</span></div></div>; })}
          </LeaderPanel>

          <LeaderPanel title="Team leaders" subtitle="Season totals · finalized games only" empty="No finalized team statistics have been recorded for this season yet.">
            {teamLeaders.map((stat, index) => <div key={stat.teamId} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/10 px-5 py-4 first:border-t-0 sm:px-6"><span className="font-display text-lg font-black text-rcl-blue">{String(index + 1).padStart(2,'0')}</span><div className="min-w-0"><p className="truncate font-display font-black uppercase">{teamById.get(stat.teamId)?.name ?? 'Team unavailable'}</p><p className="mt-1 text-xs text-white/30">{stat.games} GP · {stat.rebounds} REB · {stat.assists} AST</p></div><div className="text-right"><strong className="font-display text-2xl">{stat.points}</strong><span className="ml-1 text-xs font-black text-white/30">PTS</span></div></div>)}
          </LeaderPanel>
        </div>
      </>}
    </Container>
  </main>;
}

function LeaderPanel({ title, subtitle, empty, children }: { title: string; subtitle: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55"><div className="border-b border-white/10 px-5 py-5 sm:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Official leaderboard</p><h2 className="mt-1 font-display text-2xl font-black uppercase">{title}</h2><p className="mt-1 text-xs uppercase tracking-wider text-white/30">{subtitle}</p></div>{hasChildren ? <div>{children}</div> : <div className="px-6 py-10 text-center text-sm text-white/40">{empty}</div>}</section>;
}
