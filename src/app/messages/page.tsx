'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Conversation = { id: string; title: string | null; conversation_type: string; updated_at: string };
export default function MessagesPage() {
  const { user } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []); const [items, setItems] = useState<Conversation[]>([]);
  useEffect(() => { if (!supabase || !user) return; const load = async () => { const { data } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false }); setItems(data ?? []); }; void load(); }, [supabase, user]);
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="md" className="py-12"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL DIRECT</p><h1 className="mt-2 text-4xl font-black">Messages</h1><p className="mt-2 text-gray-400">Private conversations for teammates, coaches, and communities.</p><section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">{items.length === 0 ? <div className="p-8 text-center text-gray-500">No conversations yet. Add a friend to start connecting.</div> : items.map(item => <Link key={item.id} href={`/messages/${item.id}`} className="flex items-center justify-between border-b border-white/10 p-5 transition hover:bg-white/5"><div><h2 className="font-bold">{item.title ?? 'RCL conversation'}</h2><p className="mt-1 text-xs uppercase tracking-widest text-gray-500">{item.conversation_type}</p></div><span className="text-xs text-gray-500">{new Date(item.updated_at).toLocaleDateString()}</span></Link>)}</section></Container></main>;
}
