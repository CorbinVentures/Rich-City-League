'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isMemberNavigationActive, RCL_MEMBER_PRIMARY_NAV } from '@/lib/member-navigation';

export function MemberSocialNavigation() {
  const pathname = usePathname();

  if (pathname !== '/social' && !pathname.startsWith('/social/')) return null;

  return (
    <nav className="rcl-member-social-nav" aria-label="RCL mobile navigation">
      <div>
        {RCL_MEMBER_PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const active = isMemberNavigationActive(pathname, item.href);
          const create = item.action === 'create';
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`${active ? 'active' : ''} ${create ? 'create' : ''}`}
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
