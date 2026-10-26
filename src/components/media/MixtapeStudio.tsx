'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaFilm, FaPlus, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { pickRchClipUrl } from '@/lib/rch-clips';

type Mixtape = { id: string; title: string; published_at: string | null };
type Clip = { id: string; body: string; created_at: string; url: string };

export function MixtapeStudio({ profileId }: { profileId: string }) {
  const { user, loading: authLoading } = useAuth();
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const router = useRouter();
  const ownProfile = user?.id === profileId;
  const [mixtapes, setMixtapes] = useState<Mixtape[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!db) { setLoading(false); setAvailable(false); return; }
    setLoading(true);
    const result = await db.from('rch_mixtapes')
      .select('id,title,published_at')
      .eq('owner_id', profileId).eq('status', 'published')
      .order('published_at', { ascending: false }).limit(12);
    if (result.error) {
      setAvailable(false); setLoading(false); return;
    }
    setMixtapes((result.data || []) as Mixtape[]);
    setAvailable(true);
    if (ownProfile) {
      const posts = await db.from('posts')
        .select('id,body,media_urls,created_at')
        .eq('author_id', profileId).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(100);
      if (!posts.error) {
        setClips((posts.data || []).flatMap((post: {
          id: string; body: string; created_at: string; media_urls: unknown
        }) => {
          const url = pickRchClipUrl(post.media_urls);
          return url ? [{ id: post.id, body: post.body, created_at: post.created_at, url }] : [];
        }));
      }
    }
    setLoading(false);
  }, [db, ownProfile, profileId]);

  useEffect(() => { void reload(); }, [reload]);

  const toggle = (postId: string) => {
    setSelected((current) => current.includes(postId)
      ? current.filter((id) => id !== postId)
      : current.length < 12 ? [...current, postId] : current);
  };

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || busy || !ownProfile || selected.length < 1 || selected.length > 12
      || title.trim().length < 3 || !rightsConfirmed) return;
    setBusy(true); setError('');
    const { data, error: failure } = await db.rpc('rch_publish_own_mixtape', {
      p_title: title.trim(), p_post_ids: selected, p_rights_confirmed: true,
    });
    setBusy(false);
    if (failure || typeof data !== 'string') {
      setError('Mixtape could not be published. Check your clip permissions and try again.');
      return;
    }
    setCreating(false); setTitle(''); setSelected([]); setRightsConfirmed(false);
    router.push('/mixtapes/' + data);
  };

  if (loading || authLoading) return <section aria-label="RCH Mixtapes" className="mt-6 rounded-xl border border-white/10 bg-white/[.025] p-5 text-sm text-white/60">Loading mixtapes…</section>;
  if (!available) return null;

  return <section aria-label="RCH Mixtapes" className="mt-6 space-y-3 rounded-xl border border-[#44484e] bg-[#141618] p-4 text-[#f5f5f3] sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <FaFilm className="text-[#ff768c]" aria-hidden="true" />
        <h2 className="font-display text-xl font-black uppercase">Mixtapes</h2>
      </div>
      {ownProfile && <button type="button" onClick={() => { setCreating((open) => !open); setError(''); }}
        aria-expanded={creating}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#c8102e] px-4 text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff768c]">
        {creating ? <FaXmark aria-hidden="true"/> : <FaPlus aria-hidden="true"/>}
        {creating ? 'Close' : 'Make mixtape'}
      </button>}
    </div>
    {mixtapes.length > 0 && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {mixtapes.map((mix) => <Link key={mix.id} href={'/mixtapes/' + mix.id}
        className="group flex min-h-20 items-center justify-between gap-3 rounded-lg border border-[#44484e] bg-[#202326] p-3 hover:border-[#ff768c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff768c]">
        <span className="min-w-0"><strong className="block truncate text-sm">{mix.title}</strong><span className="mt-1 block text-xs text-[#d0d1d4]">Watch mixtape</span></span>
        <FaArrowRight aria-hidden="true" className="shrink-0 text-[#ff768c]"/>
      </Link>)}
    </div>}
    {mixtapes.length === 0 && !creating && <p className="text-sm text-[#d0d1d4]">
      {ownProfile ? 'Your highlights deserve a reel. Collect your published clips here.' : 'No published mixtapes yet.'}
    </p>}
    {creating && ownProfile && <form onSubmit={(event) => void publish(event)} className="space-y-4 border-t border-[#44484e] pt-4">
      <div>
        <label htmlFor="rch-mixtape-title" className="mb-2 block text-xs font-bold uppercase text-[#d0d1d4]">Mixtape title</label>
        <input id="rch-mixtape-title" value={title} onChange={(event) => setTitle(event.target.value)}
          maxLength={80} placeholder="My best runs" required minLength={3}
          className="min-h-11 w-full rounded-lg border border-[#70747a] bg-[#0b0c0e] px-3 text-sm text-white placeholder:text-[#a6a8ad] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff768c]"/>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-[#d0d1d4]">Choose clips ({selected.length}/12)</p>
        {clips.length === 0 ? <p className="rounded-lg border border-dashed border-[#70747a] p-4 text-sm text-[#d0d1d4]">
          Post your first basketball video to the social timeline, then return here.
          <Link href="/social" className="ml-1 font-bold text-[#ff768c] underline">Go to Home</Link>
        </p> : <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
          {clips.map((clip) => <label key={clip.id} className={'flex cursor-pointer items-center gap-3 rounded-lg border p-3 ' +
            (selected.includes(clip.id) ? 'border-[#ff768c] bg-[#392028]' : 'border-[#44484e] bg-[#202326]')}>
            <input type="checkbox" checked={selected.includes(clip.id)} onChange={() => toggle(clip.id)}
              disabled={!selected.includes(clip.id) && selected.length >= 12}
              aria-label={'Select video from ' + new Date(clip.created_at).toLocaleDateString()}
              className="h-5 w-5 shrink-0 accent-[#c8102e]"/>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{clip.body?.trim() || 'Basketball video'}</span>
              <span className="block text-xs text-[#a6a8ad]">{new Date(clip.created_at).toLocaleDateString()}</span>
            </span>
            <FaFilm className="shrink-0 text-[#ff768c]" aria-hidden="true"/>
          </label>)}
        </div>}
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-[#44484e] p-3 text-xs leading-5 text-[#d0d1d4]">
        <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-[#c8102e]"/>
        <span>I own or have permission to publish these clips. Only my own published posts are eligible.</span>
      </label>
      {error && <p role="alert" className="text-sm text-[#ff98aa]">{error}</p>}
      <button type="submit" disabled={busy || !rightsConfirmed || selected.length === 0 || title.trim().length < 3}
        className="min-h-11 w-full rounded-lg bg-[#c8102e] px-5 text-sm font-bold text-white disabled:opacity-40">
        {busy ? 'Publishing…' : 'Publish mixtape'}
      </button>
    </form>}
  </section>;
}
