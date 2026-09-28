import {
  FaBasketball,
  FaBell,
  FaChartSimple,
  FaCompass,
  FaComments,
  FaHouse,
  FaListOl,
  FaPeopleGroup,
  FaPlus,
  FaTrophy,
  FaUser,
  FaUsers,
} from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import type { RCLNavGroup } from '@/lib/rcl-navigation';

export type RCLMemberNavItem = {
  label: string;
  href: string;
  icon: IconType;
  action?: 'create';
};

export const RCL_MEMBER_PRIMARY_NAV: RCLMemberNavItem[] = [
  { label: 'Home', href: '/social', icon: FaHouse },
  { label: 'Explore', href: '/explore', icon: FaCompass },
  { label: 'Create', href: '/create', icon: FaPlus, action: 'create' },
  { label: 'League', href: '/league', icon: FaBasketball },
  { label: 'Profile', href: '/social/profile/me', icon: FaUser },
];

export const RCL_MEMBER_DESKTOP_NAV: RCLMemberNavItem[] = [
  { label: 'Home', href: '/social', icon: FaHouse },
  { label: 'Explore', href: '/explore', icon: FaCompass },
  { label: 'Create', href: '/create', icon: FaPlus, action: 'create' },
  { label: 'League', href: '/league', icon: FaBasketball },
  { label: 'Profile', href: '/social/profile/me', icon: FaUser },
];

export const RCL_MEMBER_NAV_GROUPS: RCLNavGroup[] = [
  {
    label: 'Network',
    description: 'People, conversation and basketball activity',
    items: [
      { label: 'Home', href: '/social', icon: FaHouse },
      { label: 'Explore', href: '/explore', icon: FaCompass },
      { label: 'Create', href: '/create', icon: FaPlus },
      { label: 'Communities', href: '/communities', icon: FaPeopleGroup },
      { label: 'Runs', href: '/runs', icon: FaBasketball },
      { label: 'Messages', href: '/messages', icon: FaComments },
      { label: 'Notifications', href: '/notifications', icon: FaBell },
    ],
  },
  {
    label: 'League',
    description: 'Official competition powered by RCL',
    items: [
      { label: 'League Center', href: '/league', icon: FaBasketball },
      { label: 'Games', href: '/games', icon: FaBasketball },
      { label: 'Standings', href: '/standings', icon: FaListOl },
      { label: 'Stats', href: '/stats', icon: FaChartSimple },
      { label: 'Players', href: '/players', icon: FaUser },
      { label: 'Teams', href: '/teams', icon: FaUsers },
      { label: 'Rankings', href: '/rankings', icon: FaListOl },
      { label: 'Fantasy', href: '/fantasy', icon: FaTrophy },
    ],
  },
  {
    label: 'Identity',
    description: 'Your basketball identity and reputation',
    items: [
      { label: 'Edit Profile', href: '/profile', icon: FaUser },
      { label: 'REP + Badges', href: '/badges', icon: FaTrophy },
      { label: 'People', href: '/friends', icon: FaUsers },
    ],
  },
];

const SOCIAL_HOME_FAMILY = ['/social', '/friends', '/runs', '/communities'];

export function isMemberNavigationActive(pathname: string, href: string) {
  if (href === '/social') return SOCIAL_HOME_FAMILY.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const cleanHref = href.split('?')[0];
  return pathname === cleanHref || (cleanHref !== '/' && pathname.startsWith(`${cleanHref}/`));
}
