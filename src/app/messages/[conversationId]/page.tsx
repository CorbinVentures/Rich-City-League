'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Message = { id: string; sender_id: string; body: string; created_at: string; deleted_at: string | null };
export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>(); const { user } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []); const [messages, setMessages] = useState<Message[]>([]); const [body, setBody] = useState('');
  const load = async () => { if (!supabase) return; const { data } = await supabase.from('messages').select('*').eq('conversation_id', params.conversationId).order('created_at'); setMessages(data ?? []); };
  useEffect(() => { if (!supabase) return; void load(); const channel = supabase.channel(`conversation-${params.conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${params.conversationId}` }, payload => setMessages(current => [...current, payload.new as Message])).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [supabase, params.conversationId]);
  const send = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase || !user || !body.trim()) return; const { error } = await supabase.from('messages').insert({ conversation_id: params.conversationId, sender_id: user.id, body: body.trim() } as never); if (!error) setBody(''); };
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="md" className="flex min-h-[calc(100vh-8rem)] flex-col py-8"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">REAL-TIME CHAT</p><h1 className="mt-2 text-3xl font-black">Conversation</h1><div className="mt-6 flex-1 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">{messages.length === 0 && <p className="p-5 text-center text-gray-500">Start the conversation.</p>}{messages.map(message => <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === user?.id ? 'ml-auto bg-rcl-gold text-black' : 'bg-white/10'}`}><p>{message.deleted_at ? 'Message deleted' : message.body}</p><time className="mt-1 block text-[10px] opacity-60">{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>)}</div><form onSubmit={send} className="mt-4 flex gap-2"><input value={body} onChange={e => setBody(e.target.value)} maxLength={4000} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-rcl-gold" /><button className="rounded-xl bg-rcl-gold px-5 font-black text-black">SEND</button></form></Container></main>;
}
