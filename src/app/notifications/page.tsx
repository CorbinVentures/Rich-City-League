'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBell, FaBolt, FaCheckDouble, FaEnvelope, FaGear, FaNewspaper, FaTrophy, FaUserGroup } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';
import { PWAAppAlertsCard } from '@/components/PWAAppAlertsCard';

type Notification = { id: string; actor_id: string | null; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; actor?: SocialIdentityAuthor | null };
type Filter = 'all' | 'unread' | 'social' | 'runs' | 'league' | 'messages';
const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' },
  { id: 'social', label: 'Community' }, { id: 'runs', label: 'Runs & REP' },
  { id: 'league', label: 'League & news' }, { id: 'messages', label: 'Messages' },
];
const socialTypes = new Set(['follow', 'friend_request', 'comment', 'reaction', 'repost', 'profile_post', 'mention', 'tag', 'story_reply', 'community_invite', 'community_post']);
const runTypes = new Set(['rep_level', 'rep_status', 'rep_milestone', 'rep', 'mission', 'missions', 'runs', 'run', 'badge', 'badge_earned', 'court_takeover', 'crew_invite']);
const categoryFor = (type: string): Filter => type === 'message' ? 'messages' : runTypes.has(type) || /^(run|rep|badge|crew|court|mission)/.test(type) ? 'runs' : socialTypes.has(type) ? 'social' : 'league';
const iconFor = (category: Filter) => category === 'runs' ? FaTrophy : category === 'social' ? FaUserGroup : category === 'messages' ? FaEnvelope : FaNewspaper;
const safeLink = (link: string | null) => link && link.startsWith('/') && !link.startsWith('//') && !link.includes('\\') ? link : null;

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !user) { setItems([]); setLoading(false); return; }
    setLoading(true); setError('');
    const { data, error: notificationError } = await supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (notificationError) { setError('We could not load your notifications.'); setLoading(false); return; }
    const rows = (data ?? []) as Notification[];
    const actorIds = [...new Set(rows.map(item => item.actor_id).filter((id): id is string => Boolean(id)))];
    if (!actorIds.length) { setItems(rows); setLoading(false); return; }
    const [profiles, levels] = await Promise.all([
      supabase.from('profiles').select('id,display_name,username,avatar_url,is_vip,vip_label').in('id', actorIds),
      supabase.from('user_levels').select('profile_id,xp,level').in('profile_id', actorIds),
    ]);
    const levelMap = new Map(((levels.data ?? []) as { profile_id:string; xp:number; level:number }[]).map(row => [row.profile_id,row]));
    const actorMap = new Map(((profiles.data ?? []) as Array<SocialIdentityAuthor & { id:string }>).map(actor => { const rep=levelMap.get(actor.id); return [actor.id,{...actor,rep:rep?.xp??0,level:rep?.level??1}]; }));
    setItems(rows.map(item => ({...item,actor:item.actor_id ? actorMap.get(item.actor_id) ?? null : null})));
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!supabase || !user) return;
    const channel = supabase.channel('rcl-notifications-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + user.id }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, supabase, user]);

  const unread = items.filter(item => !item.read_at).length;
  const filtered = items.filter(item => filter === 'all' || (filter === 'unread' ? !item.read_at : categoryFor(item.type) === filter));
  const recent = filtered.filter(item => Date.now() - new Date(item.created_at).getTime() < 7 * 86400000);
  const older = filtered.filter(item => Date.now() - new Date(item.created_at).getTime() >= 7 * 86400000);
  const read = async (id: string) => {
    if (!supabase || !user) return;
    const now = new Date().toISOString();
    const { error: readError } = await supabase.from('notifications').update({ read_at: now } as never).eq('id', id).eq('recipient_id', user.id);
    if (readError) { setError('Could not mark this alert as read.'); return; }
    setItems(current => current.map(item => item.id === id ? { ...item, read_at: now } : item));
    window.dispatchEvent(new Event('rcl:notification-state-changed'));
  };
  const markAllRead = async () => {
    if (!supabase || !user || !unread || busy) return;
    setBusy(true); setError('');
    const now = new Date().toISOString();
    const { error: updateError } = await supabase.from('notifications').update({ read_at: now } as never).eq('recipient_id', user.id).is('read_at', null);
    if (updateError) setError('We could not mark every notification as read.');
    else {
      setItems(current => current.map(item => item.read_at ? item : { ...item, read_at: now }));
      window.dispatchEvent(new Event('rcl:notification-state-changed'));
    }
    setBusy(false);
  };
  const renderNotification = (item: Notification) => {
    const category = categoryFor(item.type);
    const Icon = iconFor(category);
    const href = safeLink(item.link);
    return <button key={item.id} type="button" onClick={() => { void read(item.id); if (href) window.location.assign(href); }}
      className={`group relative flex w-full gap-4 rounded-2xl border p-4 text-left transition sm:p-5 ${item.read_at ? 'border-white/[.06] bg-white/[.025] hover:border-white/20' : 'border-rcl-orange/25 bg-[#18202a] hover:border-rcl-orange/50'}`}>
      {!item.read_at && <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-rcl-orange" aria-label="Unread"/>}
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg ${category === 'runs' ? 'bg-rcl-orange/15 text-rcl-orange' : category === 'social' ? 'bg-indigo-400/15 text-indigo-200' : 'bg-rcl-blue/15 text-rcl-blue'}`}><Icon aria-hidden="true"/></span>
      <span className="min-w-0 flex-1 pr-3">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[.18em] text-white/40">{category === 'runs' ? 'Runs • Progression' : category === 'social' ? 'Community' : category === 'messages' ? 'Messages' : 'League • News'}</span>
        {item.actor && <span className="mb-3 block"><SocialIdentity author={item.actor}/></span>}
        <span className="block font-bold leading-snug text-white group-hover:text-rcl-orange">{item.title}</span>
        <span className="mt-1.5 block text-sm leading-6 text-white/60">{item.body ?? 'New Rich City Hoops activity.'}</span>
        <span className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/40">
          <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
          {!item.read_at && <span className="font-bold text-rcl-orange">New</span>}
          {href && <span className="inline-flex items-center gap-1 font-bold text-rcl-blue">View activity <FaArrowRight aria-hidden="true"/></span>}
        </span>
      </span>
    </button>;
  };

  return <main className="rcl-social-secondary min-h-screen bg-[#050a11] pb-28 text-white">
    <Container maxWidth="lg" className="pt-7 sm:pt-10">
      <div className="overflow-hidden rounded-3xl border border-rcl-blue/20 bg-gradient-to-br from-[#16283b] via-[#0c1928] to-[#100e16] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.22em] text-rcl-orange"><FaBolt/> Your basketball signal</p>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">Activity Center</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-white/60">Connections, court activity, league news and your next milestone—all in one place.</p>
          </div>
          <Link href="/settings/notifications" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-xs font-bold uppercase tracking-wide"><FaGear/> Preferences</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">Needs your attention</p><p className="mt-1 text-3xl font-black text-rcl-orange">{unread}</p><p className="text-xs text-white/40">Unread updates</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[11px] uppercase tracking-wider text-white/45">Your latest activity</p><p className="mt-1 text-3xl font-black">{items.length}</p><p className="text-xs text-white/40">Recent alerts</p></div>
          <Link href="/settings/notifications" className="col-span-2 flex items-center justify-between gap-3 rounded-2xl border border-rcl-orange/25 bg-rcl-orange/10 p-4 transition hover:bg-rcl-orange/15 sm:col-span-1">
            <span><span className="block text-xs font-black uppercase tracking-wider text-rcl-orange">The Weekly Hoops Brief</span><span className="mt-1 block text-xs leading-5 text-white/70">Runs, news, badges, events & partners in your inbox.</span></span><FaEnvelope className="shrink-0 text-xl text-rcl-orange"/>
          </Link>
        </div>
      </div>
    </Container>
    <Container maxWidth="lg" className="py-7 sm:py-9">
      {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Retry</button></div>}
      {!user && !authLoading ? <div className="rounded-3xl border border-rcl-blue/15 bg-[#071522] p-10 text-center"><FaBell className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Sign in for your activity</h2><p className="mt-2 text-sm text-white/60">Your notifications belong to your RCH account.</p><Link href="/auth/sign-in?next=/notifications" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Sign in <FaArrowRight/></Link></div> :
        <section aria-label="Your notifications">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-black uppercase">Notifications</h2><button type="button" disabled={busy || unread===0 || loading} onClick={() => void markAllRead()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-bold uppercase tracking-wider hover:bg-white/5 disabled:opacity-40"><FaCheckDouble/>{busy ? 'Updating…' : 'Mark all read'}</button></div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter notifications">{filters.map(({id,label})=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold transition ${filter===id ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/15 bg-white/[.035] text-white/70 hover:border-white/40'}`}>{label}{id==='unread' && unread>0 ? ` (${unread})` : ''}</button>)}</div>
          {authLoading || loading ? <div className="mt-5 space-y-3">{[1,2,3].map(i=><div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[.05]"/>)}</div> : filtered.length ? <div className="mt-5 space-y-7">{[{label:'This week',items:recent},{label:'Earlier',items:older}].filter(group=>group.items.length).map(group=><section key={group.label}><h3 className="mb-3 text-xs font-black uppercase tracking-[.2em] text-white/45">{group.label}</h3><div className="space-y-3">{group.items.map(renderNotification)}</div></section>)}</div> : <div className="mt-5 rounded-3xl border border-white/10 bg-white/[.025] p-10 text-center"><FaCheckDouble className="mx-auto text-3xl text-rcl-blue"/><h3 className="mt-4 font-display text-2xl font-black uppercase">{filter === 'all' ? 'All caught up' : 'Nothing in this category'}</h3><p className="mt-2 text-sm text-white/55">We’ll bring the important basketball updates here as they happen.</p>{filter!=='all' && <button type="button" onClick={()=>setFilter('all')} className="mt-5 text-sm font-bold text-rcl-orange underline">View all notifications</button>}</div>}
        </section>}
      <details className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">Mobile push alerts</summary><PWAAppAlertsCard/></details>
    </Container>
  </main>;
}
