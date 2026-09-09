'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Game, Registration } from '@/types/database';

export default function OperationsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Registration['status']>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const client = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (authLoading || !client || (profile?.role !== 'staff' && profile?.role !== 'admin')) return;
    Promise.all([
      client.from('registrations').select('*').order('submitted_at', { ascending: false }),
      client.from('games').select('*').order('scheduled_at', { ascending: true }),
    ]).then(([registrationResult, gameResult]) => {
      if (registrationResult.error || gameResult.error) throw new Error((registrationResult.error ?? gameResult.error)?.message);
      setRegistrations(registrationResult.data ?? []);
      setGames(gameResult.data ?? []);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load league operations.')).finally(() => setBusy(false));
  }, [authLoading, client, profile?.role]);

  async function updateStatus(id: string, nextStatus: Registration['status']) {
    if (!client) return;
    const { error: updateError } = await client.from('registrations').update({ status: nextStatus, reviewed_at: new Date().toISOString() }).eq('id', id);
    if (updateError) setError(updateError.message);
    else setRegistrations((items) => items.map((item) => item.id === id ? { ...item, status: nextStatus } : item));
  }

  const filtered = registrations.filter((registration) => {
    const matchesStatus = status === 'all' || registration.status === status;
    const text = `${registration.first_name} ${registration.last_name} ${registration.email}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  });

  if (authLoading || busy) return <main><Container maxWidth="xl" className="py-16"><div className="h-8 w-64 animate-pulse rounded bg-white/10" /><div className="mt-8 h-64 animate-pulse rounded-2xl bg-white/5" /></Container></main>;
  if (profile?.role !== 'staff' && profile?.role !== 'admin') return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-bold">Operations access required</h1><p className="mt-3 text-gray-400">This workspace is limited to league staff and administrators.</p></Container></main>;
  if (error) return <main><Container maxWidth="xl" className="py-16"><p className="text-red-300">{error}</p></Container></main>;

  return <main><Container maxWidth="xl" className="py-12">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{profile.role} portal</p>
    <h1 className="mt-2 font-display text-4xl font-bold">League operations</h1>
    <p className="mt-3 text-gray-400">Review live registration and game records through the existing RCL authorization policies.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Registrations</p><p className="mt-2 text-3xl font-bold">{registrations.length}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Pending review</p><p className="mt-2 text-3xl font-bold">{registrations.filter((item) => item.status === 'pending').length}</p></div><div className="rounded-2xl border border-white/10 p-5"><p className="text-xs uppercase text-gray-500">Games</p><p className="mt-2 text-3xl font-bold">{games.length}</p></div></div>
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><div className="flex flex-wrap gap-3"><input aria-label="Search registrations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="min-w-64 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /><select aria-label="Filter registration status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"><option value="all">All statuses</option>{(['pending', 'approved', 'waitlisted', 'rejected', 'cancelled'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th className="pb-3">Applicant</th><th className="pb-3">Submitted</th><th className="pb-3">Status</th><th className="pb-3">Review</th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-gray-500">No registrations match this filter.</td></tr> : filtered.map((registration) => <tr key={registration.id} className="border-t border-white/10"><td className="py-4"><p className="font-semibold">{registration.first_name} {registration.last_name}</p><p className="text-gray-500">{registration.email}</p></td><td className="py-4 text-gray-400">{new Date(registration.submitted_at).toLocaleDateString()}</td><td className="py-4 capitalize">{registration.status}</td><td className="py-4"><select aria-label={`Update ${registration.first_name} ${registration.last_name}`} value={registration.status} onChange={(event) => void updateStatus(registration.id, event.target.value as Registration['status'])} className="rounded border border-white/10 bg-black/20 px-2 py-1 text-white">{(['pending', 'approved', 'waitlisted', 'rejected', 'cancelled'] as const).map((value) => <option key={value} value={value}>{value}</option>)}</select></td></tr>)}</tbody></table></div></section>
  </Container></main>;
}
