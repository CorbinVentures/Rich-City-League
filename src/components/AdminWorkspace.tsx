'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaGauge,
  FaLayerGroup,
  FaScrewdriverWrench,
  FaPlug,
  FaShirt,
  FaShieldHalved,
  FaTrophy,
} from 'react-icons/fa6';

const items = [
  { label: 'Admin Home', href: '/admin', icon: FaGauge, description: 'Dashboard, users, rosters, games, social and CMS' },
  { label: 'League Setup', href: '/admin/league-setup', icon: FaLayerGroup, description: 'Seasons, teams, scheduling and scorebook setup' },
  { label: 'Operations', href: '/admin/operations', icon: FaScrewdriverWrench, description: 'Tryouts, drafts, requests, cases and league operations' },
  { label: 'LeagueApps', href: '/admin/leagueapps', icon: FaPlug, description: 'LeagueApps connection, status and data sync' },
  { label: 'Shop', href: '/admin/shop', icon: FaShirt, description: 'Products, orders and storefront administration' },
  { label: 'Site Control', href: '/admin/control-center', icon: FaShieldHalved, description: 'Site content, platform controls and administrative tools' },
  { label: 'Recognition', href: '/admin/recognition', icon: FaTrophy, description: 'Awards, badges and recognition programs' },
];

export function AdminWorkspace() {
  const pathname = usePathname();

  return (
    <section className="rcl-admin-workspace w-full" aria-label="RCL administration">
      <div className="rcl-admin-workspace-head flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span>RCL ADMIN</span>
          <b>COMMAND DECK</b>
        </div>
        <small>RESTRICTED · 804</small>
      </div>

      <nav
        className="rcl-admin-workspace-nav flex w-full items-stretch gap-1 overflow-x-auto"
        aria-label="Admin sections"
      >
        {items.map(({ label, href, icon: Icon, description }) => {
          const active = href === '/admin'
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={`${label}: ${description}`}
              title={description}
              className={`rcl-admin-workspace-link ${active ? 'active' : ''}`}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
