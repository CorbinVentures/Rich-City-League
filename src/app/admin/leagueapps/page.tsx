'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  FaArrowRight, FaBasketball, FaCalendarDays, FaChartLine, FaComments,
  FaCreditCard, FaFileLines, FaGear, FaPeopleGroup, FaBuilding,
  FaUserShield, FaNewspaper, FaDatabase, FaRotate
} from 'react-icons/fa6';

type Area = {
  title: string;
  eyebrow: string;
  description: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  state: 'rcl' | 'leagueapps' | 'bridge';
};

const areas: Area[] = [
  { title: 'Registrations', eyebrow: 'MEMBERS', description: 'Open programs, registration status, waitlists, waivers, participant records and registration workflows.', icon: FaFileLines, state: 'leagueapps' },
  { title: 'Members & Families', eyebrow: 'PEOPLE', description: 'Search participants, profiles, guardians, contact information, eligibility and account status.', icon: FaPeopleGroup, state: 'bridge' },
  { title: 'Teams & Rosters', eyebrow: 'ROSTER', description: 'Build teams, assign players and coaches, manage roster movement and season assignments.', icon: FaBasketball, href: '/admin/operations', state: 'bridge' },
  { title: 'Scheduling', eyebrow: 'GAME CENTER', description: 'Create, edit and publish games, practices, events, venues and schedule changes.', icon: FaCalendarDays, href: '/admin/operations', state: 'leagueapps' },
  { title: 'Scores & Standings', eyebrow: 'COMPETITION', description: 'Enter official scores, box scores, player stats and standings from one RCL control surface.', icon: FaChartLine, href: '/admin', state: 'rcl' },
  { title: 'Payments & Invoices', eyebrow: 'FINANCE', description: 'Registration payments, invoices, balances, refunds, payment plans and financial reporting.', icon: FaCreditCard, state: 'leagueapps' },
  { title: 'Communications', eyebrow: 'ENGAGEMENT', description: 'Send targeted or organization-wide email, text, alerts and league announcements.', icon: FaComments, state: 'leagueapps' },
  { title: 'Reports & Analytics', eyebrow: 'INTELLIGENCE', description: 'Registration, transactions, attendance, program performance and organization KPIs.', icon: FaChartLine, state: 'leagueapps' },
  { title: 'Facilities', eyebrow: 'VENUES', description: 'Courts, bookings, conflicts, facility invoices and venue availability.', icon: FaBuilding, state: 'leagueapps' },
  { title: 'Content & Marketing', eyebrow: 'RCL MEDIA', description: 'News, pages, media, homepage content, campaigns and public-facing league information.', icon: FaNewspaper, href: '/admin/control-center', state: 'rcl' },
  { title: 'Staff & Permissions', eyebrow: 'SECURITY', description: 'Admin roles, staff access, program assignments and permission boundaries.', icon: FaUserShield, href: '/admin/control-center', state: 'rcl' },
  { title: 'Data Sync', eyebrow: 'INTEGRATION', description: 'Monitor LeagueApps imports, RCL IDs, last sync, failures and reconciliation.', icon: FaDatabase, state: 'bridge' },
];

const statusLabel = {
  rcl: 'RCL CONTROL',
  leagueapps: 'LEAGUEAPPS',
  bridge: 'RCL + LEAGUEAPPS',
};

export default function LeagueAppsAdminHub() {
  const { profile, loading } = useAuth();
  const [filter, setFilter] = useState<'all' | Area['state']>('all');
  const isAdmin = profile?.role === 'admin';
  const visible = useMemo(() => filter === 'all' ? areas : areas.filter(area => area.state === filter), [filter]);

  if (loading) return <main className="min-h-screen bg-rcl-black p-10 text-white/50">Loading command center…</main>;
  if (!isAdmin) return <main className="min-h-screen bg-rcl-black p-10 text-white"><h1 className="rcl-display text-4xl uppercase">Admin access required.</h1><Link href="/dashboard" className="rcl-link mt-5">Return to dashboard <FaArrowRight /></Link></main>;

  return <main className="rcl-admin-hub min-h-screen bg-rcl-black pb-24 text-white">
    <section className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_0%,rgba(255,107,26,.16),transparent_32rem),linear-gradient(145deg,#09111d,#05070b)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <Link href="/admin" className="text-[10px] font-black uppercase tracking-[.2em] text-white/35 hover:text-rcl-orange">← Command Center</Link>
        <div className="mt-8 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="rcl-kicker">RCL OPERATIONS · LEAGUEAPPS BRIDGE</p>
            <h1 className="rcl-display mt-3 max-w-4xl text-5xl uppercase leading-[.86] sm:text-7xl">One command<br/><span className="text-rcl-orange">center.</span></h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-white/50">LeagueApps remains the operational source of truth for registration, scheduling, payments and league-management workflows. RCL becomes the branded command layer for everything your staff needs to run the league and everything your community sees.</p>
          </div>
          <div className="rcl-admin-source-card">
            <span className="rcl-live">SYSTEM ARCHITECTURE</span>
            <strong>LEAGUEAPPS → RCL → COMMUNITY</strong>
            <small>Sync once. Avoid duplicate entry.</small>
          </div>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
        {([['all','All controls'],['leagueapps','LeagueApps'],['bridge','Connected'],['rcl','RCL native']] as const).map(([value,label]) =>
          <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest ${filter === value ? 'bg-rcl-orange text-black' : 'border border-white/10 text-white/45 hover:text-white'}`}>{label}</button>
        )}
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ title, eyebrow, description, href, icon: Icon, state }) => {
          const body = <><div className="flex items-start justify-between"><span className="rcl-admin-icon"><Icon /></span><span className={`rcl-admin-badge ${state}`}>{statusLabel[state]}</span></div><p className="mt-6 text-[9px] font-black tracking-[.2em] text-rcl-orange">{eyebrow}</p><h2 className="mt-2 font-display text-xl font-black uppercase">{title}</h2><p className="mt-2 min-h-12 text-xs leading-5 text-white/40">{description}</p><span className="mt-5 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-white/65">Open control <FaArrowRight /></span></>;
          return href ? <Link key={title} href={href} className="rcl-admin-module">{body}</Link> : <button key={title} type="button" className="rcl-admin-module text-left" onClick={() => window.alert(`${title} is connected through LeagueApps. Connect the LeagueApps API to enable this control inside RCL.`)}>{body}</button>;
        })}
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <div className="rcl-admin-panel">
          <p className="rcl-kicker">LEAGUEAPPS CONNECTION</p>
          <h2 className="rcl-display mt-2 text-3xl uppercase">Connect the source.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">LeagueApps supports private and public API keys for integrations. Once the RCL server is connected, the admin can surface synced members, programs, schedules and reporting without making staff maintain two systems.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rcl-admin-chip"><FaDatabase /> Site ID</span>
            <span className="rcl-admin-chip"><FaUserShield /> Private API key</span>
            <span className="rcl-admin-chip"><FaRotate /> Sync status</span>
          </div>
        </div>
        <div className="rcl-admin-panel">
          <p className="rcl-kicker">SOURCE OF TRUTH</p>
          <p className="mt-3 font-display text-2xl font-black uppercase">No double entry.</p>
          <p className="mt-2 text-xs leading-5 text-white/40">Registration + scheduling + payments stay in LeagueApps. RCL owns the community, presentation, social, stats and league experience.</p>
        </div>
      </section>
    </div>
  </main>;
}
