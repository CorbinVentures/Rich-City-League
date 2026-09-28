import Link from 'next/link';
import { Container } from '@/components/Container';
import {
  FaArrowRight, FaBasketball, FaCalendarDays, FaChartSimple,
  FaListOl, FaRankingStar, FaTrophy, FaUsers, FaUserTie
} from 'react-icons/fa6';

export const metadata = {
  title: 'League Center',
  description: 'Schedules, games, standings, stats, teams, rankings, and competition across Rich City League.',
};

const primary = [
  { title:'Schedule', copy:'See what is next across the league.', href:'/schedule', icon:FaCalendarDays },
  { title:'Games', copy:'Follow matchups, results, and game detail.', href:'/games', icon:FaBasketball },
  { title:'Standings', copy:'Track every team through the season.', href:'/standings', icon:FaListOl },
  { title:'Stats', copy:'Explore official player and team performance.', href:'/stats', icon:FaChartSimple },
];

const secondary = [
  { label:'Players', href:'/players', icon:FaUsers },
  { label:'Teams', href:'/teams', icon:FaTrophy },
  { label:'Rankings', href:'/rankings', icon:FaRankingStar },
  { label:'Coaches', href:'/coaches', icon:FaUserTie },
];

export default function LeagueCenterPage(){
  return <main className="min-h-screen bg-[#03070d] text-white">
    <section className="relative overflow-hidden border-b border-rcl-blue/20 bg-[linear-gradient(120deg,#071522_0%,#03070d_58%,#08121d_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,79,22,.17),transparent_28%),radial-gradient(circle_at_12%_72%,rgba(21,159,255,.14),transparent_32%)]" />
      <Container maxWidth="xl" className="relative py-14 md:py-20">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[.3em] text-rcl-orange">Competition · Richmond, Virginia</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.9] sm:text-6xl md:text-8xl">League<br/><span className="text-rcl-blue">Center.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 md:text-lg">One clean home for schedules, games, standings, official stats, teams, rankings, and the competitive RCL experience.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/schedule" className="inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-sm font-black uppercase text-black">View schedule <FaArrowRight/></Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl border border-rcl-blue/35 bg-rcl-blue/10 px-5 py-3 text-sm font-black uppercase">Join RCL <FaArrowRight/></Link>
          </div>
        </div>
      </Container>
    </section>

    <Container maxWidth="xl" className="py-12 md:py-16">
      <div className="mb-7"><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Game day essentials</p><h2 className="mt-2 font-display text-3xl font-black uppercase md:text-4xl">Everything that drives the season</h2></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primary.map((item,index)=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="group relative min-h-56 overflow-hidden rounded-2xl border border-rcl-blue/20 bg-gradient-to-br from-[#0a1b2a] to-[#050b12] p-6 transition hover:-translate-y-1 hover:border-rcl-orange/50">
          <span className="text-xs font-black tracking-[.2em] text-rcl-orange">0{index+1}</span>
          <span className="mt-8 grid h-12 w-12 place-items-center rounded-xl bg-rcl-blue/10 text-xl text-rcl-blue"><Icon/></span>
          <h3 className="mt-5 font-display text-2xl font-black uppercase">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/50">{item.copy}</p>
          <FaArrowRight className="absolute bottom-6 right-6 text-white/25 transition group-hover:text-rcl-orange"/>
        </Link>})}
      </div>

      <section className="mt-10 rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-5 md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-blue">League directory</p><h2 className="mt-2 font-display text-2xl font-black uppercase md:text-3xl">People, teams, rankings</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Move through the competitive side of RCL without hunting across separate menus.</p></div>
          <Link href="/explore" className="text-xs font-black uppercase tracking-wider text-rcl-orange">Explore all of RCL →</Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {secondary.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="group flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-rcl-blue/45 hover:bg-rcl-blue/5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-rcl-blue/10 text-rcl-blue"><Icon/></span><b className="font-display text-sm uppercase tracking-wide">{item.label}</b><FaArrowRight className="ml-auto text-xs text-white/20 transition group-hover:text-rcl-orange"/></Link>})}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-2xl border border-rcl-orange/25 bg-rcl-orange/5 p-6 md:p-8"><p className="text-xs font-black uppercase tracking-[.24em] text-rcl-orange">Build the next season</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Play. Compete. Connect. Grow.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/50">Register, build your profile, follow your team, and let your official performance carry across the entire RCL platform.</p><Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-xs font-black uppercase text-black">Registration <FaArrowRight/></Link></div>
        <div className="rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-6 md:p-8"><FaTrophy className="text-3xl text-rcl-blue"/><h3 className="mt-5 font-display text-2xl font-black uppercase">Draft Night</h3><p className="mt-2 text-sm leading-6 text-white/50">Follow the moment teams are built and the next chapter starts.</p><Link href="/draft" className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase text-rcl-blue">Open Draft Night <FaArrowRight/></Link></div>
      </section>
    </Container>
  </main>;
}
