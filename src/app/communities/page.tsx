'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball, FaLocationDot, FaMagnifyingGlass, FaPeopleGroup, FaPlus } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { NetworkSponsoredPlacement } from '@/components/network/NetworkSponsoredPlacement';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Community = { id: string; name: string; slug: string; description: string | null; community_type: string; privacy: string; logo_url?:string|null; cover_url?:string|null; location_slug?:string|null; is_system_community?:boolean };
type CourtLocation = { slug:string; name:string; address:string; locality:string; area:string };

export default function CommunitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const [items, setItems] = useState<Community[]>([]);
  const [joined, setJoined] = useState<string[]>([]);
  const [locations, setLocations] = useState<Map<string,CourtLocation>>(new Map());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all'|'court'|'member'>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError('Communities are temporarily unavailable. Please try again later.'); return; }
    setLoading(true);
    try {
      const [communities, memberships, courtLocations] = await Promise.all([
        supabase.from('communities').select('*').order('created_at', { ascending: false }),
        userId ? supabase.from('community_members').select('community_id').eq('profile_id', userId) : Promise.resolve({ data: [], error: null }),
        db.from('basketball_locations').select('slug,name,address,locality,area').eq('is_active',true).eq('venue_type','outdoor').eq('access_type','public').order('name'),
      ]);
      if (communities.error || memberships.error || courtLocations.error) throw communities.error || memberships.error || courtLocations.error;
      setItems((communities.data ?? []) as Community[]);
      setJoined((memberships.data ?? []).map(item => item.community_id));
      setLocations(new Map(((courtLocations.data ?? []) as CourtLocation[]).map(location=>[location.slug,location])));
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
      if (membership.error) setError('Your community was created, but membership could not be confirmed. Please use Join below.');
      else setMessage('Your community is ready. Open it and start the conversation.');
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
      setJoined(current => current.includes(id) ? current : [...current, id]);
      setMessage('You joined the community. Open it to enter the conversation.');
    } catch { setError('We could not join this community. Please try again.'); }
    finally { setBusy(null); }
  }

  const courtCount=items.filter(item=>item.community_type==='court').length;
  const memberCount=items.length-courtCount;
  const filtered = items
    .filter(item=>kind==='all'||(kind==='court'?item.community_type==='court':item.community_type!=='court'))
    .filter((item) => {
      const location=item.location_slug?locations.get(item.location_slug):null;
      const haystack=`${item.name} ${item.description ?? ''} ${item.community_type} ${location?.address??''} ${location?.locality??''} ${location?.area??''}`.toLowerCase();
      return !query.trim()||haystack.includes(query.trim().toLowerCase());
    })
    .sort((a,b)=>{
      if(a.community_type==='court'&&b.community_type==='court') return a.name.localeCompare(b.name);
      if(a.community_type==='court') return -1;
      if(b.community_type==='court') return 1;
      return a.name.localeCompare(b.name);
    });

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero
      eyebrow="Community"
      title="Communities"
      accent="Find your people"
      description="Join basketball spaces built around local courts, teams, runs, shared interests and the conversations that move Richmond hoops."
      assetKey="communities.cover"
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Community network</p><p className="mt-1 font-display text-3xl font-black">{items.length}<span className="ml-2 text-xs text-white/35">spaces</span></p><p className="mt-2 text-xs text-rcl-blue">{joined.length} joined</p></div>}
    />

    <Container maxWidth="xl" className="py-8 sm:py-12">
      {error && <div role="alert" className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200"><div className="flex flex-wrap items-center justify-between gap-3"><p>{error}</p><button type="button" disabled={loading || Boolean(busy)} onClick={() => { setError(''); void load(); }} className="min-h-10 rounded-lg border border-red-300/20 px-3 font-black uppercase tracking-wider disabled:opacity-50">Refresh</button></div></div>}
      {message && <p role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">{message}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24">
          {authLoading ? <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-6 text-sm text-white/40">Loading your account…</div> : user ? <form onSubmit={create} className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Create a space</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Start a community</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-rcl-orange text-black"><FaPlus/></span></div>
            <p className="mt-3 text-sm leading-6 text-white/40">Create a public home for a team, run, basketball topic or RCL interest. Every community gets its own timeline.</p>
            <label className="mt-6 block text-xs font-black uppercase tracking-wider text-white/40">Community name<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 px-4 text-sm text-white outline-none focus:border-rcl-blue/60" /></label>
            <label className="mt-4 block text-xs font-black uppercase tracking-wider text-white/40">Description<textarea maxLength={2000} rows={4} value={description} onChange={event => setDescription(event.target.value)} placeholder="What brings people together?" className="mt-2 w-full resize-none rounded-xl border border-rcl-blue/15 bg-black/25 p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/60" /></label>
            <button type="submit" disabled={Boolean(busy) || !name.trim() || !supabase} aria-busy={busy === 'create'} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:opacity-50">{busy === 'create' ? 'Creating…' : 'Create community'} <FaArrowRight/></button>
          </form> : <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Join the conversation</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Be part of RCL</h2><p className="mt-3 text-sm leading-6 text-white/45">Sign in to join communities, post in timelines or start your own basketball space.</p><Link href="/auth/sign-in?next=/communities" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></Link></div>}
        </aside>

        <section aria-label="Communities" aria-busy={loading}>
          <div className="mb-5 rounded-2xl border border-rcl-blue/15 bg-[#071522]/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative flex-1"><span className="sr-only">Search communities</span><FaMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/25"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search parks, neighborhoods or communities..." className="h-12 w-full rounded-xl border border-rcl-blue/15 bg-[#050b12] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-rcl-blue/60"/></label>
              <span className="px-2 text-xs font-black uppercase tracking-[.16em] text-white/35">{filtered.length} shown</span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {([
                ['all',`All · ${items.length}`,FaPeopleGroup],
                ['court',`Court communities · ${courtCount}`,FaBasketball],
                ['member',`Member-created · ${memberCount}`,FaPeopleGroup],
              ] as const).map(([value,label,Icon])=><button type="button" key={value} onClick={()=>setKind(value)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-wider transition ${kind===value?'border-rcl-blue/35 bg-rcl-blue/10 text-rcl-blue':'border-white/10 text-white/40 hover:text-white'}`}><Icon/>{label}</button>)}
            </div>
          </div>

          <NetworkSponsoredPlacement
            placement="community-feature"
            surface="communities-discovery-sponsored"
            region="central-virginia"
            variant="inline"
            slotKey="community-primary"
            dailyCap={3}
            sessionCap={2}
            brandLabel="Community partner"
            ctaLabel="Explore partner"
            className="mb-5"
          />

          {loading ? <div className="grid gap-4 sm:grid-cols-2">{[1,2,3,4].map(item => <div key={item} className="h-52 animate-pulse rounded-2xl border border-rcl-blue/10 bg-white/[.025]" />)}</div> : filtered.length ? <div className="grid gap-4 sm:grid-cols-2">{filtered.map(item => <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 transition hover:-translate-y-1 hover:border-rcl-blue/35">
            <Link href={`/communities/${item.slug}`} className="group block flex-1 p-5"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-rcl-blue/10 text-rcl-blue">{item.logo_url?<img src={item.logo_url} alt="" className="h-full w-full object-cover"/>:item.community_type==='court'?<FaLocationDot/>:<FaPeopleGroup/>}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white/30">{item.privacy}</span></div><p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-rcl-orange">{item.community_type==='court'?'Court community':item.community_type.replace(/_/g, ' ')}</p><h2 className="mt-1 break-words font-display text-xl font-black uppercase group-hover:text-rcl-blue">{item.name}</h2>{item.location_slug&&locations.get(item.location_slug)?<p className="mt-2 inline-flex items-start gap-2 text-xs leading-5 text-rcl-blue/70"><FaLocationDot className="mt-1 shrink-0"/><span>{locations.get(item.location_slug)?.address} · {locations.get(item.location_slug)?.locality}</span></p>:null}<p className="mt-3 break-words text-sm leading-6 text-white/45">{item.description ?? 'A new RCL basketball community.'}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rcl-blue">Open community <FaArrowRight/></span></Link>
            <div className="border-t border-white/10 p-3">{user ? joined.includes(item.id) ? <Link href={`/communities/${item.slug}`} className="flex min-h-11 items-center justify-center rounded-xl border border-rcl-blue/20 bg-rcl-blue/10 px-4 text-xs font-black uppercase tracking-wider text-rcl-blue">Joined · Enter</Link> : <button type="button" onClick={() => void join(item.id)} disabled={Boolean(busy)} aria-busy={busy === item.id} className="min-h-11 w-full rounded-xl border border-rcl-orange/25 px-4 text-xs font-black uppercase tracking-wider text-rcl-orange transition hover:bg-rcl-orange/10 disabled:opacity-60">{busy === item.id ? 'Joining…' : 'Join community'}</button> : <Link href={`/communities/${item.slug}`} className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-xs font-black uppercase tracking-wider text-white/45">View conversation</Link>}</div>
          </article>)}</div> : <div className="rounded-2xl border border-dashed border-rcl-blue/25 bg-rcl-blue/[.035] p-10 text-center"><FaPeopleGroup className="mx-auto text-3xl text-rcl-blue/55"/><h2 className="mt-4 font-display text-2xl font-black uppercase">{items.length ? 'No communities found' : 'Your community starts here'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/40">{items.length ? 'Try a different search.' : 'No communities are available yet. Start one around your team or favorite part of the game.'}</p></div>}
        </section>
      </div>
    </Container>
  </main>;
}
