'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBell, FaCheckDouble } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';
import { PWAAppAlertsCard } from '@/components/PWAAppAlertsCard';

type Notification = { id: string; actor_id: string | null; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; actor?: SocialIdentityAuthor | null };

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [items, setItems] = useState<Notification[]>([]);
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
    const channel = supabase
      .channel('rcl-notifications-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + user.id }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, supabase, user]);

  const repTypes = new Set(['rep_level','rep_status','rep_milestone']);
  const unread = items.filter(item => !item.read_at).length;

  const read = async (id: string) => {
    if (!supabase || !user) return;
    const now = new Date().toISOString();
    const { error: readError } = await supabase.from('notifications').update({ read_at: now } as never).eq('id', id).eq('recipient_id', user.id);
    if (readError) return;
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

  return <main className="rcl-social-world min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero
      eyebrow="RCL Alerts"
      title="Notifications"
      accent="What needs your attention"
      description="Friend requests, social activity, REP milestones, league updates, and account events—organized in one place."
      assetKey="social.cover"
      actions={unread > 0 ? <button type="button" disabled={busy} onClick={() => void markAllRead()} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider text-white transition hover:border-rcl-blue/60 disabled:opacity-50"><FaCheckDouble/>{busy ? 'Updating…' : 'Mark all read'}</button> : null}
      meta={<div className="min-w-44 rounded-2xl border border-rcl-blue/20 bg-[#071522]/85 px-5 py-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[.18em] text-white/35">Inbox</p><p className="mt-1 font-display text-3xl font-black">{unread}<span className="ml-2 text-xs text-white/35">unread</span></p><p className="mt-2 text-xs text-rcl-blue">{items.length} recent alerts</p></div>}
    />

    <Container maxWidth="lg" className="py-8 sm:py-12">
      <PWAAppAlertsCard />
      {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200"><p>{error}</p><button type="button" onClick={() => void load()} className="rounded-lg border border-red-300/20 px-3 py-2 text-xs font-black uppercase">Try again</button></div>}

      {!user && !authLoading ? <div className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-10 text-center"><FaBell className="mx-auto text-3xl text-rcl-blue"/><h2 className="mt-4 font-display text-2xl font-black uppercase">Sign in to see your alerts</h2><p className="mt-2 text-sm text-white/40">Notifications are tied to your RCL account.</p><a href="/auth/sign-in?next=/notifications" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight/></a></div> : <section className="overflow-hidden rounded-2xl border border-rcl-blue/15 bg-[#071522]/45">
        {authLoading || loading ? <div className="space-y-px">{[1,2,3,4].map(row => <div key={row} className="h-28 animate-pulse border-b border-white/10 bg-white/[.02]" />)}</div> : items.length ? <div className="divide-y divide-white/10">{items.map(item => {
          const isUnread = !item.read_at;
          const isRep = repTypes.has(item.type);
          return <button key={item.id} onClick={() => { void read(item.id); if (item.link) window.location.href = item.link; }} className={`group relative w-full p-5 text-left transition sm:p-6 ${isUnread ? 'bg-rcl-orange/[.035] hover:bg-rcl-orange/[.055]' : 'hover:bg-rcl-blue/[.035]'}`}>
            {isUnread && <span className="absolute left-0 top-0 h-full w-1 bg-rcl-orange"/>}
            <div className="flex gap-4">
              <span className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isRep ? 'bg-rcl-orange/10 text-rcl-orange' : 'bg-rcl-blue/10 text-rcl-blue'}`}><FaBell/></span>
              <div className="min-w-0 flex-1">{item.actor && <div className="mb-3"><SocialIdentity author={item.actor} /></div>}<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><h2 className="font-black group-hover:text-rcl-blue">{isRep && <span className="mr-2 text-rcl-orange">REP</span>}{item.title}</h2><time className="shrink-0 text-xs uppercase tracking-wider text-white/25">{new Date(item.created_at).toLocaleDateString()}</time></div><p className="mt-2 text-sm leading-6 text-white/45">{item.body ?? 'New Rich City League activity.'}</p><div className="mt-3 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[.15em] text-white/25">{isUnread ? 'Unread' : 'Read'}</span>{item.link && <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-rcl-orange">Open <FaArrowRight/></span>}</div></div>
            </div>
          </button>;
        })}</div> : <div className="p-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rcl-blue/10 text-2xl text-rcl-blue"><FaCheckDouble/></span><h2 className="mt-5 font-display text-2xl font-black uppercase">You&apos;re all caught up</h2><p className="mt-2 text-sm text-white/35">New RCL activity will appear here.</p></div>}
      </section>}
    </Container>
  </main>;
}
