'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Notification = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
export default function NotificationsPage() {
  const { user } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []); const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { if (!supabase || !user) return; const load = async () => { const { data } = await supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(50); setItems(data ?? []); }; void load(); }, [supabase, user]);
  const read = async (id: string) => { if (!supabase || !user) return; await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('recipient_id', user.id); setItems(current => current.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)); };
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="md" className="py-12"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL ALERTS</p><h1 className="mt-2 text-4xl font-black">Notifications</h1><section className="mt-8 space-y-2">{items.length === 0 && <div className="rounded-2xl border border-white/10 p-8 text-center text-gray-500">You are all caught up.</div>}{items.map(item => <button key={item.id} onClick={() => void read(item.id)} className={`w-full rounded-2xl border p-5 text-left transition hover:bg-white/5 ${item.read_at ? 'border-white/10 bg-white/[0.02]' : 'border-rcl-gold/40 bg-rcl-gold/5'}`}><div className="flex items-start justify-between gap-3"><h2 className="font-bold">{item.title}</h2><time className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</time></div><p className="mt-2 text-sm text-gray-400">{item.body ?? 'New Rich City League activity.'}</p></button>)}</section></Container></main>;
}
