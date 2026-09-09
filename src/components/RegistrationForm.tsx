'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database, Division, Season } from '@/types/database';

export function RegistrationForm({ seasons, divisions }: { seasons: Season[]; divisions: Division[] }) {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [form, setForm] = useState({ firstName: profile?.first_name ?? '', lastName: profile?.last_name ?? '', email: '', dateOfBirth: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) {
      setMessage('Sign in before submitting a registration.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const registration: Database['public']['Tables']['registrations']['Insert'] = {
      season_id: seasonId,
      applicant_id: user.id,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      date_of_birth: form.dateOfBirth || null,
    };
    const { error } = await supabase.from('registrations').insert(registration);
    setSubmitting(false);
    setMessage(error ? error.message : 'Registration submitted. The league will review your application.');
    if (!error) setForm((current) => ({ ...current, firstName: '', lastName: '', email: '', dateOfBirth: '' }));
  }

  return <form onSubmit={submit} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <h2 className="font-display text-2xl font-bold">Submit registration</h2>
    <p className="mt-2 text-sm text-gray-400">Your application is saved with pending status for league review. Payment is not collected here.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-gray-300">Season<select required value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3">{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></label>
      <label className="text-sm text-gray-300">Division (optional)<select className="mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3"><option value="">Select division</option>{divisions.filter((division) => division.season_id === seasonId).map((division) => <option key={division.id}>{division.name}</option>)}</select></label>
      <label className="text-sm text-gray-300">First name<input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3" /></label>
      <label className="text-sm text-gray-300">Last name<input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3" /></label>
      <label className="text-sm text-gray-300">Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3" /></label>
      <label className="text-sm text-gray-300">Date of birth<input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-rcl-black p-3" /></label>
    </div>
    <button disabled={submitting || !seasonId} className="mt-6 rounded-lg bg-rcl-gold px-5 py-3 font-bold text-rcl-black disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit registration'}</button>
    {message && <p role="status" className="mt-4 text-sm text-gray-300">{message}</p>}
  </form>;
}
