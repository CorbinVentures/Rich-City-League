'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) window.location.assign('/auth/sign-in');
  }, [loading, user]);

  if (loading || !user) return <main><Container maxWidth="xl" className="py-16"><p className="text-gray-400">Loading your dashboard…</p></Container></main>;

  return <main><Container maxWidth="xl" className="py-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{profile?.role ?? 'player'} dashboard</p><h1 className="mt-2 font-display text-4xl font-bold">Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}</h1><p className="mt-3 text-gray-400">Your RCL account is connected to the production league platform.</p><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Link href="/games" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-rcl-gold/50">Game Center</Link><Link href="/teams" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-rcl-gold/50">Teams</Link><Link href="/standings" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-rcl-gold/50">Standings</Link><Link href="/register" className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-rcl-gold/50">Registration</Link></div><button onClick={() => void signOut()} className="mt-10 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:border-rcl-gold hover:text-rcl-gold">Sign out</button></Container></main>;
}
