import Link from 'next/link';
import { Container } from '@/components/Container';
import { SplashIntro } from '@/components/SplashIntro';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';
import {
  FaArrowRight,
  FaBasketball,
  FaBolt,
  FaChartLine,
  FaCrown,
  FaNewspaper,
  FaPeopleGroup,
  FaRankingStar,
  FaShirt,
  FaTrophy,
} from 'react-icons/fa6';

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news } = await getLeagueSnapshot();
  const client = getPublicClient();
  const { data: posts } = client
    ? await client.from('posts').select('id, body, created_at, author:profiles(display_name, first_name, last_name)').eq('status', 'published').order('created_at', { ascending: false }).limit(3)
    : { data: [] };
  const upcomingGames = games.filter((game) => game.status !== 'completed').slice(0, 3);

  return (
    <main className="rcl-world min-h-screen overflow-hidden pb-24 text-white lg:pb-0">
      <SplashIntro />
      <section className="rcl-hero relative">
        <div className="rcl-skyline" aria-hidden="true" />
        <Container maxWidth="xl" className="relative z-10 py-12 sm:py-20">
          <div className="max-w-3xl">
            <p className="rcl-kicker"><FaBolt /> RICHMOND, VIRGINIA · EST. 2024</p>
            <h1 className="mt-5 max-w-xl font-display text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-8xl">
              Welcome to<br /><span className="text-rcl-orange">the city.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
              Play. Compete. Connect. Build your legacy in Richmond&apos;s basketball world.
            </p>
            <Link href="/games" className="rcl-button mt-8 inline-flex items-center gap-3">
              Enter the city <FaArrowRight />
            </Link>
          </div>
          <div className="mt-12 flex items-end justify-between gap-4 sm:mt-16">
            <div>
              <p className="rcl-kicker">THE NEXT CHAPTER</p>
              <p className="mt-2 font-display text-2xl font-bold uppercase sm:text-3xl">Your game. Your people.</p>
            </div>
            <div className="hidden h-20 w-20 items-center justify-center rounded-full border border-rcl-orange/50 bg-rcl-orange/10 text-4xl text-rcl-orange shadow-[0_0_40px_rgba(249,115,22,.25)] sm:flex"><FaBasketball /></div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-10 -mt-5 space-y-12 sm:-mt-8 sm:space-y-20">
        <section aria-labelledby="destinations">
          <SectionHeader eyebrow="YOUR WORLD" title="Choose your destination" id="destinations" />
          <div className="rcl-shortcuts">
            <Destination href="/dashboard" icon={<FaCrown />} title="My Career" subtitle="Track your journey" />
            <Destination href="/communities" icon={<FaPeopleGroup />} title="Community" subtitle="Connect & talk" />
            <Destination href="/stats" icon={<FaChartLine />} title="The Lab" subtitle="See your impact" />
            <Destination href="/leaderboards" icon={<FaTrophy />} title="Fantasy" subtitle="Build & compete" />
            <Destination href="/media" icon={<FaShirt />} title="The Shop" subtitle="Gear the culture" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <SectionHeader eyebrow="THE COURT" title="Next game" href="/games" />
            {upcomingGames.length ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{upcomingGames.map((game) => <GameCard key={game.id} game={game} teams={teams} />)}</div> : <EmptyState>Schedules are loading. Check back soon.</EmptyState>}
          </div>
          <div>
            <SectionHeader eyebrow="THE LEAGUE" title="Standings" href="/standings" />
            <div className="rcl-panel mt-5 divide-y divide-white/10">
              {standings.slice(0, 5).map((standing, index) => (
                <Link href="/standings" key={standing.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                  <span className="w-5 font-mono text-xs text-rcl-orange">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 truncate text-sm font-bold">{teams.find((team) => team.id === standing.team_id)?.name ?? 'Team'}</span>
                  <span className="text-xs text-slate-400">{standing.wins}W - {standing.losses}L</span>
                </Link>
              ))}
              {!standings.length && <EmptyState>Standings appear after games are logged.</EmptyState>}
            </div>
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="THE NEIGHBORHOOD" title="For you" href="/social" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {posts?.length ? posts.map((post: any) => <SocialCard key={post.id} post={post} />) : <EmptyState>No community updates yet. Be the first to post.</EmptyState>}
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="THE STAGE" title="Latest from RCL" href="/news" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {news.slice(0, 3).map((item) => (
              <Link href={`/news/${item.slug}`} key={item.id} className="rcl-news-card">
                <div className="flex items-start justify-between gap-4"><FaNewspaper className="text-rcl-orange" /><FaArrowRight className="text-slate-500" /></div>
                <p className="mt-8 text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL NEWS</p>
                <h3 className="mt-2 font-display text-xl font-bold leading-tight">{item.title}</h3>
                <p className="mt-3 text-xs text-slate-500">{item.published_at ? formatDate(item.published_at) : 'RCL newsroom'}</p>
              </Link>
            ))}
            {!news.length && <EmptyState>RCL stories will appear here.</EmptyState>}
          </div>
        </section>
      </Container>
    </main>
  );
}

function SectionHeader({ eyebrow, title, href, id }: { eyebrow: string; title: string; href?: string; id?: string }) {
  return <div id={id} className="flex items-end justify-between gap-4"><div><p className="rcl-kicker">{eyebrow}</p><h2 className="mt-1 font-display text-2xl font-black uppercase sm:text-3xl">{title}</h2></div>{href && <Link href={href} className="rcl-link">View all <FaArrowRight /></Link>}</div>;
}

function Destination({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return <Link href={href} className="rcl-destination"><span className="rcl-destination-icon">{icon}</span><span><strong>{title}</strong><small>{subtitle}</small></span><FaArrowRight className="ml-auto text-slate-600" /></Link>;
}

function GameCard({ game, teams }: { game: Awaited<ReturnType<typeof getLeagueSnapshot>>['games'][number]; teams: Awaited<ReturnType<typeof getLeagueSnapshot>>['teams'] }) {
  const home = teams.find((team) => team.id === game.home_team_id)?.name ?? 'Home team';
  const away = teams.find((team) => team.id === game.away_team_id)?.name ?? 'Away team';
  return <Link href={`/games/${game.id}`} className="rcl-game-card"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400"><span>{game.status}</span><span>{formatDate(game.scheduled_at)}</span></div><div className="mt-6 flex items-center justify-between gap-3 text-center font-display font-bold"><span className="flex-1">{away}</span><span className="text-xs text-rcl-orange">VS</span><span className="flex-1">{home}</span></div><div className="mt-5 flex justify-between text-xs text-slate-400"><span>{game.venue_id ? 'Richmond, VA' : 'RCL Court'}</span><span>{formatTime(game.scheduled_at)}</span></div></Link>;
}

function SocialCard({ post }: { post: any }) {
  const author = post.author?.display_name || [post.author?.first_name, post.author?.last_name].filter(Boolean).join(' ') || 'RCL Community';
  return <Link href="/social" className="rcl-panel block p-5 transition hover:-translate-y-1 hover:border-rcl-blue"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-rcl-blue font-bold">{author[0]}</span><div><p className="text-sm font-bold">{author}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">RCL community</p></div></div><p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-300">{post.body}</p></Link>;
}

function EmptyState({ children }: { children: React.ReactNode }) { return <div className="rcl-panel border-dashed p-8 text-center text-sm text-slate-500">{children}</div>; }
