'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database, Game, Notification, Payment, PlayerGameStats, Registration, Team } from '@/types/database';

type DashboardData = {
  games: Game[];
  teams: Team[];
  registrations: Registration[];
  payments: Payment[];
  stats: PlayerGameStats[];
  notifications: Notification[];
  counts: Record<string, number>;
};

const emptyData: DashboardData = { games: [], teams: [], registrations: [], payments: [], stats: [], notifications: [], counts: {} };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p><p className="mt-2 font-display text-3xl font-bold text-white">{value}</p></div>;
}

export default function DashboardWorkspace() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (authLoading || !user || !supabase) return;
    const load = async () => {
      setLoading(true);
      try {
        const [games, registrations, notifications] = await Promise.all([
          supabase.from('games').select('*').order('scheduled_at', { ascending: true }).limit(8),
          supabase.from('registrations').select('*').eq('applicant_id', user.id).order('submitted_at', { ascending: false }),
          supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(8),
        ]);
        if (games.error || registrations.error || notifications.error) throw new Error((games.error ?? registrations.error ?? notifications.error)?.message);
        const registrationIds = (registrations.data ?? []).map((registration) => registration.id);
        const payments = registrationIds.length
          ? await supabase.from('payments').select('*').in('registration_id', registrationIds).order('created_at', { ascending: false }).limit(10)
          : { data: [], error: null };
        if (payments.error) throw payments.error;
        let stats: PlayerGameStats[] = [];
        let teams: Team[] = [];
        if (profile?.role === 'player') {
          const player = await supabase.from('players').select('id').eq('profile_id', user.id).maybeSingle();
          if (player.error) throw player.error;
          if (player.data) {
            const playerId = (player.data as { id: string }).id;
            const result = await supabase.from('player_game_stats').select('*').eq('player_id', playerId);
            if (result.error) throw result.error;
            stats = result.data ?? [];
          }
        }
        if (profile?.role === 'coach' || profile?.role === 'staff' || profile?.role === 'admin') {
          const result = await supabase.from('teams').select('*').order('name');
          if (result.error) throw result.error;
          teams = result.data ?? [];
        }
        const counts: Record<string, number> = {};
        if (profile?.role === 'staff' || profile?.role === 'admin') {
          for (const table of ['profiles', 'seasons', 'teams', 'players', 'games', 'registrations', 'payments']) {
            const result = await supabase.from(table as keyof Database['public']['Tables']).select('*', { count: 'exact', head: true });
            if (result.error) throw result.error;
            counts[table] = result.count ?? 0;
          }
        }
        setData({ games: games.data ?? [], teams, registrations: registrations.data ?? [], payments: payments.data ?? [], stats, notifications: notifications.data ?? [], counts });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [authLoading, profile?.role, supabase, user]);

  if (authLoading || loading) return <main><Container maxWidth="xl" className="py-16"><div className="h-8 w-64 animate-pulse rounded bg-white/10" /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/5" />)}</div></Container></main>;
  if (!user) return <main><Container maxWidth="xl" className="py-16"><p>Please sign in to access your dashboard.</p><Link className="mt-4 inline-block text-rcl-gold" href="/auth/sign-in">Sign in</Link></Container></main>;
  if (error) return <main><Container maxWidth="xl" className="py-16"><h1 className="font-display text-3xl font-bold">Dashboard unavailable</h1><p className="mt-3 text-red-300">{error}</p><button className="mt-6 rounded-lg border border-white/20 px-4 py-2" onClick={() => window.location.reload()}>Try again</button></Container></main>;

  const role = profile?.role ?? 'player';
  const upcoming = data.games.filter((game) => game.status === 'scheduled' || game.status === 'live').slice(0, 4);
  const unread = data.notifications.filter((notification) => !notification.read_at);
  const totalPoints = data.stats.reduce((sum, stat) => sum + stat.points, 0);
  const status = data.registrations[0]?.status ?? 'Not submitted';

  async function markNotificationRead(id: string) {
    if (!supabase || !user) return;
    const { error: updateError } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('recipient_id', user.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setData((current) => ({ ...current, notifications: current.notifications.map((notification) => notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification) }));
  }

  return <main><Container maxWidth="xl" className="py-10 sm:py-14">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{role} dashboard</p><h1 className="mt-2 font-display text-4xl font-bold">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h1><p className="mt-3 text-gray-400">Your Rich City League operations center.</p></div><button onClick={() => void signOut()} className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-rcl-gold hover:text-rcl-gold">Sign out</button></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {role === 'player' ? <><StatCard label="Registration" value={status} /><StatCard label="Career points" value={totalPoints} /><StatCard label="Upcoming games" value={upcoming.length} /><StatCard label="Notifications" value={unread.length} /></> : <><StatCard label="Teams" value={role === 'coach' ? data.teams.length : data.counts.teams ?? 0} /><StatCard label="Upcoming games" value={upcoming.length} /><StatCard label="Registrations" value={data.counts.registrations ?? data.registrations.length} /><StatCard label="Payments" value={data.counts.payments ?? data.payments.length} /></>}
    </div>
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold">Upcoming games</h2><Link href="/games" className="text-sm text-rcl-gold">Game center</Link></div>{upcoming.length === 0 ? <p className="mt-6 text-gray-500">No upcoming games are scheduled.</p> : <div className="mt-5 space-y-3">{upcoming.map((game) => <Link href={`/games/${game.id}`} key={game.id} className="flex items-center justify-between rounded-xl border border-white/10 p-4 hover:border-rcl-gold/50"><span><span className="block text-sm text-gray-300">{new Date(game.scheduled_at).toLocaleDateString()}</span><span className="text-xs uppercase text-gray-500">{game.status}</span></span><span className="font-semibold">{game.away_score} — {game.home_score}</span></Link>)}</div>}</section>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold">Notifications</h2>{unread.length > 0 && <button type="button" onClick={() => void Promise.all(unread.map((notification) => markNotificationRead(notification.id)))} className="text-sm text-rcl-gold">Mark all read</button>}</div>{data.notifications.length === 0 ? <p className="mt-6 text-gray-500">You are all caught up.</p> : <div className="mt-5 space-y-4">{data.notifications.slice(0, 4).map((notification) => <button type="button" key={notification.id} onClick={() => notification.read_at ? undefined : void markNotificationRead(notification.id)} className={`block w-full text-left ${notification.read_at ? 'border-b border-white/5 pb-3' : 'border-b border-rcl-gold/30 pb-3'}`}><p className="font-semibold">{notification.title}</p><p className="mt-1 text-sm text-gray-400">{notification.body ?? 'New league update'}</p></button>)}</div>}</section>
    </div>
    {(role === 'staff' || role === 'admin') && <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-display text-2xl font-bold">{role === 'admin' ? 'System overview' : 'League operations'}</h2><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">{Object.entries(data.counts).map(([label, value]) => <div key={label}><p className="text-xs uppercase text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div></section>}
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <Link href="/portal/profile" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-gold/50">Profile <span className="mt-1 block text-sm text-gray-400">Update permitted contact information</span></Link>
      <Link href="/stats" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-gold/50">Statistics <span className="mt-1 block text-sm text-gray-400">View real game performance</span></Link>
      {(role === 'player' || role === 'coach') ? <Link href="/register" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-gold/50">Registration <span className="mt-1 block text-sm text-gray-400">Submit or review status</span></Link> : <Link href="/portal/operations" className="rounded-2xl border border-white/10 p-5 hover:border-rcl-gold/50">Operations <span className="mt-1 block text-sm text-gray-400">Review registrations and games</span></Link>}
    </div>
  </Container></main>;
}
