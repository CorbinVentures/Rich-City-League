import { FaBasketball, FaCompass, FaComments, FaHouse, FaPeopleGroup, FaPlus, FaUser } from 'react-icons/fa6';
import type { IconType } from 'react-icons';

export type RCLMemberNavItem = {
  label: string;
  href: string;
  icon: IconType;
  action?: 'create';
};

export const RCL_MEMBER_PRIMARY_NAV: RCLMemberNavItem[] = [
  { label: 'Home', href: '/social', icon: FaHouse },
  { label: 'Explore', href: '/explore', icon: FaCompass },
  { label: 'Create', href: '/social?compose=1', icon: FaPlus, action: 'create' },
  { label: 'League', href: '/league', icon: FaBasketball },
  { label: 'Profile', href: '/profile', icon: FaUser },
];

export const RCL_MEMBER_DESKTOP_NAV: RCLMemberNavItem[] = [
  { label: 'Home', href: '/social', icon: FaHouse },
  { label: 'Explore', href: '/explore', icon: FaCompass },
  { label: 'League', href: '/league', icon: FaBasketball },
  { label: 'Communities', href: '/communities', icon: FaPeopleGroup },
  { label: 'Messages', href: '/messages', icon: FaComments },
];

const SOCIAL_HOME_FAMILY = ['/social', '/friends', '/runs', '/communities', '/messages', '/notifications'];

export function isMemberNavigationActive(pathname: string, href: string) {
  if (href === '/social') return SOCIAL_HOME_FAMILY.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const cleanHref = href.split('?')[0];
  return pathname === cleanHref || (cleanHref !== '/' && pathname.startsWith(`${cleanHref}/`));
}
