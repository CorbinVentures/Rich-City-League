'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBasketball, FaCompass, FaHouse, FaPlus, FaUser } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';

export function MemberSocialNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname !== '/social' && !pathname.startsWith('/social/')) return null;

  const profileHref = user ? `/social/profile/${user.id}` : '/auth/sign-in?redirect=/social';
  const items = [
    { label: 'Home', href: '/social', icon: FaHouse, active: pathname === '/social' },
    { label: 'Explore', href: '/explore', icon: FaCompass, active: false },
    { label: 'Create', href: '/create', icon: FaPlus, active: false, create: true },
    { label: 'League', href: '/league', icon: FaBasketball, active: false },
    { label: 'Profile', href: profileHref, icon: FaUser, active: pathname.startsWith('/social/profile/') },
  ];

  return (
    <nav className="rcl-member-social-nav" aria-label="RCL Network mobile navigation">
      <div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              className={`${item.active ? 'active' : ''} ${item.create ? 'create' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
