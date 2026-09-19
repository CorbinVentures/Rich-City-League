import Link from 'next/link';
import { Container } from '@/components/Container';
import { SplashIntro } from '@/components/SplashIntro';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';
import {
  FaArrowRight,
  FaCalendarDays,
  FaChartLine,
  FaFlask,
  FaPeopleGroup,
  FaPlay,
  FaRankingStar,
  FaShirt,
  FaTrophy,
  FaUsers,
} from 'react-icons/fa6';

export const revalidate = 60;

export default async function HomePage() {
  const { teams, games, standings, news } = await getLeagueSnapshot();
  const client = getPublicClient();

  const [{ data: posts }, { data: players }] = client
    ? await Promise.all([
        client.from('posts').select('id,body,created_at,author:profiles(display_name,first_name,last_name)').eq('status', 'published').order('created_at', { ascending: false }).limit(3),
        client.from('public_players').select('id,first_name,last_name,position,photo_url').eq('is_active', true).order('last_name').limit(3),
      ])
    : [{ data: [] }, { data: [] }];

  const liveGame = games.find((game) => game.status === 'live');
  const nextGames = games.filter((game) => game.status !== 'completed' && game.status !== 'cancelled').slice(0, 3);
  const featuredGame = liveGame ?? nextGames[0];
  const featuredTeams = featuredGame
    ? {
        home: teams.find((team) => team.id === featuredGame.home_team_id)?.name ?? 'Home Team',
        away: teams.find((team) => team.id === featuredGame.away_team_id)?.name ?? 'Away Team',
      }
    : null;

  return (
    <main className="rcl-future-site min-h-screen overflow-hidden pb-24 text-white lg:pb-0">
      <SplashIntro />

      <section className="rcl-future-hero">
        <div className="rcl-future-grid" aria-hidden="true" />
        <Container maxWidth="xl" className="relative z-10 flex min-h-[40rem] items-end py-12 sm:py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <p className="rcl-fx-kicker">RICHMOND, VA · MORE THAN A LEAGUE</p>
              <h1 className="rcl-fx-title mt-6 max-w-4xl">
                RICH CITY<br />
                BUILDS <span className="accent">DIFFERENT.</span>
              </h1>
              <p className="rcl-fx-subtitle mt-7 max-w-xl">PLAY. COMPETE. CONNECT. GROW.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="https://vba.leagueapps.com/leagues" className="rcl-fx-btn primary">REGISTER NOW <FaArrowRight /></Link>
                <Link href="/media" className="rcl-fx-btn secondary"><FaPlay /> WATCH TRAILER</Link>
              </div>
            </div>

            <div className="hidden justify-end lg:flex">
              <Link href="/media" className="group flex items-center gap-4 rounded-full border border-white/15 bg-black/25 px-4 py-3 backdrop-blur-md">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 transition group-hover:border-rcl-blue group-hover:bg-rcl-blue/20"><FaPlay /></span>
                <span><strong className="block text-xs font-black tracking-[.16em]">THIS IS RCL</strong><small className="mt-1 block text-[9px] tracking-[.16em] text-white/40">PLAY VIDEO</small></span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-10 -mt-7 space-y-12 sm:-mt-10 sm:space-y-16">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rcl-fx-card rcl-fx-live p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2"><span className="rcl-fx-live-dot" /> <span className="text-[10px] font-black tracking-[.2em] text-orange-300">{liveGame ? 'LIVE NOW' : 'NEXT UP'}</span></div>
              <span className="text-[9px] font-black tracking-[.2em] text-white/35">MEN'S LEAGUE</span>
            </div>
            {featuredGame && featuredTeams ? (
              <Link href={`/games/${featuredGame.id}`} className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <div><p className="font-display text-lg font-black uppercase sm:text-2xl">{featuredTeams.away}</p><p className="mt-1 text-[9px] font-black tracking-[.16em] text-white/35">AWAY</p></div>
                <div><span className="rcl-fx-score">{liveGame ? featuredGame.away_score : 'VS'}</span>{liveGame && <><span className="mx-2 text-white/25">—</span><span className="rcl-fx-score">{featuredGame.home_score}</span></>}</div>
                <div><p className="font-display text-lg font-black uppercase sm:text-2xl">{featuredTeams.home}</p><p className="mt-1 text-[9px] font-black tracking-[.16em] text-white/35">HOME</p></div>
                <span className="col-span-3 mx-auto mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#0f9fff] to-[#0672e8] px-5 text-[9px] font-black tracking-[.15em]">WATCH {liveGame ? 'LIVE' : 'GAME'} <FaArrowRight /></span>
              </Link>
            ) : (
              <div className="py-12 text-center text-sm text-white/35">The next game will appear here as soon as the schedule is published.</div>
            )}
          </div>

          <div className="rcl-fx-card p-5 sm:p-6">
            <div className="flex items-end justify-between"><div><p className="rcl-fx-kicker">UP NEXT</p><h2 className="mt-2 font-display text-xl font-black uppercase">Upcoming Games</h2></div><Link href="/games" className="text-[9px] font-black tracking-[.14em] text-rcl-blue">VIEW ALL →</Link></div>
            <div className="mt-4 divide-y divide-white/5">
              {nextGames.map((game) => {
                const home = teams.find((team) => team.id === game.home_team_id)?.short_name ?? teams.find((team) => team.id === game.home_team_id)?.name ?? 'HOME';
                const away = teams.find((team) => team.id === game.away_team_id)?.short_name ?? teams.find((team) => team.id === game.away_team_id)?.name ?? 'AWAY';
                return <Link href={`/games/${game.id}`} key={game.id} className="grid grid-cols-[3rem_1fr_auto] gap-3 py-3 hover:text-white"><div><strong className="block text-xs font-black">{formatDate(game.scheduled_at).split(',')[0]}</strong><small className="text-[9px] text-white/30">{formatTime(game.scheduled_at)}</small></div><div className="min-w-0"><p className="truncate text-[10px] font-black uppercase">{away} <span className="px-1 text-white/25">VS</span> {home}</p><small className="text-[9px] text-white/30">RICHMOND, VA</small></div><FaArrowRight className="mt-1 text-white/20" /></Link>;
              })}
              {!nextGames.length && <p className="py-8 text-center text-xs text-white/30">No upcoming games yet.</p>}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Quick href="/games" icon={<FaCalendarDays />} title="SCHEDULE" sub="Games & events" />
          <Quick href="/teams" icon={<FaUsers />} title="TEAMS" sub="View all teams" />
          <Quick href="/stats" icon={<FaChartLine />} title="STATS" sub="Players & teams" />
          <Quick href="/social" icon={<FaPeopleGroup />} title="SOCIAL" sub="Join the community" />
          <Quick href="/lab" icon={<FaFlask />} title="THE LAB" sub="AI, analysis & more" />
          <Quick href="/shop" icon={<FaShirt />} title="THE SHOP" sub="Rep the city" />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.55fr_.75fr]">
          <div>
            <SectionLabel title="FEATURED PLAYERS" href="/players" />
            <div className="grid gap-4 md:grid-cols-3">
              {(players ?? []).map((player) => (
                <Link href={`/players/${player.id}`} key={player.id} className="rcl-fx-player-image group p-4">
                  {player.photo_url && <img src={player.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" />}
                  <div className="mt-auto">
                    <span className="text-[9px] font-black tracking-[.16em] text-rcl-orange">PLAYER PROFILE</span>
                    <h3 className="mt-2 font-display text-2xl font-black uppercase">{player.first_name} {player.last_name}</h3>
                    <p className="mt-1 text-[9px] font-black tracking-[.12em] text-white/45">{player.position ?? 'RCL PLAYER'}</p>
                  </div>
                </Link>
              ))}
              {!(players?.length) && <div className="rcl-fx-card p-8 text-sm text-white/35 md:col-span-3">Featured players will appear as the directory fills.</div>}
            </div>
          </div>

          <div>
            <SectionLabel title="COMMUNITY FEED" href="/social" />
            <div className="rcl-fx-card overflow-hidden p-3">
              <div className="rcl-fx-community-image" />
              <div className="space-y-1 p-2">
                {(posts ?? []).slice(0, 2).map((post: any) => {
                  const author = post.author?.display_name || [post.author?.first_name, post.author?.last_name].filter(Boolean).join(' ') || 'RCL Community';
                  return <Link href="/social" key={post.id} className="block border-b border-white/5 py-3 last:border-0"><p className="text-[10px] font-black">{author}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-white/55">{post.body}</p></Link>;
                })}
                {!(posts?.length) && <p className="py-5 text-xs text-white/35">The city feed is ready for its first post.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
          <Link href="/lab" className="rcl-fx-lab-image group p-6 sm:p-8">
            <div className="relative z-10 max-w-lg">
              <p className="rcl-fx-kicker">WHERE BASKETBALL MEETS TECHNOLOGY</p>
              <h2 className="mt-5 font-display text-5xl font-black uppercase italic">THE LAB</h2>
              <ul className="mt-5 space-y-2 text-[10px] font-black tracking-[.12em] text-white/70">
                <li>✓ AI COACH</li><li>✓ PLAYER ANALYTICS</li><li>✓ GAME SIMULATIONS</li><li>✓ RANKING ENGINE</li><li>✓ FANTASY LEAGUES</li>
              </ul>
              <span className="mt-7 inline-flex items-center gap-2 rounded-lg border border-rcl-blue/50 bg-rcl-blue/10 px-4 py-3 text-[9px] font-black tracking-[.15em] text-white">ENTER THE LAB <FaArrowRight /></span>
            </div>
          </Link>

          <Link href="/media" className="rcl-fx-card group overflow-hidden">
            <div className="rcl-fx-community-image min-h-[13rem]" />
            <div className="p-5"><p className="text-[9px] font-black tracking-[.18em] text-rcl-orange">RICH CITY LEAGUE · DOCUMENTARY SERIES</p><h2 className="mt-2 font-display text-3xl font-black uppercase italic">BETWEEN THE LINES</h2><span className="mt-5 inline-flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-rcl-blue">WATCH NOW <FaArrowRight /></span></div>
          </Link>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
          <div className="rcl-fx-card p-5 sm:p-6">
            <SectionLabel title="LEAGUE PULSE" href="/standings" />
            <div className="mt-2">{standings.slice(0, 5).map((standing, index) => <Link href="/standings" key={standing.id} className="rcl-fx-table-row hover:bg-white/[.02]"><span className="rcl-fx-rank">#{String(index + 1).padStart(2, '0')}</span><strong className="truncate text-xs font-black uppercase">{teams.find((team) => team.id === standing.team_id)?.name ?? 'RCL TEAM'}</strong><span className="text-[9px] font-black text-white/35">{standing.wins}W · {standing.losses}L</span></Link>)}</div>
          </div>
          <div className="rcl-fx-card p-5 sm:p-6"><SectionLabel title="LATEST FROM RCL" href="/news" /><div className="mt-2 space-y-3">{news.slice(0, 3).map((item) => <Link href={`/news/${item.slug}`} key={item.id} className="block border-b border-white/5 pb-3 last:border-0"><p className="text-[9px] font-black tracking-[.15em] text-rcl-orange">RCL NEWS</p><h3 className="mt-1 text-xs font-black uppercase leading-5">{item.title}</h3></Link>)}{!news.length&&<p className="py-5 text-xs text-white/35">RCL stories will appear here.</p>}</div></div>
        </section>

        <footer className="border-t border-white/10 pt-8 pb-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><div className="font-display text-3xl font-black italic tracking-tight">RCL</div><p className="mt-1 text-[8px] font-black tracking-[.25em] text-white/25">PLAYERS. PEOPLE. PURPOSE.</p></div>
            <div className="text-[8px] font-black tracking-[.2em] text-white/25">RICHMOND, VA · BUILT BY THE COMMUNITY · FOR THE NEXT GENERATION.</div>
          </div>
        </footer>
      </Container>
    </main>
  );
}

function Quick({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return <Link href={href} className="rcl-fx-shortcut"><span className="rcl-fx-shortcut-icon">{icon}</span><span><strong>{title}</strong><small className="mt-1 block">{sub}</small></span></Link>;
}

function SectionLabel({ title, href }: { title: string; href?: string }) {
  return <div className="rcl-fx-section-label"><h2>{title}</h2>{href && <Link href={href} className="text-[9px] font-black tracking-[.14em] text-rcl-blue">VIEW ALL →</Link>}</div>;
}
