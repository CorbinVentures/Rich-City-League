'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaArrowRight, FaBasketball, FaCalendarDays, FaChartColumn, FaChartSimple, FaCrown, FaFilm, FaHouse, FaPeopleGroup, FaShieldHalved } from 'react-icons/fa6';

const sections = [
  { label: 'Home', href: '/league', icon: FaHouse, matches: (path: string) => path === '/league' },
  { label: 'Schedule', href: '/schedule', icon: FaCalendarDays, matches: (path: string) => path === '/schedule' || path.startsWith('/schedule/') },
  { label: 'Standings', href: '/standings', icon: FaChartColumn, matches: (path: string) => path === '/standings' || path.startsWith('/standings/') },
  { label: 'Teams', href: '/teams', icon: FaShieldHalved, matches: (path: string) => path === '/teams' || path.startsWith('/teams/') },
  { label: 'Games', href: '/games', icon: FaBasketball, matches: (path: string) => path === '/games' || path.startsWith('/games/') },
  { label: 'Players', href: '/players', icon: FaPeopleGroup, matches: (path: string) => path === '/players' || path.startsWith('/players/') },
  { label: 'Stats', href: '/stats', icon: FaChartSimple, matches: (path: string) => ['/stats', '/leaderboards', '/rankings'].some((route) => path === route || path.startsWith(`${route}/`)) },
  { label: 'Fantasy', href: '/fantasy', icon: FaCrown, matches: (path: string) => path === '/fantasy' || path.startsWith('/fantasy/') },
  { label: 'Highlights', href: '/league/highlights', icon: FaFilm, matches: (path: string) => path.startsWith('/league/highlights') },
  { label: 'Community', href: '/league/community', icon: FaPeopleGroup, matches: (path: string) => path.startsWith('/league/community') },
];

const leagueRoots = ['/schedule', '/standings', '/teams', '/games', '/players', '/stats', '/leaderboards', '/rankings', '/fantasy', '/draft'];

export function LeagueSectionNav() {
  const pathname = usePathname() || '/';
  const isLeaguePage = pathname === '/league' || pathname.startsWith('/league/');
  const isLeagueDataPage = leagueRoots.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (pathname === '/league' || (!isLeaguePage && !isLeagueDataPage) || pathname === '/league/royaltee' || pathname.startsWith('/league/royaltee/')) return null;

  return (
    <section aria-label="Rich City League sections" className="relative z-20 border-y border-white/10 bg-[linear-gradient(105deg,#0c1b2a,#10283a_48%,#0b1927)] text-white shadow-[0_10px_26px_rgba(0,0,0,.16)]">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/league" className="hidden shrink-0 items-center gap-2 border-r border-white/10 py-3 pr-5 sm:flex">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg border border-[#d0b47b]/45 bg-[#d0b47b]/10 font-display text-[10px] font-black tracking-tight text-[#ead3a1]">RCL</span>
          <span className="grid leading-tight"><span className="text-[9px] font-black uppercase tracking-[.16em] text-white/90">League Center</span><span className="mt-1 text-[8px] font-bold uppercase tracking-[.13em] text-white/45">Virginia · 2027</span></span>
        </Link>
        <nav aria-label="League pages" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.filter((section) => section.label !== 'Home' || pathname !== '/league').map(({ label, href, icon: Icon, matches }) => {
            const active = matches(pathname);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-[11px] font-extrabold tracking-[.015em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9dc9ec] ${active ? 'border-[#d0b47b]/40 bg-white/[.09] text-[#f0d99f]' : 'border-transparent text-white/70 hover:border-white/10 hover:bg-white/[.05] hover:text-white'}`}>
                <Icon aria-hidden="true" className="text-[10px] opacity-85" />{label}
              </Link>
            );
          })}
          <Link href="/draft" aria-current={pathname === '/draft' || pathname.startsWith('/draft/') ? 'page' : undefined} className="ml-auto hidden min-h-9 shrink-0 items-center gap-2 rounded-lg border border-[#d0b47b]/35 px-3 text-[10px] font-black uppercase tracking-[.08em] text-[#e7cd94] transition hover:bg-[#d0b47b]/10 md:inline-flex">Draft Night <FaArrowRight aria-hidden="true" className="text-[9px]" /></Link>
        </nav>
      </div>
    </section>
  );
}
