import Link from 'next/link';
import { Container } from '@/components/Container';
import { SectionHeading } from '@/components/SectionHeading';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

export default async function HomePage() {
  const { seasons, teams, games, standings, news } = await getLeagueSnapshot();
  const upcomingGames = games.filter((game) => game.status !== 'completed').slice(0, 3);
  const results = games.filter((game) => game.status === 'completed').slice(0, 3);

  return (
    <main>
      <section className="border-b border-white/10 bg-gradient-to-br from-rcl-black via-rcl-navy to-rcl-black">
        <Container maxWidth="xl" className="py-20 sm:py-28">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-rcl-gold">
            Youth basketball • Adult basketball • Richmond, Virginia
          </p>
          <h1 className="max-w-4xl font-display text-5xl font-bold leading-none sm:text-7xl">
            The city&apos;s game.
            <br />
            <span className="text-rcl-gold">Your league.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-gray-300">
            Follow Rich City League schedules, scores, standings, teams, and league news in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/games" className="rounded-full bg-rcl-gold px-6 py-3 font-bold text-rcl-black hover:bg-white">
              Game Center
            </Link>
            <Link href="/register" className="rounded-full border border-white/30 px-6 py-3 font-bold text-white hover:border-rcl-gold hover:text-rcl-gold">
              Join the league
            </Link>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="space-y-20 py-16">
        <section>
          <SectionHeading eyebrow="On the court" title="Upcoming games" href="/games" />
          {upcomingGames.length === 0 ? (
            <EmptyState message="The next schedule is coming soon." />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {upcomingGames.map((game) => (
                <GameCard key={game.id} game={game} teams={teams} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading eyebrow="League table" title="Standings" href="/standings" />
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="grid grid-cols-[2rem_1fr_4rem_4rem] gap-3 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">
                <span>#</span><span>Team</span><span>W</span><span>L</span>
              </div>
              {standings.slice(0, 5).map((standing) => (
                <div key={standing.id} className="grid grid-cols-[2rem_1fr_4rem_4rem] gap-3 px-5 py-4 text-sm">
                  <span className="text-rcl-gold">{standing.rank ?? '—'}</span>
                  <span className="font-semibold">{teams.find((team) => team.id === standing.team_id)?.name ?? 'Team'}</span>
                  <span>{standing.wins}</span><span>{standing.losses}</span>
                </div>
              ))}
              {standings.length === 0 && <EmptyState message="Standings will appear after games are recorded." />}
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Latest" title="League news" href="/news" />
            <div className="space-y-3">
              {news.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/news/${item.slug}`} className="block rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-rcl-gold/50">
                  <p className="text-xs text-gray-500">{item.published_at ? formatDate(item.published_at) : 'RCL News'}</p>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  {item.excerpt && <p className="mt-2 line-clamp-2 text-sm text-gray-400">{item.excerpt}</p>}
                </Link>
              ))}
              {news.length === 0 && <EmptyState message="League news will appear here." />}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Around the league" title="Explore RCL" />
          <div className="grid gap-4 sm:grid-cols-3">
            <ExploreCard href="/seasons" title="Seasons" detail={`${seasons.length} published seasons`} />
            <ExploreCard href="/teams" title="Teams" detail={`${teams.length} active teams`} />
            <ExploreCard href="/games" title="Game Center" detail={`${results.length} final results`} />
          </div>
        </section>
      </Container>
    </main>
  );
}

function GameCard({ game, teams }: { game: Awaited<ReturnType<typeof getLeagueSnapshot>>['games'][number]; teams: Awaited<ReturnType<typeof getLeagueSnapshot>>['teams'] }) {
  const home = teams.find((team) => team.id === game.home_team_id)?.name ?? 'Home team';
  const away = teams.find((team) => team.id === game.away_team_id)?.name ?? 'Away team';
  return (
    <Link href={`/games/${game.id}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-rcl-gold/50">
      <div className="flex justify-between text-xs uppercase tracking-wider text-gray-500">
        <span>{game.status}</span><span>{formatDate(game.scheduled_at)}</span>
      </div>
      <div className="mt-6 space-y-3 font-display text-lg font-bold">
        <p>{away}</p><p className="text-rcl-gold">@</p><p>{home}</p>
      </div>
      <p className="mt-5 text-sm text-gray-400">{formatTime(game.scheduled_at)}</p>
    </Link>
  );
}

function ExploreCard({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="rounded-2xl bg-rcl-gold p-6 text-rcl-black transition hover:bg-white"><h3 className="font-display text-2xl font-bold">{title}</h3><p className="mt-2 text-sm">{detail}</p></Link>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-gray-500">{message}</div>;
}
