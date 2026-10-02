import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { FaArrowLeft, FaChartSimple, FaLocationDot, FaTrophy } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { CorporatePageHero } from '@/components/CorporatePageHero';
import { GameNightExperience } from '@/components/GameNightExperience';
import { LiveGameScore } from '@/components/LiveGameScore';
import { PerformanceShareCard } from '@/components/PerformanceShareCard';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import type { PlayerGameStats, PublicPlayer, TeamGameStats } from '@/types/database';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const snapshot=await getLeagueSnapshot();const g=snapshot.games.find(x=>x.id===id);if(!g)return{title:'RCL Game',robots:{index:false,follow:false}};const home=snapshot.teams.find(t=>t.id===g.home_team_id)?.name??'Home';const away=snapshot.teams.find(t=>t.id===g.away_team_id)?.name??'Away';const title=`${away} vs ${home} | RCL Game`;const description=`Official Rich City League game page for ${away} vs ${home}: live Game Night, score, play-by-play, shot chart, reactions, box score and player stats from Richmond basketball.`;return{title:{absolute:title},description,alternates:{canonical:`/games/${id}`},openGraph:{images:[{url:'https://richcityhoops.com/opengraph-image?v=20261002-2',width:1200,height:630,alt:'RCL — Richmond basketball social'}],url:`/games/${id}`,title,description}};}

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
      players = (result.data ?? [])
        .filter((player): player is typeof player & { id: string } => player.id !== null)
        .map((player) => ({
          ...player,
          id: player.id,
          first_name: player.first_name ?? '',
          last_name: player.last_name ?? '',
          is_active: player.is_active ?? false,
        }));
    }
  }
  const playerById = new Map(players.map((player) => [player.id, player]));
  const topScorer = [...playerStats].sort((a, b) => b.points - a.points)[0];
  const teamStat = (teamId: string) => teamStats.find((stat) => stat.team_id === teamId);
  const topScorerPlayer = topScorer ? playerById.get(topScorer.player_id) : undefined;
  const topScorerTeam = topScorer ? snapshot.teams.find((team) => team.id === topScorer.team_id) : undefined;
  const topScorerOpponent = topScorerTeam?.id === home?.id ? away : home;
  const statusLabel = game.status.replace(/_/g, ' ').toUpperCase();

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <CorporatePageHero
      eyebrow={`${statusLabel} · ${season?.name ?? 'Rich City League'}`}
      title={away?.name ?? 'Away team'}
      accent={`AT ${home?.name ?? 'Home team'}`}
      description="Official RCL game center with Game Night reactions, play-by-play, shot chart, fan MVP voting, live score, team totals, box score, and shareable results."
      assetKey="league.cover"
      actions={<><Link href="/games" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-4 text-xs font-black uppercase tracking-wider text-white transition hover:border-rcl-blue/45"><FaArrowLeft /> Game Center</Link><Link href="/pickem" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rcl-orange/30 bg-rcl-orange/10 px-4 text-xs font-black uppercase tracking-wider text-rcl-orange">Pick’em</Link><Link href="/standings" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black"><FaTrophy /> Standings</Link></>}
      meta={<div className="min-w-64 rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-5 shadow-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">GAME DETAILS</p><p className="mt-3 font-display text-2xl font-black uppercase">{formatDate(game.scheduled_at)}</p><p className="mt-1 text-sm text-white/55">{formatTime(game.scheduled_at)}</p><div className="mt-4 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-white/45"><FaLocationDot className="mt-0.5 shrink-0 text-rcl-orange"/><span>{venue?.name ?? 'Venue TBA'}{venue?.city ? ` · ${venue.city}` : ''}</span></div></div>}
    />

    <Container maxWidth="xl" className="py-8 sm:py-10">
      <section className="overflow-hidden rounded-3xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#071522,#05090f)] shadow-2xl">
        <div className="border-b border-white/10 px-5 py-4 sm:px-7"><p className="text-xs font-black uppercase tracking-[.22em] text-rcl-orange">OFFICIAL SCORE</p></div>
        <div className="p-1 sm:p-3"><LiveGameScore initialGame={game} homeName={home?.name ?? 'Home team'} awayName={away?.name ?? 'Away team'} /></div>
      </section>

      <GameNightExperience gameId={game.id} homeName={home?.name ?? 'Home team'} awayName={away?.name ?? 'Away team'} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-rcl-blue/15 bg-white/[.025] p-5 sm:p-7"><SectionHeading icon={<FaChartSimple />} eyebrow="GAME TOTALS">Team stats</SectionHeading><div className="mt-5 grid gap-3 sm:grid-cols-2">{[away, home].map((team) => { const stat = team ? teamStat(team.id) : undefined; return <article key={team?.id ?? 'team'} className="rounded-2xl border border-white/10 bg-black/20 p-5"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">{team?.short_name ?? 'RCL'}</p><p className="mt-1 font-display text-xl font-black uppercase">{team?.name ?? 'Team'}</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/45"><Metric label="PTS" value={stat?.points} /><Metric label="REB" value={stat?.rebounds} /><Metric label="AST" value={stat?.assists} /><Metric label="TO" value={stat?.turnovers} /></div></article>; })}</div></section>
        <section className="rounded-3xl border border-rcl-blue/15 bg-white/[.025] p-5 sm:p-7"><SectionHeading icon={<FaTrophy />} eyebrow="GAME LEADER">Top performer</SectionHeading>{topScorer ? <div className="mt-6 rounded-2xl border border-rcl-orange/20 bg-rcl-orange/[.055] p-5"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">SCORING LEADER</p><p className="mt-3 font-display text-3xl font-black uppercase">{topScorerPlayer ? `${topScorerPlayer.first_name} ${topScorerPlayer.last_name}` : 'RCL Player'}</p><div className="mt-5 grid grid-cols-3 gap-3"><LeaderMetric label="PTS" value={topScorer.points} /><LeaderMetric label="REB" value={topScorer.rebounds} /><LeaderMetric label="AST" value={topScorer.assists} /></div></div> : <EmptyCopy text="Player of the game will appear when official stats are recorded." />}</section>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border border-rcl-blue/15 bg-white/[.025]"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-7"><SectionHeading icon={<FaChartSimple />} eyebrow="OFFICIAL STATS">Box score</SectionHeading><span className="text-xs font-black uppercase tracking-widest text-white/30">{playerStats.length ? `${playerStats.length} player lines` : 'Awaiting stats'}</span></div>{playerStats.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-rcl-blue/[.05] text-xs font-black uppercase tracking-widest text-white/35"><tr>{['Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', '+/-', 'TO', 'FG', '3PT', 'FT'].map((heading) => <th key={heading} className="px-4 py-4">{heading}</th>)}</tr></thead><tbody>{playerStats.map((stat) => { const player = playerById.get(stat.player_id); return <tr key={stat.id} className="border-t border-white/10 transition hover:bg-rcl-blue/[.03]"><td className="px-4 py-4 font-black">{player ? `${player.first_name} ${player.last_name}` : 'Player'}</td><td className="px-4 py-4 text-white/45">{stat.minutes ?? '—'}</td><td className="px-4 py-4 font-black text-rcl-orange">{stat.points}</td><td className="px-4 py-4">{stat.rebounds}</td><td className="px-4 py-4">{stat.assists}</td><td className="px-4 py-4">{stat.steals}</td><td className="px-4 py-4">{stat.blocks}</td><td className="px-4 py-4">{stat.plus_minus ?? '—'}</td><td className="px-4 py-4">{stat.turnovers}</td><td className="px-4 py-4">{stat.field_goals_made}/{stat.field_goals_attempted}</td><td className="px-4 py-4">{stat.three_pointers_made}/{stat.three_pointers_attempted}</td><td className="px-4 py-4">{stat.free_throws_made}/{stat.free_throws_attempted}</td></tr>; })}</tbody></table></div> : <div className="p-8"><EmptyCopy text="Official player statistics will appear here after they are recorded." /></div>}</section>

      {topScorer && topScorerPlayer && <section className="mt-6"><PerformanceShareCard playerName={`${topScorerPlayer.first_name} ${topScorerPlayer.last_name}`} teamName={topScorerTeam?.name} opponentName={topScorerOpponent?.name} points={topScorer.points} rebounds={topScorer.rebounds} assists={topScorer.assists} steals={topScorer.steals} blocks={topScorer.blocks} gameUrl={`/games/${game.id}`} /></section>}
      {game.notes && <section className="mt-6 rounded-3xl border border-rcl-blue/15 bg-white/[.025] p-6"><SectionHeading eyebrow="GAME FILE">Game notes</SectionHeading><p className="mt-4 max-w-3xl text-sm leading-6 text-white/50">{game.notes}</p></section>}
    </Container>
  </main>;
}

function SectionHeading({ children, eyebrow, icon }: { children: ReactNode; eyebrow: string; icon?: ReactNode }) { return <div className="flex items-center gap-3">{icon ? <span className="grid h-10 w-10 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue">{icon}</span> : null}<div><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">{eyebrow}</p><h2 className="mt-1 font-display text-xl font-black uppercase tracking-wide">{children}</h2></div></div>; }
function Metric({ label, value }: { label: string; value: number | null | undefined }) { return <span className="rounded-xl bg-white/[.035] p-3"><small className="block text-xs font-black uppercase text-white/30">{label}</small><b className="mt-1 block font-display text-2xl text-white">{value ?? '—'}</b></span>; }
function LeaderMetric({ label, value }: { label: string; value: number }) { return <span><small className="block text-xs font-black uppercase text-white/35">{label}</small><b className="mt-1 block font-display text-3xl font-black">{value}</b></span>; }
function EmptyCopy({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm leading-6 text-white/40">{text}</p>; }
