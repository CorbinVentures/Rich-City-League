'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { ContentAssetBackground } from '@/components/ContentAssetBackground';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Community = { id: string; name: string; slug: string; description: string | null; community_type: string; privacy: string };
export default function CommunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState<Community[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const userId = user?.id;
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Communities are temporarily unavailable. Please try again later.'); return; }
    setLoading(true);
    try {
      const [communities, memberships] = await Promise.all([
        supabase.from('communities').select('*').order('created_at', { ascending: false }),
        userId ? supabase.from('community_members').select('community_id').eq('profile_id', userId) : Promise.resolve({ data: [], error: null }),
      ]);
      if (communities.error || memberships.error) throw communities.error || memberships.error;
      setItems(communities.data ?? []);
      setJoined((memberships.data ?? []).map(item=>item.community_id));
    } catch { setError('We could not load communities. Please try again.'); }
    finally { setLoading(false); }
  }, [supabase, userId]);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !userId || !name.trim() || busy) return;
    setBusy('create'); setError(''); setMessage('');
    try {
      const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      const result = await supabase.from('communities').insert({ name: name.trim(), slug, description: description.trim() || null, created_by: userId, privacy: 'public', community_type: 'general' }).select().single();
      if (result.error || !result.data) throw result.error;
      const membership = await supabase.from('community_members').insert({ community_id: result.data.id, profile_id: userId, role: 'admin' });
      setName(''); setDescription('');
      if (membership.error) setError('Your community was created, but membership could not be confirmed. Please use Join community below.');
      else setMessage('Your community is ready.');
      await load();
    } catch { setError('Your community was not created. Your draft is still here; please try again.'); }
    finally { setBusy(null); }
  }
  async function join(id: string) {
    if (!supabase || !userId || busy || joined.includes(id)) return;
    setBusy(id); setError(''); setMessage('');
    try {
      const result = await supabase.from('community_members').insert({ community_id: id, profile_id: userId });
      if (result.error && result.error.code !== '23505') throw result.error;
      setJoined(current=>current.includes(id) ? current : [...current, id]);
      setMessage('You joined the community.');
    } catch { setError('We could not join this community. Please try again.'); }
    finally { setBusy(null); }
  }
  return <main className="rcl-mock-page rcl-communities-page relative min-h-screen pb-24 text-white">
    <ContentAssetBackground assetKey="communities.cover" opacity={0.14} />
    <div className="relative z-10"><Container maxWidth="lg" className="py-12">
      <p className="text-sm font-bold uppercase tracking-widest text-rcl-orange">RCL Community</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">Find your court</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Connect with people who share your teams, interests, and love of the game.</p>
      {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"><p>{error}</p><button type="button" disabled={loading || Boolean(busy)} onClick={()=>{ setError(''); void load(); }} className="mt-2 min-h-11 font-bold underline disabled:opacity-50">Refresh communities</button></div>}
      {message && <p role="status" className="mt-6 text-sm text-emerald-300">{message}</p>}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {authLoading ? <p role="status" className="text-sm text-slate-300">Loading your account…</p> : user ? <form onSubmit={create} className="space-y-5 rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">Start a community</h2>
          <label className="block text-sm font-semibold">Community name<input required maxLength={100} value={name} onChange={event=>setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 p-3" /></label>
          <label className="block text-sm font-semibold">Description<textarea maxLength={2000} rows={4} value={description} onChange={event=>setDescription(event.target.value)} placeholder="What brings people together?" className="mt-2 w-full rounded-xl border border-white/15 p-3" /></label>
          <button type="submit" disabled={Boolean(busy) || !name.trim() || !supabase} aria-busy={busy==='create'} className="rcl-state-link rcl-state-primary w-full disabled:opacity-50">{busy==='create' ? 'Creating…' : 'Create community'}</button>
        </form> : <div className="rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-bold">Be part of the conversation</h2><p className="mt-3 text-sm leading-6 text-slate-300">Sign in to join a community or start your own.</p><Link href="/auth/sign-in?next=/communities" className="rcl-state-link rcl-state-primary mt-5">Sign in</Link></div>}
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Communities" aria-busy={loading}>
          {loading ? <p role="status" className="col-span-full p-6 text-sm text-slate-300">Loading communities…</p> : items.length ? items.map(item=><article key={item.id} className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <span className="text-xs font-bold uppercase tracking-widest text-rcl-orange">{item.community_type.replace(/_/g, ' ')}</span><h2 className="mt-2 break-words text-xl font-bold">{item.name}</h2><p className="mt-3 flex-1 break-words text-sm leading-6 text-slate-300">{item.description ?? 'A new RCL basketball community.'}</p>
            {user && <button type="button" onClick={()=>void join(item.id)} disabled={Boolean(busy) || joined.includes(item.id)} aria-busy={busy===item.id} className="rcl-state-link mt-5 disabled:opacity-60">{joined.includes(item.id) ? 'Joined' : busy===item.id ? 'Joining…' : 'Join community'}</button>}
          </article>) : <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-8"><h2 className="text-lg font-bold">Your community starts here</h2><p className="mt-2 text-sm leading-6 text-slate-300">No communities are available yet. Start one around your team or favorite part of the game.</p></div>}
        </section>
      </div>
    </Container></div>
  </main>;
}
