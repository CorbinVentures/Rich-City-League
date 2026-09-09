'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Container } from '@/components/Container';
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

  if (loading) return <main><Container maxWidth="lg" className="py-16"><div className="h-8 w-48 animate-pulse rounded bg-white/10" /></Container></main>;
  if (!user || !profile) return <main><Container maxWidth="lg" className="py-16"><p>Please sign in to manage your profile.</p></Container></main>;

  return <main><Container maxWidth="lg" className="py-12">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">Player experience</p>
    <h1 className="mt-2 font-display text-4xl font-bold">Your profile</h1>
    <p className="mt-3 text-gray-400">Keep your contact and player-facing information current.</p>
    <form onSubmit={save} className="mt-8 max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {(['first_name', 'last_name', 'display_name', 'phone'] as const).map((field) => <label key={field} className="text-sm text-gray-300">{field.replace('_', ' ')}<input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label>)}
      </div>
      <label className="block text-sm text-gray-300">Bio<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white" /></label>
      <div className="flex items-center gap-4"><button className="rounded-lg bg-rcl-gold px-5 py-2 font-semibold text-black" type="submit">Save profile</button>{message && <span className="text-sm text-emerald-300">{message}</span>}{error && <span className="text-sm text-red-300">{error}</span>}</div>
    </form>
  </Container></main>;
}
