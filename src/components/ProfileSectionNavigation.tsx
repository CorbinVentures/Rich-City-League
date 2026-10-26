import Link from 'next/link';

type ProfileKind = 'player' | 'coach' | 'fan';
type ProfileSection = 'wall' | 'posts' | 'followers' | 'following' | 'highlights' | 'stats' | 'career' | 'badges' | 'media' | 'coach';
type ProfileSectionNavigationProps = {
  kind: ProfileKind;
  activeTab: ProfileSection;
  visibleTabs: readonly ProfileSection[];
  counts: Record<ProfileSection, number>;
  href: string;
};

const names: Record<ProfileSection, string> = {
  wall: 'Wall', posts: 'Posts', followers: 'Followers', following: 'Following',
  highlights: 'Highlights', stats: 'Stats', career: 'Career', badges: 'Badges',
  media: 'Media', coach: 'Coaching'
};

/** A focused social-first profile dock; existing ?tab= links remain canonical. */
export function ProfileSectionNavigation({ kind, activeTab, visibleTabs, counts, href }: ProfileSectionNavigationProps) {
  const suggested: ProfileSection[] = kind === 'player' ? ['highlights', 'stats', 'wall'] :
    kind === 'coach' ? ['coach', 'wall', 'posts'] : ['wall', 'posts', 'media'];
  const primary = suggested.filter((tab) => visibleTabs.includes(tab));
  const more = Array.from(new Set<ProfileSection>([...visibleTabs.filter((tab) => !primary.includes(tab)), 'followers', 'following']))
    .filter((tab) => !primary.includes(tab));
  const moreActive = !primary.includes(activeTab) && more.includes(activeTab);

  return <nav className="rch-profile-tabs sticky top-16 z-30 border-b border-[#44484e] bg-[#0b0c0e]/95 px-3 py-2 backdrop-blur-xl" aria-label="Profile sections">
    <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 sm:gap-2">
      {primary.map((tab) => <Link
        key={tab}
        href={href + '?tab=' + tab}
        aria-current={activeTab === tab ? 'page' : undefined}
        className={'flex min-h-11 min-w-0 items-center justify-center rounded-lg px-1 text-center text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff768c] ' +
          (activeTab === tab ? 'bg-[#c8102e] text-white' : 'text-[#d0d1d4] hover:bg-[#202326]')}
      >{names[tab] ?? tab}</Link>)}
      <details className="group relative min-w-0">
        <summary aria-label={moreActive ? 'More profile sections, showing ' + (names[activeTab] ?? activeTab) : 'More profile sections'}
          className={'flex min-h-11 cursor-pointer list-none items-center justify-center rounded-lg px-1 text-center text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff768c] [&::-webkit-details-marker]:hidden ' +
            (moreActive ? 'bg-[#c8102e] text-white' : 'text-[#d0d1d4] hover:bg-[#202326]')}
        >{moreActive ? names[activeTab] ?? 'More' : 'More'} <span aria-hidden="true" className="ml-1">⌄</span></summary>
        <div className="absolute right-0 top-full z-40 mt-1 max-h-[55dvh] min-w-[190px] overflow-y-auto rounded-lg border border-[#44484e] bg-[#141618] p-1 shadow-xl">
          {more.map((tab) => <Link key={tab} href={href + '?tab=' + tab}
            aria-current={activeTab === tab ? 'page' : undefined}
            className={'flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff768c] ' +
              (activeTab === tab ? 'bg-[#c8102e] text-white' : 'text-[#d0d1d4] hover:bg-[#202326]')}>
            <span>{names[tab] ?? tab}</span>
            <span className="text-xs opacity-70">{counts[tab] ?? 0}</span>
          </Link>)}
        </div>
      </details>
    </div>
  </nav>;
}
