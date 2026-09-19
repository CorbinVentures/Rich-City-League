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
} from 'react-icons/fa6';

const items = [
  { label: 'Command Center', href: '/admin', icon: FaGauge },
  { label: 'League Setup', href: '/admin/league-setup', icon: FaLayerGroup },
  { label: 'Operations', href: '/admin/operations', icon: FaScrewdriverWrench },
  { label: 'LeagueApps', href: '/admin/leagueapps', icon: FaPlug },
  { label: 'Shop', href: '/admin/shop', icon: FaShirt },
  { label: 'Control Center', href: '/admin/control-center', icon: FaShieldHalved },
 { label: 'Governance', href: '/admin/governance', icon: FaShieldHalved },
 { label: 'Recognition', href: '/admin/recognition', icon: FaTrophy },
];

export function AdminWorkspace() {
  const pathname = usePathname();

  return (
    <section
      className="rcl-admin-workspace w-full"
      aria-label="RCL administration"
    >
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
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
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
