'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

const challenges = [
  { key: 'corner-25', name: 'Corner Office', metric: 'Made corner threes', target: 25 },
  { key: 'ft-20', name: 'Pressure Free Throws', metric: 'Made free throws', target: 20 },
  { key: 'handle-60', name: 'Handle Control', metric: 'Clean reps in 60 seconds', target: 60 },
  { key: 'finishing-20', name: 'Finish Strong', metric: 'Made finishes', target: 20 },
];
type Challenge = typeof challenges[number];
type Attempt = { id: string; challenge_name: string; result: number; verification_status: string };

export default function Challenges() {
  const { user, loading: authLoading } = useAuth();
  const db = useMemo(() => getSupabaseClient(), []);
  const [rows, setRows] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const userId = user?.id;
  const load = useCallback(async () => {
    if (!userId || !db) { setRows([]); return; }
    setLoading(true);
    try {
      const result = await db.from('lab_challenge_attempts').select('*').eq('profile_id', userId).order('created_at', { ascending: false }).limit(30);
      if (result.error) throw result.error;
      setRows(result.data ?? []);
    } catch { setError('We could not load your attempts. Please try again.'); }
    finally { setLoading(false); }
  }, [db, userId]);
  useEffect(() => { void load(); }, [load]);
  async function submit(challenge: Challenge, value: number) {
    if (!userId || !db || !Number.isSafeInteger(value) || value < 0) return false;
    setError(''); setMessage('');
    try {
      const result = await db.from('lab_challenge_attempts').insert({ profile_id: userId, challenge_key: challenge.key, challenge_name: challenge.name, result: value, verification_status: 'self' });
      if (result.error) throw result.error;
      setMessage(`${challenge.name}: ${value} recorded as a self-tested result.`);
      await load();
      return true;
    } catch { setError('Your attempt was not saved. Please try again.'); return false; }
  }
  return <main className="min-h-screen px-4 py-12 text-white"><div className="mx-auto max-w-6xl">
    <Link className="inline-flex min-h-11 items-center text-sm text-rcl-orange" href="/lab">← The Lab</Link>
    <h1 className="mt-4 font-display text-4xl sm:text-5xl">Lab challenges</h1>
    <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Put your practice to the test. Self-tested attempts stay separate from verified leaderboard results.</p>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="mt-6 text-sm text-emerald-300">{message}</p>}
    {!authLoading && !user && <p className="mt-6 text-sm text-slate-300"><Link href="/auth/sign-in?next=/lab/challenges" className="text-rcl-orange underline">Sign in</Link> to record attempts and track your progress.</p>}
    <div className="mt-8 grid gap-4 md:grid-cols-2">{challenges.map(challenge=><ChallengeCard key={challenge.key} challenge={challenge} submit={submit} disabled={!user || !db || authLoading} />)}</div>
    {user && <section className="mt-12" aria-busy={loading}><h2 className="font-display text-2xl">My attempts</h2>
      {loading ? <p role="status" className="mt-4 text-sm text-slate-300">Loading attempts…</p> : rows.length ? <div className="mt-4">{rows.map(row=><div key={row.id} className="flex flex-wrap justify-between gap-3 border-b border-white/10 py-4 text-sm"><span>{row.challenge_name}</span><span><b>{row.result}</b> · {row.verification_status.replace(/_/g, ' ')}</span></div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-300">No attempts yet. Record your first challenge above.</p>}
    </section>}
  </div></main>;
}
function ChallengeCard({ challenge, submit, disabled }: { challenge: Challenge; submit: (challenge: Challenge, value: number) => Promise<boolean>; disabled: boolean }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const valid = value.trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
  async function record(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving || disabled) return;
    setSaving(true);
    try { if (await submit(challenge, Number(value))) setValue(''); }
    finally { setSaving(false); }
  }
  return <article className="rounded-2xl border border-white/10 p-6">
    <p className="text-xs font-bold uppercase tracking-widest text-rcl-orange">Weekly Lab test</p><h2 className="mt-2 text-xl font-bold">{challenge.name}</h2>
    <p className="mt-3 text-sm leading-6 text-slate-300">{challenge.metric} · target {challenge.target}</p>
    <form onSubmit={record} className="mt-5 flex items-end gap-3">
      <label className="min-w-0 flex-1 text-sm font-semibold">Your result<input type="number" min="0" step="1" required disabled={disabled || saving} value={value} onChange={event=>setValue(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 p-3" /></label>
      <button type="submit" disabled={disabled || saving || !valid} aria-busy={saving} className="rcl-state-link rcl-state-primary min-h-12 disabled:opacity-50">{saving ? 'Saving…' : 'Record'}</button>
    </form>
  </article>;
}
