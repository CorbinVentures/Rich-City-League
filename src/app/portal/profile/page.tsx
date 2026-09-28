'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaIdCard, FaUserPen } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const [form, setForm] = useState({ first_name: '', last_name: '', display_name: '', phone: '', bio: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        display_name: profile.display_name ?? '',
        phone: profile.phone ?? '',
        bio: profile.bio ?? '',
      });
    }
  }, [profile]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setMessage(null);
    setError(null);
    const client = getSupabaseClient();
    if (!client) {
      setError('Supabase is not configured.');
      return;
    }
    const payload: Database['public']['Tables']['profiles']['Update'] = form;
    const { error: updateError } = await client.from('profiles').update(payload as never).eq('id', user.id);
    if (updateError) setError('Unable to update your profile.');
    else setMessage('Your profile was updated.');
  }

  if (loading) return <main className="min-h-screen bg-rcl-black text-white"><Container maxWidth="lg" className="py-16"><div className="h-10 w-64 animate-pulse rounded-xl bg-white/10" /><div className="mt-8 h-80 animate-pulse rounded-3xl bg-white/[.04]" /></Container></main>;
  if (!user || !profile) return <main className="min-h-screen bg-rcl-black text-white"><Container maxWidth="lg" className="py-16"><div className="rounded-3xl border border-rcl-blue/15 bg-white/[.025] p-8 text-center"><FaIdCard className="mx-auto text-3xl text-rcl-blue"/><h1 className="mt-4 font-display text-3xl font-black uppercase">Sign in to manage your portal profile</h1><Link href="/auth/sign-in?next=/portal/profile" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Sign in <FaArrowRight /></Link></div></Container></main>;

  return <main className="min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero
      eyebrow="RCL MEMBER PORTAL"
      title="Your portal"
      accent="profile."
      description="Keep the contact details and identity information used across your private league workspace current."
      assetKey="league.cover"
      meta={<div className="min-w-56 rounded-2xl border border-rcl-blue/20 bg-[#071522]/80 p-5"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-blue">ACCOUNT ROLE</p><p className="mt-3 font-display text-2xl font-black uppercase">{profile.role ?? 'member'}</p><p className="mt-1 text-xs text-white/40">Authorized access is managed separately.</p></div>}
      actions={<><Link href="/profile" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-4 text-xs font-black uppercase tracking-wider transition hover:border-rcl-blue/45"><FaUserPen /> Full profile editor</Link><Link href="/portal/requests" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black">Request Center <FaArrowRight /></Link></>}
    />

    <Container maxWidth="lg" className="py-10">
      <form onSubmit={save} className="overflow-hidden rounded-3xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#071522,#05090f)] shadow-2xl">
        <div className="border-b border-white/10 px-6 py-5 sm:px-8"><p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">PRIVATE LEAGUE DETAILS</p><h2 className="mt-2 font-display text-2xl font-black uppercase">Contact & identity</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">These fields support league communication and your authenticated portal experience. League permissions are not changed here.</p></div>

        <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          {(['first_name', 'last_name', 'display_name', 'phone'] as const).map((field) => <label key={field} className="text-xs font-black uppercase tracking-wider text-white/45">{field.replace('_', ' ')}<input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-normal normal-case tracking-normal text-white outline-none transition focus:border-rcl-blue/50" /></label>)}
          <label className="block text-xs font-black uppercase tracking-wider text-white/45 sm:col-span-2">Bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={5} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-white outline-none transition focus:border-rcl-blue/50" /></label>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>{message && <p role="status" className="text-sm text-emerald-300">{message}</p>}{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{!message && !error && <p className="text-xs leading-5 text-white/30">Changes apply to your RCL profile record without changing league authorization.</p>}</div>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-6 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110" type="submit"><FaUserPen /> Save profile</button>
        </div>
      </form>
    </Container>
  </main>;
}
