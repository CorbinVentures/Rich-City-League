'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { FiArrowLeft, FiMoreHorizontal, FiSend } from 'react-icons/fi';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; deleted_at: string | null };
type Conversation = { id: string; title: string | null; conversation_type: string; updated_at: string };
const PAGE_SIZE = 30;

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(async () => {
    if (!supabase || !user) return;
    await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() } as never).eq('conversation_id', conversationId).eq('profile_id', user.id);
  }, [conversationId, supabase, user]);

  const load = useCallback(async (initial = true) => {
    if (!supabase || !user) return;
    if (initial) setLoading(true);
    setError(false);
    const [conversationResult, messageResult] = await Promise.all([
      supabase.from('conversations').select('id,title,conversation_type,updated_at').eq('id', conversationId).maybeSingle(),
      supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,deleted_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(PAGE_SIZE),
    ]);
    if (conversationResult.error || messageResult.error || !conversationResult.data) {
      setError(true);
    } else {
      setConversation(conversationResult.data as Conversation);
      const next = ((messageResult.data ?? []) as Message[]).reverse();
      setMessages(next);
      setHasOlder(next.length === PAGE_SIZE);
      await markRead();
      if (initial) window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 0);
    }
    if (initial) setLoading(false);
  }, [conversationId, markRead, supabase, user]);

  useEffect(() => {
    void load();
    if (!supabase || !user) return;
    const channel = supabase.channel(`conversation-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const next = payload.new as Message;
        setMessages((current) => current.some((message) => message.id === next.id) ? current : [...current, next]);
        void markRead();
        window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const next = payload.new as Message;
        setMessages((current) => current.map((message) => message.id === next.id ? next : message));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, load, markRead, supabase, user]);

  const loadOlder = async () => {
    if (!supabase || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    const oldest = messages[0].created_at;
    const result = await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,deleted_at').eq('conversation_id', conversationId).lt('created_at', oldest).order('created_at', { ascending: false }).limit(PAGE_SIZE);
    const older = ((result.data ?? []) as Message[]).reverse();
    setMessages((current) => [...older, ...current]);
    setHasOlder(older.length === PAGE_SIZE);
    setLoadingOlder(false);
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!supabase || !user || !trimmed || sending) return;
    setSending(true);
    const result = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed } as never).select('id,conversation_id,sender_id,body,created_at,deleted_at').single();
    if (result.error) setError(true);
    else {
      const sentMessage = result.data as unknown as Message;
      setMessages((current) => current.some((message) => message.id === sentMessage.id) ? current : [...current, sentMessage]);
      setBody('');
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    }
    setSending(false);
  };

  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <Container maxWidth="xl" className="py-5 sm:py-8">
        <Link href="/messages" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-rcl-gold"><FiArrowLeft /> Back to RCL Direct</Link>
        {loading ? <div className="mt-5 h-[70vh] animate-pulse rounded-2xl border border-white/10 bg-white/[.03]" /> : error && !conversation ? <div className="mt-8 rounded-2xl border border-white/10 p-12 text-center"><p className="font-display text-xl font-bold uppercase">Messages are having a moment.</p><p className="mt-2 text-sm text-gray-500">This conversation is unavailable or you don&apos;t have access.</p><Link href="/messages" className="mt-5 inline-block text-xs font-black uppercase tracking-widest text-rcl-gold">Return to inbox</Link></div> : conversation && <div className="mt-5 grid min-h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-white/10 bg-white/[.025] lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="flex min-h-[calc(100vh-12rem)] flex-col">
            <header className="flex items-center gap-3 border-b border-white/10 px-4 py-4 sm:px-6"><div className="grid h-11 w-11 place-items-center rounded-full bg-rcl-navy text-sm font-black text-rcl-gold">{(conversation.title ?? 'RCL').slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-display text-lg font-bold">{conversation.title ?? 'RCL conversation'}</p><p className="text-[10px] font-black uppercase tracking-widest text-rcl-gold">{conversation.conversation_type}</p></div><button type="button" aria-label="Conversation options" className="rounded p-2 text-gray-500 hover:text-white"><FiMoreHorizontal /></button></header>
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">{hasOlder && <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="mx-auto mb-5 block text-[10px] font-black uppercase tracking-widest text-rcl-gold disabled:opacity-50">{loadingOlder ? 'Loading...' : 'Load older messages'}</button>}{messages.length === 0 && <div className="grid h-full place-items-center text-center"><div><p className="font-display text-2xl font-black uppercase">Your court. Your community.</p><p className="mt-2 text-sm text-gray-500">Send the first message and start the conversation.</p></div></div>}{messages.map((message) => <div key={message.id} className={`mb-4 flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.sender_id === user?.id ? 'rounded-br-sm bg-rcl-gold text-black' : 'rounded-bl-sm bg-white/10 text-gray-100'}`}><p className={message.deleted_at ? 'italic opacity-50' : ''}>{message.deleted_at ? 'Message deleted' : message.body}</p><time className="mt-1 block text-[10px] opacity-60" dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{message.sender_id === user?.id ? ' · SENT' : ''}</time></div></div>)}<div ref={bottomRef} /></div>
            <form onSubmit={send} className="flex gap-2 border-t border-white/10 bg-black/20 p-3 sm:p-4"><label className="sr-only" htmlFor="message-body">Write a message</label><input id="message-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Write a message..." autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm outline-none placeholder:text-gray-600 focus:border-rcl-gold" /><button type="submit" disabled={sending || !body.trim()} aria-label="Send message" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rcl-gold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"><FiSend /></button></form>
          </section>
          <aside className="hidden border-l border-white/10 bg-black/10 p-6 lg:block"><p className="text-[10px] font-black uppercase tracking-[.25em] text-rcl-gold">RCL Direct</p><h2 className="mt-3 font-display text-2xl font-black uppercase">Stay connected.</h2><p className="mt-3 text-sm leading-6 text-gray-500">Keep the conversation moving with your RCL people.</p><Link href="/players" className="mt-8 inline-flex text-xs font-black uppercase tracking-widest text-white hover:text-rcl-gold">Find people <span className="ml-2">→</span></Link></aside>
        </div>}
      </Container>
    </main>
  );
}
