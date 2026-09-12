'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { LeagueRequest } from '@/types/database';

const requestCategories = ['TRADE_REQUEST', 'DNP_INQUIRY', 'SCHEDULE_CONFLICT', 'INJURY_STATUS', 'LEAVE', 'EQUIPMENT', 'REGISTRATION', 'PAYMENT', 'TEAM_CONCERN', 'CONDUCT_CONCERN', 'GENERAL'];

export default function LeagueRequestsPage() {
  const { profile, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [requests, setRequests] = useState<LeagueRequest[]>([]);
  const [form, setForm] = useState({ category: 'GENERAL', subject: '', description: '' });
  const [message, setMessage] = useState('');

  async function load() {
    if (!supabase || !profile) return;
    const { data, error } = await supabase.from('league_requests').select('*').eq('requester_id', profile.id).order('created_at', { ascending: false });
    if (error) setMessage('Unable to load requests.');
    else setRequests((data ?? []) as LeagueRequest[]);
  }

  useEffect(() => { void load(); }, [supabase, profile?.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !profile || !form.subject.trim() || !form.description.trim()) return;
    const { error } = await supabase.from('league_requests').insert({ ...form, requester_id: profile.id } as never);
    setMessage(error ? error.message : 'Request submitted to league staff.');
    if (!error) {
      setForm({ category: 'GENERAL', subject: '', description: '' });
      void load();
    }
  }

  if (loading) return <main><Container maxWidth="lg" className="py-16"><div className="h-8 w-52 animate-pulse rounded bg-white/10" /></Container></main>;
  if (!profile) return <main><Container maxWidth="lg" className="py-16"><h1 className="font-display text-3xl font-bold">Sign in to access requests</h1></Container></main>;

  return <main><Container maxWidth="lg" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">My league</p><h1 className="mt-2 font-display text-4xl font-bold">Request center</h1><p className="mt-3 text-gray-400">Send private operational questions to authorized league staff. Official records can only be changed by the league.</p>{message && <p className="mt-5 rounded-lg bg-rcl-gold/10 p-3 text-sm text-rcl-gold">{message}</p>}
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]"><form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">New request</h2><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-5 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white">{requestCategories.map((category) => <option key={category}>{category}</option>)}</select><input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" /><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe what you need help with" rows={6} className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-white" /><button className="mt-4 w-full rounded-lg bg-rcl-gold px-4 py-3 font-bold text-black">Submit request</button></form>
      <section><h2 className="font-display text-2xl font-bold">Request history</h2><div className="mt-5 space-y-3">{requests.map((request) => <article key={request.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{request.subject}</p><p className="mt-1 text-xs uppercase tracking-wider text-gray-500">{request.category}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{request.status}</span></div><p className="mt-3 text-sm text-gray-400">{request.description}</p></article>)}{requests.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-gray-500">Your submitted requests will appear here.</p>}</div></section></div>
  </Container></main>;
}
