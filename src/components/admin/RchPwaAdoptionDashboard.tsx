'use client';

import { useMemo, useState } from 'react';
import type { PwaAdoptionMember } from '@/lib/pwa-adoption';

type Filter = 'all' | 'ios' | 'android' | 'both';
const fmt = new Intl.NumberFormat('en-US');

function dateLabel(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }) + ' ET';
}

export function RchPwaAdoptionDashboard({ members, generatedAt }: {
  members: PwaAdoptionMember[];
  generatedAt: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [recentOnly, setRecentOnly] = useState(false);
  const cutoff = new Date(generatedAt).getTime() - 7 * 86400000;

  const counts = useMemo(() => ({
    members: members.length,
    ios: members.filter(m => m.platforms.includes('ios')).length,
    android: members.filter(m => m.platforms.includes('android')).length,
    both: members.filter(m => m.platforms.length === 2).length,
    recent: members.filter(m => new Date(m.lastSeen).getTime() >= cutoff).length,
    devices: members.reduce((sum, m) => sum + m.deviceCount, 0),
  }), [members, cutoff]);

  const visible = useMemo(() => members.filter(m => {
    if (filter === 'both' && m.platforms.length !== 2) return false;
    if (filter === 'ios' && !m.platforms.includes('ios')) return false;
    if (filter === 'android' && !m.platforms.includes('android')) return false;
    if (recentOnly && new Date(m.lastSeen).getTime() < cutoff) return false;
    const needle = search.trim().toLowerCase();
    return !needle || m.name.toLowerCase().includes(needle) ||
      (m.username || '').toLowerCase().includes(needle);
  }), [members, filter, search, recentOnly, cutoff]);

  const stats = [
    { label: 'Observed members', value: counts.members, detail: 'Distinct signed-in accounts' },
    { label: 'iPhone / iPad', value: counts.ios, detail: 'Members observed on iOS' },
    { label: 'Android', value: counts.android, detail: 'Members observed on Android' },
    { label: 'Both platforms', value: counts.both, detail: 'Members using iOS and Android' },
    { label: 'Seen in 7 days', value: counts.recent, detail: 'Recent standalone launches' },
    { label: 'PWA instances', value: counts.devices, detail: 'Distinct stored instance IDs' },
  ];

  return <div className="space-y-7">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {stats.map(s => <article key={s.label} className="rounded-2xl border border-white/15 bg-white/[.045] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-white/65">{s.label}</p>
        <p className="mt-2 text-3xl font-black tabular-nums text-white">{fmt.format(s.value)}</p>
        <p className="mt-1 text-xs text-white/55">{s.detail}</p>
      </article>)}
    </div>

    <section className="rounded-2xl border border-white/15 bg-white/[.035] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Member device roster</h2>
          <p className="mt-1 text-sm text-white/60">Most recently observed first · as of {dateLabel(generatedAt)}</p>
        </div>
        <span className="text-sm font-semibold text-white/70">{visible.length} matching members</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="min-w-48 flex-1">
          <span className="sr-only">Search member name or username</span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search member or username"
            className="min-h-11 w-full rounded-lg border border-white/20 bg-[#0e1726] px-3 text-white placeholder:text-white/50" />
        </label>
        <label className="flex items-center gap-2 text-sm text-white/75">
          <span>Platform</span>
          <select value={filter} onChange={e => setFilter(e.target.value as Filter)}
            className="min-h-11 rounded-lg border border-white/20 bg-[#0e1726] px-3 text-white">
            <option value="all">All</option>
            <option value="ios">iPhone / iPad</option>
            <option value="android">Android</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-white/75">
          <input type="checkbox" checked={recentOnly} onChange={e => setRecentOnly(e.target.checked)} />
          Seen in past 7 days
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wider text-white/60">
            <tr><th scope="col" className="py-3 pr-3">Member</th><th scope="col" className="py-3 pr-3">Observed on</th><th scope="col" className="py-3 pr-3">First seen</th><th scope="col" className="py-3 pr-3">Last seen</th><th scope="col" className="py-3 text-right">Launch windows*</th></tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {visible.map(m => <tr key={m.profileId}>
              <td className="py-4 pr-3"><span className="block font-bold text-white">{m.name}</span>
                {m.username && <span className="text-xs text-white/55">@{m.username}</span>}</td>
              <td className="py-4 pr-3 font-semibold">{m.platforms.map(p => p === 'ios' ? 'iPhone / iPad' : 'Android').join(' + ')}</td>
              <td className="py-4 pr-3 text-white/75">{dateLabel(m.firstSeen)}</td>
              <td className="py-4 pr-3 text-white/75">{dateLabel(m.lastSeen)}</td>
              <td className="py-4 text-right tabular-nums">{fmt.format(m.launches)}</td>
            </tr>)}
            {!visible.length && <tr><td colSpan={5} className="py-10 text-center text-white/65">No matching PWA launches have been observed.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-5 text-white/55">*Returns count distinct reporting windows per stored instance, not total app opens. Only a member launching the standalone app while signed in can appear. No uninstall signal is available; inactive entries might represent deleted apps or members who have not reopened them. Privacy opt-outs and offline launches are not collected.</p>
    </section>
  </div>;
}