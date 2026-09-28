'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

type FilmEntry = { id: string; title: string; lesson: string | null; media_url: string | null };
function filmUrl(value: string) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export default function FilmRoom() {
  const { user, loading: authLoading } = useAuth();
  const db = useMemo(() => getSupabaseClient(), []);
  const [rows, setRows] = useState<FilmEntry[]>([]);
  const [title, setTitle] = useState('');
  const [lesson, setLesson] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const userId = user?.id;
  const load = useCallback(async () => {
    if (!userId || !db) { setRows([]); return; }
    setLoading(true);
    try {
      const result = await db.from('lab_film_entries').select('*').eq('profile_id', userId).order('created_at', { ascending: false });
      if (result.error) throw result.error;
      setRows(result.data ?? []);
    } catch { setError('We could not load your film notes. Please try again.'); }
    finally { setLoading(false); }
  }, [db, userId]);
  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!userId || !db || saving || !title.trim()) return;
    const mediaUrl = url.trim() ? filmUrl(url.trim()) : null;
    if (url.trim() && !mediaUrl) { setError('Enter a complete http or https link for your film.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await db.from('lab_film_entries').insert({ profile_id: userId, title: title.trim(), lesson: lesson.trim(), media_url: mediaUrl, visibility: 'private' });
      if (result.error) throw result.error;
      setTitle(''); setLesson(''); setUrl(''); setMessage('Your private film note is saved.');
      await load();
    } catch { setError('Your note was not saved. Your draft is still here; please try again.'); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen px-4 py-12 text-white"><div className="mx-auto max-w-5xl">
    <Link className="inline-flex min-h-11 items-center text-sm text-rcl-orange" href="/lab">← The Lab</Link>
    <h1 className="mt-4 font-display text-4xl sm:text-5xl">Film room</h1>
    <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Save a possession, capture what you learned, and bring it into your next session.</p>
    {authLoading ? <p role="status" className="mt-8 text-slate-300">Loading your account…</p> : !user ?
      <div className="mt-8 rounded-2xl border border-white/10 p-6"><h2 className="text-xl font-bold">Keep your film notes in one place</h2><p className="mt-2 text-slate-300">Sign in to save and revisit your private notes.</p><Link className="rcl-state-link rcl-state-primary mt-5" href="/auth/sign-in?next=/lab/film-room">Sign in</Link></div> : <>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mt-6 text-sm text-emerald-300">{message}</p>}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <form onSubmit={save} className="space-y-5 rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-bold">New film note</h2>
          <label className="block text-sm font-semibold">Clip title<input required maxLength={120} value={title} onChange={event=>setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 p-3" /></label>
          <label className="block text-sm font-semibold">Film link <span className="font-normal text-slate-400">(optional)</span><input type="url" value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://" className="mt-2 w-full rounded-xl border border-white/15 p-3" /></label>
          <label className="block text-sm font-semibold">What did you learn?<textarea maxLength={4000} rows={5} value={lesson} onChange={event=>setLesson(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 p-3" /></label>
          <button type="submit" disabled={saving || !db || !title.trim()} aria-busy={saving} className="rcl-state-link rcl-state-primary w-full disabled:opacity-50">{saving ? 'Saving…' : 'Save private note'}</button>
        </form>
        <section aria-label="Saved film notes" aria-busy={loading}>
          <h2 className="mb-4 text-xl font-bold">Your film notes</h2>
          {loading ? <p role="status" className="text-slate-300">Loading notes…</p> : rows.length ? rows.map(entry=><article key={entry.id} className="mb-4 rounded-2xl border border-white/10 p-5"><h3 className="text-lg font-bold">{entry.title}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{entry.lesson}</p>{entry.media_url && filmUrl(entry.media_url) && <a href={filmUrl(entry.media_url)!} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-rcl-orange">Open film ↗</a>}</article>) : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-sm leading-6 text-slate-300">Your saved notes will appear here. Start with one possession you want to learn from.</p>}
        </section>
      </div>
    </>}
  </div></main>;
}
