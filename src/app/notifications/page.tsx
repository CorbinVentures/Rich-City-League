'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';

type Notification = { id: string; actor_id: string | null; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; actor?: SocialIdentityAuthor | null };
export default function NotificationsPage() {
  const { user } = useAuth(); const supabase = useMemo(() => getSupabaseClient(), []); const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { if (!supabase || !user) return; const load = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(100);
    const rows = (data ?? []) as Notification[];
    const actorIds = [...new Set(rows.map(item => item.actor_id).filter((id): id is string => Boolean(id)))];
    if (!actorIds.length) { setItems(rows); return; }
    const [profiles, levels] = await Promise.all([
      supabase.from('profiles').select('id,display_name,username,avatar_url,is_vip,vip_label').in('id', actorIds),
      supabase.from('user_levels').select('profile_id,xp,level').in('profile_id', actorIds),
    ]);
    const levelMap = new Map(((levels.data ?? []) as { profile_id:string; xp:number; level:number }[]).map(row => [row.profile_id,row]));
    const actorMap = new Map(((profiles.data ?? []) as Array<SocialIdentityAuthor & { id:string }>).map(actor => { const rep=levelMap.get(actor.id); return [actor.id,{...actor,rep:rep?.xp??0,level:rep?.level??1}]; }));
    setItems(rows.map(item => ({...item,actor:item.actor_id ? actorMap.get(item.actor_id) ?? null : null})));
  }; void load(); }, [supabase, user]);
  useEffect(() => { if (!supabase || !user) return; const channel = supabase.channel('rcl-notifications-' + user.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'recipient_id=eq.' + user.id }, (payload) => setItems((current) => [payload.new as Notification, ...current.filter((item) => item.id !== (payload.new as Notification).id)])).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [supabase, user]);
  const repTypes = new Set(['rep_level','rep_status','rep_milestone']);
  const read = async (id: string) => { if (!supabase || !user) return; await supabase.from('notifications').update({ read_at: new Date().toISOString() } as never).eq('id', id).eq('recipient_id', user.id); setItems(current => current.map(item => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)); };
  return <main className="min-h-screen bg-rcl-black pb-24 text-white"><Container maxWidth="md" className="py-12"><p className="text-xs font-black tracking-[0.25em] text-rcl-gold">RCL ALERTS</p><h1 className="mt-2 text-4xl font-black">Notifications</h1><section className="mt-8 space-y-2">{items.length === 0 && <div className="rounded-2xl border border-white/10 p-8 text-center text-gray-500">You are all caught up.</div>}{items.map(item => <button key={item.id} onClick={() => { void read(item.id); if (item.link) window.location.href = item.link; }} className={`w-full rounded-2xl border p-5 text-left transition hover:bg-white/5 ${repTypes.has(item.type) ? 'rcl-rep-notification ' : ''}${item.read_at ? 'border-white/10 bg-white/[0.02]' : 'border-rcl-gold/40 bg-rcl-gold/5'}`}>{item.actor && <div className="mb-3"><SocialIdentity author={item.actor} /></div>}<div className="flex items-start justify-between gap-3"><h2 className="font-bold">{repTypes.has(item.type) && <span className="mr-2 text-rcl-orange">REP</span>}{item.title}</h2><time className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</time></div><p className="mt-2 text-sm text-gray-400">{item.body ?? 'New Rich City League activity.'}</p></button>)}</section></Container></main>;
}
