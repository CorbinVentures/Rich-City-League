'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaMagnifyingGlass, FaUserGroup } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';

type FriendProfile = SocialIdentityAuthor & { id: string };
type FriendRow = { id: string; requester_id: string; addressee_id: string; status: string; requester?: FriendProfile; addressee?: FriendProfile };

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<FriendProfile[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!supabase || !user) { setFriends([]); return; }
    setLoading(true);
    const { data } = await supabase.from('friendships').select('*, requester:profiles!requester_id(id,display_name,username,avatar_url,is_vip,vip_label), addressee:profiles!addressee_id(id,display_name,username,avatar_url,is_vip,vip_label)').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).order('created_at', { ascending: false });
    setFriends((data ?? []) as FriendRow[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [supabase, user]);

  const findPeople = async () => {
    if (!supabase) return;
    const term = search.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
    if (term.length < 2) { setPeople([]); setMessage(term ? 'Type at least 2 characters.' : ''); return; }
    setBusy('search'); setMessage('');
    const pattern = `%${term}%`;
    const { data, error } = await supabase.from('profiles').select('id,display_name,username,avatar_url,is_vip,vip_label').eq('is_active', true).eq('profile_visibility', 'public').or(`display_name.ilike.${pattern},username.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`).neq('id', user?.id ?? '').limit(20);
    setPeople(data ?? []);
    setMessage(error ? error.message : !data?.length ? 'No members found.' : '');
    setBusy(null);
  };

  const request = async (id: string) => {
    if (!supabase || !user || busy) return;
    setBusy(id);
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: id, status: 'pending' } as never);
    setMessage(error ? error.message : 'Friend request sent.');
    if (!error) { setPeople(current => current.filter(person => person.id !== id)); await load(); }
    setBusy(null);
  };

  const update = async (id: string, status: 'accepted' | 'declined' | 'cancelled') => {
    if (!supabase || !user || busy) return;
    setBusy(id);
    await supabase.from('friendships').update({ status } as never).eq('id', id);
    await load();
    setBusy(null);
  };

  const connectionProfile = (row: FriendRow) => row.requester_id === user?.id ? row.addressee : row.requester;
  const accepted = friends.filter(row => row.status === 'accepted');
  const inbound = friends.filter(row => row.status === 'pending' && row.addressee_id === user?.id);
  const outbound = friends.filter(row => row.status === 'pending' && row.requester_id === user?.id);

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero
      eyebrow="RCL Connections"
      title="Friends + Teammates"
      accent="Build your network"
      description="Connect with the players, coaches, teammates, and basketball people you know across Rich City League."
      assetKey="social.cover"
      meta={<div className="min-w-48 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Your network</p><p className="mt-1 font-display text-3xl font-black">{accepted.length}<span className="ml-2 text-xs text-white/35">connections</span></p><p className="mt-2 text-xs text-rcl-orange">{inbound.length} pending for you</p></div>}
    />

    <Container maxWidth="xl" className="py-8 sm:py-12">
      {!user && !authLoading ? <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-8 text-center"><FaUserGroup className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Sign in to build your network</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/40">Your connections, requests, and teammate network are tied to your RCL account.</p><Link href="/auth/sign-in?next=/friends" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link></div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Discover</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Find your people</h2><p className="mt-2 text-sm leading-6 text-white/40">Search active public RCL profiles by name or username.</p>
          <div className="mt-5 flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Search any RCL member</span><FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/25"/><input aria-label="Search any RCL member" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void findPeople(); }} placeholder="Name or username" className="h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/60" /></label><button onClick={() => void findPeople()} disabled={busy === 'search'} className="min-h-12 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">{busy === 'search' ? 'Searching…' : 'Search'}</button></div>
          {message && <p className="mt-3 rounded-xl border border-white/10 bg-white/[.025] px-3 py-2 text-sm text-white/50">{message}</p>}
          <div className="mt-5 space-y-2">{people.map(person => <div key={person.id} className="flex items-center justify-between gap-3 rounded-xl border border-rcl-blue/10 bg-black/25 p-3"><SocialIdentity author={person} /><button disabled={busy === person.id} onClick={() => void request(person.id)} className="shrink-0 rounded-lg border border-rcl-orange/25 px-3 py-2 text-xs font-black uppercase tracking-wider text-rcl-orange transition hover:bg-rcl-orange/10 disabled:opacity-50">{busy === person.id ? 'Sending…' : 'Add'}</button></div>)}</div>
          {!people.length && search.trim().length < 2 && <div className="mt-6 rounded-xl border border-dashed border-rcl-blue/20 bg-rcl-blue/[.025] p-5 text-sm leading-6 text-white/35">Search for a player, coach, teammate, or community member to grow your RCL network.</div>}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Your network</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Connections</h2></div><div className="flex gap-2 text-xs font-black uppercase tracking-wider"><span className="rounded-full border border-rcl-blue/15 px-3 py-1.5 text-white/35">{accepted.length} connected</span>{inbound.length > 0 && <span className="rounded-full border border-rcl-orange/20 bg-rcl-orange/5 px-3 py-1.5 text-rcl-orange">{inbound.length} requests</span>}</div></div>
          <div className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55">
            {authLoading || loading ? <div className="space-y-px">{[1,2,3].map(row => <div key={row} className="h-20 animate-pulse border-b border-white/10 bg-white/[.02]" />)}</div> : friends.length ? <div className="divide-y divide-white/10">{friends.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div><SocialIdentity author={connectionProfile(row)} /><p className={`mt-2 text-xs font-black uppercase tracking-[.14em] ${row.status === 'accepted' ? 'text-rcl-blue' : 'text-white/30'}`}>{row.status === 'accepted' ? 'Connected' : row.addressee_id === user?.id ? 'Request received' : 'Request sent'}</p></div><div className="flex gap-2">{row.status === 'pending' && row.addressee_id === user?.id ? <><button disabled={busy === row.id} onClick={() => void update(row.id, 'accepted')} className="rounded-lg bg-rcl-orange px-3 py-2 text-xs font-black uppercase text-black disabled:opacity-50">Accept</button><button disabled={busy === row.id} onClick={() => void update(row.id, 'declined')} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black uppercase text-white/45 disabled:opacity-50">Decline</button></> : row.status === 'pending' ? <button disabled={busy === row.id} onClick={() => void update(row.id, 'cancelled')} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black uppercase text-white/45 disabled:opacity-50">Cancel request</button> : null}</div></div>)}</div> : <div className="p-10 text-center"><FaUserGroup className="mx-auto text-3xl text-rcl-blue/50"/><h3 className="mt-4 font-display text-xl font-black uppercase">Your network starts here</h3><p className="mt-2 text-sm text-white/35">Search for a teammate or RCL member to get connected.</p></div>}
          </div>
          {outbound.length > 0 && <p className="mt-3 text-xs text-white/30">{outbound.length} outgoing friend request{outbound.length === 1 ? '' : 's'} pending.</p>}
        </section>
      </div>}
    </Container>
  </main>;
}
