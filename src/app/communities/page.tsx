'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Community = { id: string; name: string; slug: string; description: string | null; community_type: string; privacy: string };
export default function CommunitiesPage() {
  const { user } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState<Community[]>([]); const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const load = async () => { if (!supabase) return; const { data } = await supabase.from('communities').select('*').order('created_at', { ascending: false }); setItems(data ?? []); };
  useEffect(() => { void load(); }, [supabase]);
  const create = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase || !user || !name.trim()) return; const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`; const { data } = await supabase.from('communities').insert({ name: name.trim(), slug, description: description.trim() || null, created_by: user.id, privacy: 'public', community_type: 'general' } as never).select().single(); if (data) { await supabase.from('community_members').insert({ community_id: (data as Community).id, profile_id: user.id, role: 'admin' } as never); setName(''); setDescription(''); await load(); } };
  const join = async (id: string) => { if (!supabase || !user) return; await supabase.from('community_members').insert({ community_id: id, profile_id: user.id } as never); };
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="lg" className="py-12"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL COMMUNITY</p><h1 className="mt-2 text-4xl font-black">Find your court</h1><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]"><form onSubmit={create} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-bold">Start a community</h2><input value={name} onChange={e => setName(e.target.value)} placeholder="Community name" className="mt-4 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none" /><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What brings people together?" className="mt-3 h-28 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none" /><button className="mt-3 w-full rounded-xl bg-rcl-gold py-3 text-sm font-black text-black">CREATE COMMUNITY</button></form><section className="grid gap-4 sm:grid-cols-2">{items.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><span className="text-xs font-bold uppercase tracking-widest text-rcl-gold">{item.community_type}</span><h2 className="mt-2 text-xl font-bold">{item.name}</h2><p className="mt-2 min-h-12 text-sm text-gray-400">{item.description ?? 'A new RCL basketball community.'}</p><button onClick={() => void join(item.id)} className="mt-4 rounded-lg border border-rcl-gold/50 px-3 py-2 text-xs font-bold text-rcl-gold">JOIN COMMUNITY</button></article>)}</section></div></Container></main>;
}
