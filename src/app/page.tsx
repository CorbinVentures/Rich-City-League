import Link from 'next/link';
import { Container } from '@/components/Container';
import { SplashIntro } from '@/components/SplashIntro';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';
import { getLeagueSnapshot, getPublicClient } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';
import {
  FaArrowRight,
  FaBolt,
  FaChartLine,
  FaCrown,
  FaNewspaper,
  FaPeopleGroup,
  FaPlay,
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
    <main className="rcl-mockup-page min-h-screen overflow-hidden pb-24 text-white lg:pb-0">
      <SplashIntro />
      <section className="rcl-mockup-hero">
        <ContentAssetBackground assetKey="homepage.hero" opacity={0.62} className="rcl-mockup-hero-image" />
        <div className="rcl-mockup-hero-overlay" aria-hidden="true" />
        <div className="rcl-mockup-grid" aria-hidden="true" />
        <Container maxWidth="xl" className="relative z-10 flex min-h-[42rem] items-end py-12 sm:min-h-[48rem] sm:py-16">
          <div className="max-w-3xl">
            <p className="rcl-mockup-kicker"><FaBolt /> 804 · RICHMOND, VIRGINIA</p>
            <h1 className="rcl-mockup-title mt-5">RICH CITY<br /><span>BUILDS</span><br /><span>DIFFERENT.</span></h1>
            <p className="rcl-mockup-tagline mt-6">PLAY. COMPETE. CONNECT. GROW.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="https://vba.leagueapps.com/leagues" className="rcl-mockup-primary">REGISTER NOW <FaArrowRight /></Link>
              <Link href="/media" className="rcl-mockup-secondary"><FaPlay /> WATCH TRAILER</Link>
            </div>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="rcl-mockup-body relative z-10 -mt-8 space-y-10 sm:-mt-10 sm:space-y-14">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="rcl-mockup-live rcl-mockup-panel">
            <div className="rcl-mockup-panel-head">
              <span className="rcl-mockup-live-label"><i /> {upcomingGames[0]?.status === 'live' ? 'LIVE NOW' : 'NEXT UP'}</span>
              <span>MEN'S LEAGUE</span>
            </div>
            {upcomingGames[0] ? (
              <Link href={'/games/' + upcomingGames[0].id} className="rcl-scoreboard">
                <div className="rcl-team-side"><b>{teams.find(t => t.id === upcomingGames[0].away_team_id)?.short_name ?? teams.find(t => t.id === upcomingGames[0].away_team_id)?.name ?? 'AWAY'}</b><small>AWAY</small></div>
                <div className="rcl-score-center">
                  {upcomingGames[0].status === 'live' ? <><strong>{upcomingGames[0].away_score}</strong><em>—</em><strong>{upcomingGames[0].home_score}</strong></> : <strong className="rcl-vs">VS</strong>}
                  <span>{upcomingGames[0].status === 'live' ? 'LIVE GAME' : formatTime(upcomingGames[0].scheduled_at)}</span>
                </div>
                <div className="rcl-team-side"><b>{teams.find(t => t.id === upcomingGames[0].home_team_id)?.short_name ?? teams.find(t => t.id === upcomingGames[0].home_team_id)?.name ?? 'HOME'}</b><small>HOME</small></div>
                <span className="rcl-score-action">{upcomingGames[0].status === 'live' ? 'WATCH LIVE' : 'VIEW GAME'} <FaArrowRight /></span>
              </Link>
            ) : <div className="rcl-empty-inline">The next game will appear here as soon as the schedule is published.</div>}
          </div>

          <div className="rcl-mockup-panel rcl-upcoming">
            <div className="rcl-mockup-panel-head"><span>UPCOMING GAMES</span><Link href="/games">VIEW ALL →</Link></div>
            <div className="rcl-upcoming-list">
              {upcomingGames.slice(0, 3).map(game => (
                <Link href={'/games/' + game.id} key={game.id} className="rcl-upcoming-row">
                  <strong>{formatDate(game.scheduled_at).split(',')[0]}</strong>
                  <span>{formatTime(game.scheduled_at)}</span>
                  <b>{teams.find(t => t.id === game.away_team_id)?.short_name ?? teams.find(t => t.id === game.away_team_id)?.name ?? 'AWAY'}</b>
                  <em>VS</em>
                  <b>{teams.find(t => t.id === game.home_team_id)?.short_name ?? teams.find(t => t.id === game.home_team_id)?.name ?? 'HOME'}</b>
                  <small>RICHMOND, VA</small>
                </Link>
              ))}
              {!upcomingGames.length && <div className="rcl-empty-inline">No upcoming games yet.</div>}
            </div>
          </div>
        </section>

        <section className="rcl-mockup-shortcuts">
          <Shortcut href="https://vba.leagueapps.com/leagues" icon={<FaTrophy />} title="REGISTER" subtitle="Join the league" />
          <Shortcut href="/games" icon={<FaCalendarDays />} title="SCHEDULE" subtitle="Games & events" />
          <Shortcut href="/teams" icon={<FaPeopleGroup />} title="TEAMS" subtitle="View all teams" />
          <Shortcut href="/stats" icon={<FaChartLine />} title="STATS" subtitle="Players & team stats" />
          <Shortcut href="/social" icon={<FaPeopleGroup />} title="SOCIAL" subtitle="Join the community" />
          <Shortcut href="/lab" icon={<FaFlask />} title="THE LAB" subtitle="AI, analysis & more" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_.7fr]">
          <div>
            <MockupSectionHead title="FEATURED PLAYERS" href="/players" />
            <div className="rcl-player-grid">
              <Link href="/players" className="rcl-player-card"><ContentAssetBackground assetKey="players.cover" opacity={0.78} /><div className="rcl-player-shade" /><span className="rcl-player-rank">#01</span><div className="rcl-player-info"><small>RCL PLAYER</small><h3>DISCOVER<br />PLAYERS</h3><div><b>PLAYER PROFILES</b><b>→</b></div></div></Link>
              <Link href="/rankings" className="rcl-player-card"><ContentAssetBackground assetKey="players.cover" opacity={0.60} /><div className="rcl-player-shade" /><span className="rcl-player-rank">#02</span><div className="rcl-player-info"><small>RCL SYSTEM</small><h3>RANKINGS<br />RISING</h3><div><b>SEE THE LIST</b><b>→</b></div></div></Link>
              <Link href="/stats" className="rcl-player-card"><ContentAssetBackground assetKey="players.cover" opacity={0.46} /><div className="rcl-player-shade" /><span className="rcl-player-rank">#03</span><div className="rcl-player-info"><small>PLAYER IQ</small><h3>MEASURE<br />YOUR IMPACT</h3><div><b>VIEW STATS</b><b>→</b></div></div></Link>
            </div>
          </div>

          <div>
            <MockupSectionHead title="COMMUNITY FEED" href="/social" />
            <div className="rcl-feed-panel">
              {posts?.slice(0, 2).map((post: any) => <SocialCard key={post.id} post={post} />)}
              {!posts?.length && <div className="rcl-empty-inline">The city feed is ready for its first post.</div>}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
          <Link href="/lab" className="rcl-lab-feature">
            <ContentAssetBackground assetKey="homepage.featured" opacity={0.48} className="rcl-lab-image" />
            <div className="rcl-lab-overlay" />
            <div className="relative z-10 max-w-lg">
              <p className="rcl-mockup-kicker"><FaFlask /> WHERE BASKETBALL MEETS TECHNOLOGY</p>
              <h2>THE <span>LAB</span></h2>
              <ul><li>AI COACH</li><li>PLAYER ANALYTICS</li><li>GAME SIMULATIONS</li><li>RANKING ENGINE</li><li>FANTASY LEAGUES</li></ul>
              <span className="rcl-mockup-secondary">ENTER THE LAB <FaArrowRight /></span>
            </div>
          </Link>
          <Link href="/media" className="rcl-between-lines">
            <ContentAssetBackground assetKey="players.cover" opacity={0.45} className="rcl-between-image" />
            <div className="rcl-between-overlay" />
            <div className="relative z-10">
              <small>RICH CITY LEAGUE · DOCUMENTARY SERIES</small>
              <h2>BETWEEN<br />THE LINES</h2>
              <span>WATCH NOW <FaArrowRight /></span>
            </div>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_.7fr]">
          <div className="rcl-mockup-panel rcl-pulse-panel">
            <MockupSectionHead title="LEAGUE PULSE" href="/standings" />
            {standings.slice(0, 5).map((standing, index) => (
              <Link href="/standings" key={standing.id} className="rcl-pulse-row">
                <span>#{String(index + 1).padStart(2, '0')}</span>
                <b>{teams.find(t => t.id === standing.team_id)?.short_name ?? teams.find(t => t.id === standing.team_id)?.name ?? 'RCL TEAM'}</b>
                <small>{standing.wins}W · {standing.losses}L</small>
              </Link>
            ))}
            {!standings.length && <div className="rcl-empty-inline">Standings appear after games are logged.</div>}
          </div>
          <div className="rcl-mockup-panel">
            <MockupSectionHead title="LATEST FROM RCL" href="/news" />
            {news.slice(0, 3).map(item => <Link href={'/news/' + item.slug} key={item.id} className="rcl-news-row"><small>RCL NEWS</small><b>{item.title}</b></Link>)}
            {!news.length && <div className="rcl-empty-inline">RCL stories will appear here.</div>}
          </div>
        </section>

        <footer className="rcl-mockup-footer">
          <div><strong>RCL</strong><small>RICH CITY LEAGUE<br />PLAYERS. PEOPLE. PURPOSE.</small></div>
          <div><span>RICHMOND, VA</span><small>BUILT BY THE COMMUNITY.<br />FOR THE NEXT GENERATION.</small></div>
        </footer>
      </Container>    </main>
  );
}

function Shortcut({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return <Link href={href} className="rcl-mockup-shortcut"><span>{icon}</span><b>{title}</b><small>{subtitle}</small></Link>;
}

function MockupSectionHead({ title, href }: { title: string; href: string }) {
  return <div className="rcl-mockup-section-head"><h2>{title}</h2><Link href={href}>VIEW ALL <FaArrowRight /></Link></div>;
}
