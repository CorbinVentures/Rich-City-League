'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaArrowRight, FaBasketball, FaChevronRight, FaCompass, FaHouse, FaPlay, FaTrophy, FaUsers } from 'react-icons/fa6';

const items = [
  { href: '/discover', label: 'Discover', Icon: FaCompass },
  { href: '/runs', label: 'Runs', Icon: FaBasketball },
  { href: '/league', label: 'League', Icon: FaTrophy },
  { href: '/pulse', label: 'Social', Icon: FaUsers },
  { href: '/media', label: 'RCH TV', Icon: FaPlay },
] as const;

/** Contextual browser navigation. Never mounted in installed-PWA chrome. */
export function RCHPublicRouteGuide() {
  const pathname = usePathname() || '/';
  if (pathname === '/' || pathname === '/pulse') return null;

  const sections: Record<string, { label: string; note: string }> = {
    discover: { label: 'Discover Virginia', note: 'Find your next opportunity' },
    runs: { label: 'Open Runs', note: 'Play anywhere in Virginia' },
    league: { label: 'Rich City League', note: 'A new era of Virginia basketball' },
    teams: { label: 'Teams', note: 'Follow your favorite competition' },
    players: { label: 'Players', note: 'The people behind the game' },
    coaches: { label: 'Coaches', note: 'Find the leaders building the next generation' },
    news: { label: 'RCH Newsroom', note: 'Basketball, culture and stories' },
    media: { label: 'RCH TV', note: 'Watch the culture come alive' },
    search: { label: 'Search', note: 'Find basketball people and places' },
    games: { label: 'Games', note: 'Matchups and game results' },
    schedule: { label: 'Schedule', note: 'Catch the next game' },
    standings: { label: 'Standings', note: 'The road to the top' },
    stats: { label: 'Statistics', note: 'Every number tells a story' },
    rankings: { label: 'Rankings', note: 'The best compete here' },
    leaderboards: { label: 'Leaderboards', note: 'Built on performance' },
    commonwealth: { label: 'Commonwealth Cup', note: 'Competitive basketball culture' },
    crews: { label: 'Crews', note: 'Your people, your legacy' },
    communities: { label: 'Neighborhoods', note: 'Every court has a story' },
    community: { label: 'Virginia Community', note: 'More than the game' },
    shop: { label: 'RCH Shop', note: 'Rep your basketball culture' },
    sponsors: { label: 'Partnerships', note: 'Grow the game together' },
    network: { label: 'RCH Network', note: 'Organizations across Virginia' },
    organizations: { label: 'Organizations', note: 'The Virginia basketball network' },
    membership: { label: 'Membership', note: 'Find your place in the community' },
    seasons: { label: 'Seasons', note: 'The league timeline' },
    divisions: { label: 'Divisions', note: 'Know your competition' },
    draft: { label: 'The Draft', note: 'The future starts here' },
    register: { label: 'Registration', note: 'Your next basketball chapter' },
    about: { label: 'About RCH', note: 'Built for Virginia hoops' },
  };
  const segment = pathname.split('/').filter(Boolean)[0] || 'discover';
  const info = sections[segment] ?? { label: 'Rich City Hoops', note: 'Virginia basketball lives here' };

  return <div className="rch-browser-route-guide">
    <div className="rch-browser-route-guide-inner">
      <div className="rch-browser-route-guide-copy">
        <div className="rch-browser-breadcrumb"><Link href="/" aria-label="RCH home"><FaHouse /> RCH</Link><FaChevronRight aria-hidden="true"/><span>{info.label}</span></div>
        <div className="rch-browser-route-guide-title"><b>{info.label}</b><span>{info.note}</span></div>
      </div>
      <nav aria-label="More Virginia basketball" className="rch-browser-route-guide-links">
        {items.map(({ href,label,Icon }) => {
          const selected = pathname === href || pathname.startsWith(href + '/');
          return <Link key={href} href={href} aria-current={selected?'page':undefined} className={selected?'active':undefined}><Icon aria-hidden="true"/>{label}</Link>;
        })}
      </nav>
      <Link className="rch-browser-route-guide-join" href="/auth/sign-up">Join Free <FaArrowRight aria-hidden="true"/></Link>
    </div>
  </div>;
}
