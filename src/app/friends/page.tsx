'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type FriendRow = { id: string; requester_id: string; addressee_id: string; status: string; requester?: { display_name: string | null; username: string | null }; addressee?: { display_name: string | null; username: string | null } };

export default function FriendsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<Array<{ id: string; display_name: string | null; username: string | null }>>([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('friendships').select('*, requester:profiles!requester_id(display_name,username), addressee:profiles!addressee_id(display_name,username)').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).order('created_at', { ascending: false });
    setFriends((data ?? []) as FriendRow[]);
  };
  useEffect(() => { void load(); }, [supabase, user]);

  const findPeople = async () => {
    if (!supabase || !search.trim()) return;
    const { data } = await supabase.from('profiles').select('id,display_name,username').or(`display_name.ilike.%${search.trim()}%,username.ilike.%${search.trim()}%`).neq('id', user?.id ?? '').limit(12);
    setPeople(data ?? []);
  };
  const request = async (id: string) => {
    if (!supabase || !user) return;
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: id, status: 'pending' });
    setMessage(error ? error.message : 'Friend request sent.');
    if (!error) await load();
  };
  const update = async (id: string, status: 'accepted' | 'declined' | 'cancelled') => {
    if (!supabase || !user) return;
    await supabase.from('friendships').update({ status }).eq('id', id);
    await load();
  };
  const label = (row: FriendRow) => row.requester_id === user?.id ? row.addressee?.display_name ?? row.addressee?.username : row.requester?.display_name ?? row.requester?.username;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="lg" className="py-12">
    <p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL CONNECTIONS</p><h1 className="mt-2 text-4xl font-black">Friends &amp; Teammates</h1>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-bold">Find your people</h2><div className="mt-4 flex gap-2"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players and coaches" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-rcl-gold" /><button onClick={() => void findPeople()} className="rounded-xl bg-rcl-gold px-4 font-bold text-black">SEARCH</button></div>{message && <p className="mt-3 text-sm text-rcl-gold">{message}</p>}<div className="mt-5 space-y-3">{people.map(person => <div key={person.id} className="flex items-center justify-between rounded-xl bg-black/50 p-3"><span>{person.display_name ?? person.username ?? 'RCL player'}</span><button onClick={() => void request(person.id)} className="text-xs font-bold text-rcl-gold">ADD FRIEND</button></div>)}</div></section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-bold">Your connections</h2><div className="mt-5 space-y-3">{friends.length === 0 && <p className="text-sm text-gray-500">Search for a teammate to get connected.</p>}{friends.map(row => <div key={row.id} className="flex items-center justify-between rounded-xl bg-black/50 p-3"><div><p className="font-semibold">{label(row)}</p><p className="text-xs uppercase tracking-widest text-gray-500">{row.status}</p></div>{row.status === 'pending' && row.addressee_id === user?.id ? <div className="flex gap-2"><button onClick={() => void update(row.id, 'accepted')} className="text-xs font-bold text-rcl-gold">ACCEPT</button><button onClick={() => void update(row.id, 'declined')} className="text-xs text-gray-400">DECLINE</button></div> : row.status === 'pending' && <button onClick={() => void update(row.id, 'cancelled')} className="text-xs text-gray-400">CANCEL</button>}</div>)}</div></section>
    </div>
  </Container></main>;
}
