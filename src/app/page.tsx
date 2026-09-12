import Link from 'next/link';
import { Container } from '@/components/Container';
import { SectionHeading } from '@/components/SectionHeading';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';
import { SplashIntro } from '@/components/SplashIntro';
import { FaCrown, FaStar, FaRankingStar, FaChartLine, FaBolt, FaAward } from 'react-icons/fa6';

export const revalidate = 60;

export default async function HomePage() {
  const { seasons, teams, games, standings, news } = await getLeagueSnapshot();
  const client = getPublicClient();

  // Load Player of the Week (PotW)
  const { data: potwData } = client
    ? await client.from('player_of_week').select('*, player:players(*, profile:profiles(*))').order('week_start', { ascending: false }).limit(1).maybeSingle() as any
    : { data: null };

  // Load trending social posts
  const { data: trendingPosts } = client
    ? await client.from('posts').select('*, author:profiles(*)').order('created_at', { ascending: false }).limit(3)
    : { data: [] };

  const upcomingGames = games.filter((game) => game.status !== 'completed').slice(0, 3);
  const results = games.filter((game) => game.status === 'completed').slice(0, 3);

  return (
    <main className="relative overflow-hidden bg-rcl-black text-white min-h-screen">
      {/* Cinematic Splash Screen Overlay */}
      <SplashIntro />

      {/* Hero Section */}
      <section className="relative border-b border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.4),transparent_70%)] py-24 sm:py-36">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <Container maxWidth="xl" className="relative z-10 text-center lg:text-left">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-rcl-gold flex items-center justify-center lg:justify-start gap-1.5">
                <FaBolt className="animate-pulse" /> RICHMOND, VIRGINIA COMMUNITY BASKETBALL
              </p>
              <h1 className="font-display text-5xl font-extrabold leading-none sm:text-8xl tracking-tight text-white uppercase">
                THE CITY&apos;S <span className="text-transparent bg-clip-text bg-gradient-to-r from-rcl-gold to-white">GAME.</span>
                <br />
                YOUR <span className="text-rcl-gold">LEAGUE.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base sm:text-lg text-gray-400 font-medium mx-auto lg:mx-0">
                Welcome to Rich City League. Follow schedules, deep statistical leaderboards, dynamic achievements badges, and connect with local Richmond ballers in real-time.
              </p>
              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
                <Link href="/games" className="rounded-xl bg-rcl-gold px-8 py-3.5 text-xs font-black text-rcl-black tracking-widest uppercase hover:bg-white transition-all shadow-[0_4px_20px_rgba(255,215,0,0.25)]">
                  GAME CENTER
                </Link>
                <Link href="/social" className="rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-xs font-black text-white tracking-widest uppercase hover:border-rcl-gold hover:text-rcl-gold transition-all">
                  RCL SOCIAL TIMELINE
                </Link>
              </div>
            </div>

            {/* Premium Player of the Week Showcase (NBA 2K card layout) */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-rcl-gold via-yellow-500 to-amber-600 opacity-25 blur-xl" />
              <div className="relative rounded-3xl border-2 border-rcl-gold/30 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-[10px] font-black tracking-widest text-rcl-gold uppercase flex items-center gap-1">
                    <FaCrown className="h-3 w-3" /> PLAYER OF THE WEEK
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">
                    {potwData ? `Week of ${new Date(potwData.week_start).toLocaleDateString()}` : 'RCL REGULAR SEASON'}
                  </span>
                </div>

                <div className="mt-6 flex items-center gap-6">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-rcl-gold/30 bg-gradient-to-br from-rcl-navy/20 to-black font-display text-3xl font-black text-rcl-gold uppercase shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                    {potwData?.player?.profile?.first_name?.[0] || 'R'}{potwData?.player?.profile?.last_name?.[0] || 'C'}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                      {potwData?.player?.profile?.first_name || 'Richmond'} <span className="text-rcl-gold">{potwData?.player?.profile?.last_name || 'Baller'}</span>
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 font-semibold uppercase tracking-widest">
                      {potwData?.performance_summary || 'Elite performance recorded across Richmond courts this past week.'}
                    </p>
                  </div>
                </div>

                {/* PotW Quick Stats Row */}
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/5 pt-4 text-center font-mono">
                  <div>
                    <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">PTS</span>
                    <span className="block text-xl font-bold text-white mt-0.5">{potwData?.stats?.pts || '28'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">REB</span>
                    <span className="block text-xl font-bold text-white mt-0.5">{potwData?.stats?.reb || '11'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">AST</span>
                    <span className="block text-xl font-bold text-white mt-0.5">{potwData?.stats?.ast || '6'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="space-y-24 py-20">
        {/* Section: Live / Upcoming Schedule */}
        <section>
          <SectionHeading eyebrow="ON THE COURT" title="UPCOMING MATCHUPS" href="/games" />
          {upcomingGames.length === 0 ? (
            <EmptyState message="The next regular season schedule is coming soon." />
          ) : (
            <div className="grid gap-6 md:grid-cols-3 mt-6">
              {upcomingGames.map((game) => (
                <GameCard key={game.id} game={game} teams={teams} />
              ))}
            </div>
          )}
        </section>

        {/* Section: Split Content (Standings & Trending Timeline) */}
        <section className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <SectionHeading eyebrow="LEAGUE TABLE" title="STANDINGS" href="/rankings" />
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01] shadow-xl">
              <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] gap-3 border-b border-white/10 px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <span>#</span><span>TEAM</span><span>W</span><span>L</span>
              </div>
              {standings.slice(0, 5).map((standing, idx) => (
                <div key={standing.id} className="grid grid-cols-[2.5rem_1fr_4rem_4rem] gap-3 px-6 py-4 text-xs font-bold border-b border-white/5 last:border-0 hover:bg-white/[0.01]">
                  <span className="text-rcl-gold font-mono">#{idx + 1}</span>
                  <span className="font-extrabold text-gray-200">{teams.find((team) => team.id === standing.team_id)?.name ?? 'Team'}</span>
                  <span>{standing.wins}</span><span>{standing.losses}</span>
                </div>
              ))}
              {standings.length === 0 && <EmptyState message="Standings will appear after games are officially logged." />}
            </div>
          </div>

          <div>
            <SectionHeading eyebrow="RCL SOCIAL" title="TRENDING POSTS" href="/social" />
            <div className="mt-6 space-y-4">
              {trendingPosts && trendingPosts.length > 0 ? (
                trendingPosts.map((post: any) => (
                  <Link 
                    key={post.id} 
                    href="/social" 
                    className="block rounded-2xl border border-white/10 bg-white/[0.01] p-5 shadow-lg hover:border-rcl-gold/50 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rcl-gold text-[10px] font-black text-black">
                        {post.author?.display_name?.[0] || 'R'}
                      </div>
                      <div>
                        <span className="block text-xs font-black text-white">
                          {post.author?.first_name ? `${post.author.first_name} ${post.author.last_name || ''}` : post.author?.display_name || 'RCL Athlete'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {post.body}
                    </p>
                  </Link>
                ))
              ) : (
                <EmptyState message="No trending social updates available." />
              )}
            </div>
          </div>
        </section>

        {/* Section: Explore cards */}
        <section>
          <SectionHeading eyebrow="AROUND THE COOP" title="EXPLORE RICH CITY" />
          <div className="grid gap-6 sm:grid-cols-3 mt-6">
            <ExploreCard href="/rankings" title="Rankings" detail="PPG, RPG, OVR leaders & team standings center." icon={<FaRankingStar className="h-5 w-5" />} />
            <ExploreCard href="/coaches" title="Coaches" detail="Win percentages, coach records & tactical profiles." icon={<FaChartLine className="h-5 w-5" />} />
            <ExploreCard href="/media" title="Media Hub" detail="Post-game streams, highlights and court photos." icon={<FaAward className="h-5 w-5" />} />
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
    <Link href={`/games/${game.id}`} className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 hover:border-rcl-gold/50 transition-all shadow-xl block">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
        <span>{game.status}</span><span>{formatDate(game.scheduled_at)}</span>
      </div>
      <div className="mt-6 space-y-2 font-display text-base font-extrabold tracking-tight">
        <p className="text-gray-300">{away}</p>
        <p className="text-rcl-gold text-xs font-mono uppercase tracking-widest">AT</p>
        <p className="text-white">{home}</p>
      </div>
      <p className="mt-5 text-xs text-gray-500 font-semibold">{formatTime(game.scheduled_at)}</p>
    </Link>
  );
}

function ExploreCard({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group relative rounded-2xl border border-white/10 bg-white/[0.01] p-6 transition-all hover:border-rcl-gold/50 shadow-xl block">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-black uppercase tracking-tight text-white group-hover:text-rcl-gold transition-colors">
          {title}
        </h3>
        <div className="text-gray-500 group-hover:text-rcl-gold transition-colors">{icon}</div>
      </div>
      <p className="mt-3 text-xs text-gray-400 font-semibold leading-relaxed">{detail}</p>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-xs text-gray-500">{message}</div>;
}
