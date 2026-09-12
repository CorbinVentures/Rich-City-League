'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiEdit3, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { Container } from '@/components/Container';
import { ConversationList, ConversationListItem } from '@/components/messaging/ConversationList';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Category = 'ALL' | 'TEAM' | 'COACHES' | 'PLAYERS' | 'COMMUNITY' | 'GROUPS';
type Filter = 'ALL' | 'UNREAD' | 'READ' | 'GROUPS';
type ProfileResult = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; role: string };

const categories: Category[] = ['ALL', 'TEAM', 'COACHES', 'PLAYERS', 'COMMUNITY', 'GROUPS'];
const filters: Filter[] = ['ALL', 'UNREAD', 'READ', 'GROUPS'];

function labelType(type: string) {
  return type === 'direct' ? 'DIRECT' : type.toUpperCase();
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [category, setCategory] = useState<Category>('ALL');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [people, setPeople] = useState<ProfileResult[]>([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    setError(false);
    const membership = await supabase.from('conversation_members').select('conversation_id,last_read_at').eq('profile_id', user.id);
    if (membership.error) { setError(true); setLoading(false); return; }
    const memberships = (membership.data ?? []) as { conversation_id: string; last_read_at: string | null }[];
    const ids = memberships.map((row) => row.conversation_id);
    if (!ids.length) { setItems([]); setLoading(false); return; }
    const conversations = await supabase.from('conversations').select('id,title,conversation_type,updated_at').in('id', ids).order('updated_at', { ascending: false }).limit(50);
    if (conversations.error) { setError(true); setLoading(false); return; }
    const rows = (conversations.data ?? []) as { id: string; title: string | null; conversation_type: string; updated_at: string }[];
    const next = await Promise.all(rows.map(async (conversation) => {
      const membershipRow = memberships.find((row) => row.conversation_id === conversation.id);
      const latest = await supabase.from('messages').select('body,created_at,sender_id').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const unread = membershipRow?.last_read_at
        ? await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation.id).gt('created_at', membershipRow.last_read_at).neq('sender_id', user.id)
        : await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversation.id).neq('sender_id', user.id);
      return {
        id: conversation.id,
        title: conversation.title ?? 'RCL conversation',
        type: labelType(conversation.conversation_type),
        preview: latest.data?.body ?? '',
        updatedAt: latest.data?.created_at ?? conversation.updated_at,
        unread: unread.count ?? 0,
        avatarUrl: null,
      };
    }));
    setItems(next.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)));
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    void loadConversations();
    if (!supabase || !user) return;
    const channel = supabase.channel('rcl-direct-inbox').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void loadConversations()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, supabase, user]);

  useEffect(() => {
    if (!composeOpen || !supabase || !user) return;
    const timer = window.setTimeout(async () => {
      setPeopleLoading(true);
      const query = peopleSearch.trim();
      let request = supabase.from('profiles').select('id,display_name,username,avatar_url,role').eq('is_active', true).neq('id', user.id).limit(12);
      if (query) request = request.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`);
      const result = await request;
      setPeople((result.data ?? []) as ProfileResult[]);
      setPeopleLoading(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [composeOpen, peopleSearch, supabase, user]);

  const visible = items.filter((item) => {
    const matchesSearch = !search.trim() || `${item.title} ${item.preview} ${item.type}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = category === 'ALL' || item.type === category || (category === 'PLAYERS' && item.type === 'DIRECT');
    const matchesFilter = filter === 'ALL' || (filter === 'UNREAD' && item.unread > 0) || (filter === 'READ' && item.unread === 0) || (filter === 'GROUPS' && ['GROUP', 'TEAM', 'COMMUNITY'].includes(item.type));
    return matchesSearch && matchesCategory && matchesFilter;
  });

  const startConversation = async (person: ProfileResult) => {
    if (!supabase || !user) return;
    setStarting(person.id);
    const conversation = await supabase.from('conversations').insert({ created_by: user.id, title: person.display_name ?? person.username ?? 'RCL member', conversation_type: 'direct' }).select('id').single();
    if (!conversation.error && conversation.data) {
      await supabase.from('conversation_members').insert([{ conversation_id: conversation.data.id, profile_id: user.id }, { conversation_id: conversation.data.id, profile_id: person.id }]);
      window.location.href = `/messages/${conversation.data.id}`;
    }
    setStarting(null);
  };

  return (
    <main className="min-h-screen bg-rcl-black pb-24 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_80%_0%,rgba(255,107,26,.18),transparent_40%),linear-gradient(115deg,#07090d,#101c2d)]">
        <Container maxWidth="xl" className="relative py-14 sm:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-rcl-gold">RCL DIRECT</p>
            <h1 className="mt-4 font-display text-4xl font-black uppercase leading-[.95] tracking-tight sm:text-6xl">Real conversations.<br /><span className="text-gray-400">A stronger community.</span></h1>
            <p className="mt-6 max-w-xl text-sm leading-6 text-gray-300 sm:text-base">Players. Coaches. Teams. Fans.<br />Richmond basketball, connected.</p>
          </div>
          <div className="pointer-events-none absolute -bottom-20 right-4 hidden text-[11rem] font-black italic leading-none text-white/[.03] sm:block">RCL</div>
        </Container>
      </section>
      <Container maxWidth="xl" className="py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.3em] text-rcl-gold">Your people. Your team. Your city.</p><h2 className="mt-2 font-display text-3xl font-black uppercase">Messages</h2></div>
          <button type="button" onClick={() => setComposeOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rcl-gold px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><FiEdit3 aria-hidden="true" /> Compose</button>
        </div>
        <div className="mt-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-px" role="tablist" aria-label="Conversation categories">
          {categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-[10px] font-black tracking-widest transition ${category === item ? 'border-rcl-gold text-rcl-gold' : 'border-transparent text-gray-500 hover:text-white'}`}>{item}</button>)}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Search messages</span><FiSearch className="absolute left-4 top-3.5 text-gray-500" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages..." className="w-full rounded-lg border border-white/10 bg-white/[.04] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-600 focus:border-rcl-gold" /></label>
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/[.03] p-1">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-md px-3 py-2 text-[10px] font-black tracking-wider ${filter === item ? 'bg-rcl-gold text-black' : 'text-gray-500 hover:text-white'}`}>{item}</button>)}</div>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-white/[.025]">
          {authLoading || loading ? <div className="space-y-px">{[1, 2, 3, 4].map((row) => <div key={row} className="flex animate-pulse items-center gap-3 border-b border-white/[.07] p-4"><div className="h-12 w-12 rounded-full bg-white/10" /><div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-white/10" /><div className="h-2 w-2/3 rounded bg-white/10" /></div></div>)}</div> : error ? <div className="p-12 text-center"><p className="font-display text-xl font-bold uppercase">Messages are having a moment.</p><p className="mt-2 text-sm text-gray-500">We couldn't load your conversations.</p><button type="button" onClick={() => void loadConversations()} className="mt-5 rounded-lg border border-rcl-gold px-4 py-2 text-xs font-black uppercase tracking-widest text-rcl-gold">Try again</button></div> : <ConversationList items={visible} emptyMessage={items.length ? 'No conversations match these filters.' : 'Your inbox is ready for your first conversation.'} />}
        </div>
        {!loading && !items.length && <div className="mt-8 grid gap-5 rounded-xl border border-rcl-gold/20 bg-rcl-gold/[.05] p-6 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-black uppercase tracking-[.25em] text-rcl-gold">Build your RCL network</p><h3 className="mt-2 font-display text-2xl font-black uppercase">Your court. Your community.</h3><p className="mt-2 max-w-lg text-sm text-gray-400">Start a conversation with teammates, players, coaches, or members of the RCL community.</p></div><Link href="/players" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white hover:text-rcl-gold">Find people <FiArrowRight aria-hidden="true" /></Link></div>}
      </Container>
      {composeOpen && <div className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="compose-title"><div className="w-full rounded-t-2xl border border-white/10 bg-[#10131b] p-5 sm:mx-auto sm:max-w-lg sm:rounded-2xl"><div className="flex items-center justify-between"><h2 id="compose-title" className="font-display text-2xl font-black uppercase">New message</h2><button type="button" onClick={() => setComposeOpen(false)} aria-label="Close compose dialog" className="rounded p-2 text-gray-400 hover:text-white"><FiX /></button></div><label className="relative mt-5 block"><span className="sr-only">Search people</span><FiSearch className="absolute left-3 top-3 text-gray-500" /><input autoFocus value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} placeholder="Search people by name or username..." className="w-full rounded-lg border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-sm outline-none focus:border-rcl-gold" /></label><div className="mt-4 max-h-72 overflow-y-auto">{peopleLoading ? <p className="p-6 text-center text-sm text-gray-500">Finding your RCL network...</p> : people.map((person) => <button key={person.id} type="button" disabled={starting === person.id} onClick={() => void startConversation(person)} className="flex w-full items-center gap-3 border-b border-white/10 p-3 text-left hover:bg-white/5 disabled:opacity-50"><div className="grid h-10 w-10 place-items-center rounded-full bg-rcl-navy text-xs font-black text-rcl-gold">{(person.display_name ?? person.username ?? 'RCL').slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-bold">{person.display_name ?? person.username ?? 'RCL member'}</p><p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{person.role}</p></div></button>)}</div></div></div>}
    </main>
  );
}
