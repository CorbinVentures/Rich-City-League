import Link from 'next/link';
import { Container } from '@/components/Container';
import { FaBookOpen, FaCalendarDays, FaHeadset, FaNewspaper, FaShop, FaTrophy, FaFlask, FaArrowRight } from 'react-icons/fa6';

const tiles = [
  { href: '/lab', label: 'The Lab', sub: 'Training & Content', icon: FaFlask },
  { href: '/shop', label: 'Shop', sub: 'Gear & Merch', icon: FaShop },
  { href: '/fantasy', label: 'Fantasy', sub: 'Build Your Roster', icon: FaTrophy },
  { href: '/games', label: 'Events', sub: 'Tournaments & More', icon: FaCalendarDays },
  { href: '/news', label: 'News', sub: 'Stories & Updates', icon: FaNewspaper },
  { href: '/faq', label: 'Support', sub: 'Help Center', icon: FaHeadset },
];

export default function MorePage() {
  return <main className="rcl-mock-page rcl-more-page min-h-screen bg-rcl-black pb-24 text-white">
    <Container maxWidth="lg" className="py-10 sm:py-16">
      <div className="rcl-mock-hero">
        <p className="rcl-kicker">RICH CITY LEAGUE</p>
        <h1 className="rcl-display mt-3 text-5xl uppercase leading-[.88] sm:text-7xl">RCL <span className="text-rcl-orange">Hub</span></h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">Everything beyond the court. Training, stories, events, fantasy, gear and support — all in one place.</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(({ href, label, sub, icon: Icon }) => <Link key={href} href={href} className="rcl-hub-tile group">
          <span className="rcl-hub-icon"><Icon /></span>
          <span className="mt-5 block font-display text-lg font-black uppercase">{label}</span>
          <span className="mt-1 block text-[10px] uppercase tracking-wider text-white/35">{sub}</span>
          <FaArrowRight className="mt-5 text-xs text-rcl-orange opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" />
        </Link>)}
      </div>
      <section className="rcl-hub-banner mt-5">
        <p className="rcl-kicker">BASKETBALL BUILDS</p>
        <h2 className="rcl-display mt-2 text-3xl uppercase">Better players.<br/><span className="text-rcl-orange">Better people.</span></h2>
        <Link href="/lab" className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white">Enter The Lab <FaArrowRight /></Link>
      </section>
    </Container>
  </main>;
}
