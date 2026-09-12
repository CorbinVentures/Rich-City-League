import Link from 'next/link';
import { FaArrowRight, FaBasketball, FaBolt, FaCalendarDays, FaChartLine, FaComments, FaCrown, FaShirt, FaTrophy } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getLeagueSnapshot } from '@/lib/public-data';
import { formatDate, formatTime } from '@/utils/helpers';

export const revalidate = 60;

const destinations = [
  { href: '/games', label: 'The Court', detail: 'Games & schedules', icon: FaBasketball, className: 'city-feature city-court' },
  { href: '/standings', label: 'The League', detail: 'Standings & rankings', icon: FaTrophy, className: 'city-feature city-league' },
  { href: '/lab', label: 'The Lab', detail: 'Train smarter. Build your game.', icon: FaChartLine, className: 'city-feature city-lab' },
  { href: '/communities', label: 'The Neighborhood', detail: 'Communities & conversations', icon: FaComments, className: 'city-tile' },
  { href: '/news', label: 'The Stage', detail: 'News, highlights & media', icon: FaBolt, className: 'city-tile' },
  { href: '/fantasy', label: 'RCL Fantasy', detail: 'Build your fantasy team', icon: FaTrophy, className: 'city-tile' },
  { href: '/shop', label: 'The Shop', detail: 'Official RCL gear', icon: FaShirt, className: 'city-tile' },
  { href: '/dashboard', label: 'My Career', detail: 'Build your legacy', icon: FaCrown, className: 'city-tile' },
];

export default async function CityPage() {
  const { games, teams } = await getLeagueSnapshot();
  const upcomingGames = games.filter((game) => game.status !== 'completed').slice(0, 3);

  return (
    <main className="rcl-world min-h-screen pb-24 text-white lg:pb-12">
      <section className="city-hero">
        <Container maxWidth="xl" className="relative z-10 py-16 sm:py-24">
          <p className="rcl-kicker"><FaBolt /> RCL WORLD · RICHMOND, VIRGINIA</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-black uppercase leading-[.88] sm:text-8xl">Welcome to<br /><span className="text-rcl-orange">the city.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">Play. Compete. Connect. Build your legacy in the Rich City basketball world.</p>
          <Link href="#destinations" className="rcl-button mt-8 inline-flex items-center gap-3">Explore RCL <FaArrowRight /></Link>
        </Container>
      </section>

      <Container maxWidth="xl" className="relative z-10 -mt-8">
        <section aria-labelledby="destinations" className="city-dashboard">
          <div className="flex items-end justify-between gap-4">
            <div><p className="rcl-kicker">YOUR WORLD</p><h2 id="destinations" className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">Choose your destination</h2></div>
            <span className="hidden text-xs uppercase tracking-[.2em] text-slate-500 sm:block">One league. Every way to play.</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map(({ href, label, detail, icon: Icon, className }) => (
              <Link key={href} href={href} className={className}><span className="city-icon"><Icon /></span><span className="mt-auto"><strong>{label}</strong><small>{detail}</small></span><FaArrowRight className="city-arrow" /></Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.6fr]">
          <div className="city-section">
            <div className="flex items-center justify-between"><div><p className="rcl-kicker"><FaCalendarDays /> Upcoming events</p><h2 className="mt-2 font-display text-2xl font-black uppercase">What&apos;s happening</h2></div><Link href="/games" className="rcl-link">All events <FaArrowRight /></Link></div>
            {upcomingGames.length ? <div className="mt-5 grid gap-3 sm:grid-cols-3">{upcomingGames.map((game) => {
              const home = teams.find((team) => team.id === game.home_team_id)?.name ?? 'Home team';
              const away = teams.find((team) => team.id === game.away_team_id)?.name ?? 'Away team';
              return <Link href={`/games/${game.id}`} key={game.id} className="city-event"><span className="text-[10px] font-black uppercase tracking-widest text-rcl-orange">RCL GAME</span><strong>{away} <span>vs</span> {home}</strong><small>{formatDate(game.scheduled_at)} · {formatTime(game.scheduled_at)}</small><small>{game.venue_id ? 'Richmond, VA' : 'RCL Court'}</small></Link>;
            })}</div> : <div className="city-empty mt-5"><FaCalendarDays /><p>Nothing scheduled yet.</p><span>New games and community experiences will appear here.</span></div>}
          </div>
          <div className="city-section city-quote"><p className="rcl-kicker">RCL EXPERIENCES</p><p className="mt-4 font-display text-2xl font-bold uppercase leading-tight">Your next chapter starts on the court.</p><p className="mt-3 text-sm leading-6 text-slate-400">Follow the action, sharpen your game, and find your people.</p><Link href="/register" className="rcl-button mt-6 inline-flex">Join RCL <FaArrowRight /></Link></div>
        </section>
      </Container>
    </main>
  );
}
