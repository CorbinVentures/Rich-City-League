import Link from 'next/link';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

export default async function GameIQPublicPage() {
  const { teams, games, standings } = await getLeagueSnapshot();
  const completed = games.filter((game) => game.status === 'completed').slice(0, 12);
  const upcoming = games.filter((game) => game.status !== 'completed').slice(0, 6);

  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'Team';

  return (
    <main className="min-h-screen bg-[#05080d] pb-24 text-white">
      <Container maxWidth="xl" className="py-8 sm:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#101827] via-[#080c13] to-[#05080d] p-6 sm:p-10">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-rcl-orange">RCL GAME IQ™ · GAME CENTER</p>
          <h1 className="mt-3 font-display text-4xl font-black uppercase leading-none sm:text-6xl">Every game.<br /><span className="text-rcl-orange">Every result.</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/55">Follow Rich City League scores, completed games, team results and player box scores. Advanced Game IQ analytics and coaching intelligence stay inside the staff portal.</p>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-white/35">RESULTS</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Completed games</h2></div>
            <Link href="/games" className="text-[10px] font-black uppercase tracking-widest text-rcl-orange">All games →</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((game) => (
              <Link key={game.id} href={`/games/${game.id}`} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-rcl-orange/40 hover:bg-white/[.05]">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/35"><span>FINAL</span><span>{formatDate(game.scheduled_at)}</span></div>
                <div className="mt-5 flex items-center justify-between gap-3 font-display font-black">
                  <span className="flex-1 text-right">{teamName(game.away_team_id)}</span>
                  <span className="rounded-lg bg-black/30 px-3 py-2 text-lg">VS</span>
                  <span className="flex-1">{teamName(game.home_team_id)}</span>
                </div>
                <div className="mt-4 flex justify-between text-[9px] uppercase tracking-widest text-white/30"><span>Game results</span><span>{formatTime(game.scheduled_at)}</span></div>
              </Link>
            ))}
            {!completed.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-white/35 sm:col-span-2 lg:col-span-3">Completed game results will appear here after official scorebooks are finalized.</div>}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-white/35">NEXT UP</p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase">Upcoming games</h2>
            <div className="mt-4 space-y-2">
              {upcoming.map((game) => (
                <Link key={game.id} href={`/games/${game.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4">
                  <div><p className="text-sm font-black">{teamName(game.away_team_id)} <span className="text-white/25">vs</span> {teamName(game.home_team_id)}</p><p className="mt-1 text-[9px] uppercase tracking-widest text-white/30">{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)}</p></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-rcl-orange">Game Center →</span>
                </Link>
              ))}
              {!upcoming.length && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/35">No upcoming games are currently published.</p>}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-white/35">LEAGUE</p>
            <h2 className="mt-1 font-display text-2xl font-black uppercase">Standings</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
              {standings.slice(0, 8).map((standing, index) => (
                <Link key={standing.id} href="/standings" className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0">
                  <span className="w-5 font-mono text-xs text-rcl-orange">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 truncate text-sm font-bold">{teamName(standing.team_id)}</span>
                  <span className="text-xs text-white/45">{standing.wins}-{standing.losses}</span>
                </Link>
              ))}
              {!standings.length && <p className="p-6 text-sm text-white/35">Standings will appear after official games are recorded.</p>}
            </div>
          </div>
        </section>

        <div className="mt-10 rounded-2xl border border-rcl-gold/15 bg-rcl-gold/[.04] p-5">
          <p className="text-[9px] font-black uppercase tracking-[.25em] text-rcl-gold">COACHES + ADMIN</p>
          <p className="mt-2 text-sm text-white/50">The private RCL Game IQ scorebook contains advanced analytics, lineup intelligence and AI Coach tools.</p>
          <Link href="/portal/scorebook" className="mt-4 inline-flex rounded-xl bg-rcl-gold px-4 py-3 text-[9px] font-black uppercase tracking-widest text-black">Open staff scorebook →</Link>
        </div>
      </Container>
    </main>
  );
}
