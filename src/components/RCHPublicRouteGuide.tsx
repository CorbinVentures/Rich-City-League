'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
  const { user, loading } = useAuth();
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
    profile: { label: 'My RCH Profile', note: 'Manage your basketball identity' },
    social: { label: 'RCH Social', note: 'Your basketball conversations and connections' },
    messages: { label: 'Messages', note: 'Your private RCH conversations' },
    notifications: { label: 'Notifications', note: 'Activity and updates for you' },
    dashboard: { label: 'Member Dashboard', note: 'Your basketball headquarters' },
    'my-hoops': { label: 'My Hoops', note: 'Your saves, opportunities and basketball life' },
    professional: { label: 'Professional Dashboard', note: 'Your audience and content insights' },
    settings: { label: 'Account Settings', note: 'Your preferences and privacy' },
    friends: { label: 'Connections', note: 'Your basketball network' },
    fantasy: { label: 'Fantasy', note: 'Your basketball competition' },
    portal: { label: 'League Tools', note: 'Your approved organization workspace' },
    admin: { label: 'Admin Tools', note: 'Manage Rich City Hoops' },
    clips: { label: 'RCH Clips', note: 'Highlights and basketball moments' },
    staff: { label: 'Staff Tools', note: 'Your assigned role and operations' },
    account: { label: 'Account security', note: 'Protect your account' },
    app: { label: 'RCH App', note: 'Add the community to your home screen' },
    legal: { label: 'Legal & Safety', note: 'Your rights and our community standards' },
    auth: { label: 'RCH Membership', note: 'Your basketball world starts here' },
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
          const resolvedHref = user && href === '/pulse' ? '/social' : href;
          const selected = pathname === resolvedHref || pathname.startsWith(resolvedHref + '/');
          return <Link key={href} href={resolvedHref} aria-current={selected?'page':undefined} className={selected?'active':undefined}><Icon aria-hidden="true"/>{label}</Link>;
        })}
      </nav>
      {loading ? <span className="rch-browser-route-guide-join" role="status">Checking account…</span> : <Link className="rch-browser-route-guide-join" href={user ? '/profile' : '/auth/sign-up'}>{user ? 'My Profile' : 'Join Free'} <FaArrowRight aria-hidden="true"/></Link>}
    </div>
  </div>;
}
