'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { IconType } from 'react-icons';
import {
  FaArrowUpRightFromSquare,
  FaBasketball,
  FaCalendarDays,
  FaChartLine,
  FaGauge,
  FaGear,
  FaLayerGroup,
  FaListOl,
  FaNetworkWired,
  FaPlug,
  FaShieldHalved,
  FaShirt,
  FaScrewdriverWrench,
  FaTrophy,
} from 'react-icons/fa6';

type AdminNavGroup = {
  label: string;
  items: Array<{ label: string; href: string; icon: IconType; description: string }>;
};

const groups: AdminNavGroup[] = [
  {
    label: 'COMMAND',
    items: [
      { label: 'Overview', href: '/admin', icon: FaGauge, description: 'Dashboard, users, rosters, game stats and moderation' },
      { label: 'Site Control', href: '/admin/control-center', icon: FaGear, description: 'Platform controls, publishing and notifications' },
      { label: 'Governance', href: '/admin/governance', icon: FaShieldHalved, description: 'Staff permissions and governance' },
    ],
  },
  {
    label: 'BASKETBALL',
    items: [
      { label: 'League Setup', href: '/admin/league-setup', icon: FaLayerGroup, description: 'Seasons, teams, scheduling and scorebook setup' },
      { label: 'Draft Night', href: '/admin/draft', icon: FaListOl, description: 'Draft rules, pick clock and live room' },
      { label: 'Operations', href: '/admin/operations', icon: FaScrewdriverWrench, description: 'Tryouts, eligibility, requests and disputes' },
      { label: 'Recognition', href: '/admin/recognition', icon: FaTrophy, description: 'Awards, badges and recognition programs' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { label: 'Network', href: '/admin/network', icon: FaNetworkWired, description: 'Organizations, events and promotion approvals' },
      { label: 'LeagueApps', href: '/admin/leagueapps', icon: FaPlug, description: 'Integration status and data sync' },
      { label: 'Shop', href: '/admin/shop', icon: FaShirt, description: 'Products, inventory and orders' },
      { label: 'Seasonal Themes', href: '/admin/seasonal-themes', icon: FaCalendarDays, description: 'Holiday themes and visual effects' },
    ],
  },
];

export function AdminWorkspace() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const isAdmin = Boolean(user && profile?.role === 'admin');
  const isStaff = Boolean(user && profile?.role === 'staff');
  if (loading || (!isAdmin && !isStaff)) return null;

  const permittedGroups = isAdmin
    ? groups
    : groups.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.href === '/admin/operations'),
      })).filter((group) => group.items.length > 0);

  return (
    <aside className="rch-admin-rail" aria-label="Administration navigation">
      <Link href="/admin" className="rch-admin-rail-brand" aria-label="Rich City Hoops administration home">
        <span className="rch-admin-brand-mark" aria-hidden="true">R</span>
        <span>
          <strong>RICH CITY HOOPS</strong>
          <small>Administration</small>
        </span>
      </Link>

      <div className="rch-admin-rail-meta">
        <span className="rch-admin-live-dot" aria-hidden="true" />
        <span>{isAdmin ? 'Platform administrator' : 'League staff'}</span>
      </div>

      <nav className="rch-admin-nav" aria-label="Admin sections">
        {permittedGroups.map((group) => (
          <div key={group.label} className="rch-admin-nav-group">
            <div className="rch-admin-nav-heading">{group.label}</div>
            <div className="rch-admin-nav-links">
              {group.items.map(({ label, href, icon: Icon, description }) => {
                const active = href === '/admin'
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    title={description}
                    className={`rch-admin-nav-item ${active ? 'is-active' : ''}`}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Link className="rch-admin-exit" href="/social">
        <FaBasketball aria-hidden="true" />
        <span>Back to RCH</span>
        <FaArrowUpRightFromSquare aria-hidden="true" />
      </Link>
    </aside>
  );
}

export function AdminTopbar() {
  const pathname = usePathname();
  const section = groups.flatMap((group) => group.items).find((item) =>
    item.href === '/admin'
      ? pathname === '/admin'
      : pathname === item.href || pathname.startsWith(item.href + '/')
  );
  return (
    <div className="rch-admin-topbar">
      <div className="rch-admin-topbar-breadcrumb">
        <FaChartLine aria-hidden="true" />
        <span>RCH Admin</span>
        <span className="rch-admin-crumb-divider" aria-hidden="true">/</span>
        <strong>{section?.label || 'Administration'}</strong>
      </div>
      <div className="rch-admin-topbar-right">
        <span className="rch-admin-mode"><span className="rch-admin-live-dot" /> Staff workspace</span>
        <Link href="/social" className="rch-admin-view-site">View site <FaArrowUpRightFromSquare aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
