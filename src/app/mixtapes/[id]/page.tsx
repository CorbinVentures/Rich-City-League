'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaArrowRight, FaFilm, FaShareNodes, FaTrash } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { mixtapeOwnVideoUrl } from '@/lib/rch-mixtapes';

type Mixtape = { id: string; owner_id: string; title: string; status: string; published_at: string | null };
type Video = { id: string; body: string | null; clipUrl: string };
type Item = { post_id: string; sort_order: number };

export default function MixtapeWatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const { user } = useAuth();
  const [mix, setMix] = useState<Mixtape | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let live = true;
    if (!db || !id) { setError('Mixtape is unavailable.'); setLoading(false); return; }
    const load = async () => {
      const { data: mixtape, error: mixError } = await db.from('rch_mixtapes')
        .select('id,owner_id,title,status,published_at').eq('id', id)
        .eq('status', 'published').maybeSingle();
      if (mixError) throw mixError;
      if (!mixtape) { if (live) setError('This mixtape is unavailable or no longer public.'); return; }
      const { data: items, error: itemsError } = await db.from('rch_mixtape_items')
        .select('post_id,sort_order').eq('mixtape_id', mixtape.id)
        .order('sort_order', { ascending: true }).limit(12);
      if (itemsError) throw itemsError;
      const ids = (items || []).map((item: Item) => item.post_id);
      const { data: posts, error: postsError } = ids.length
        ? await db.from('posts').select('id,author_id,body,media_urls')
          .in('id', ids).eq('status', 'published')
        : { data: [], error: null };
      if (postsError) throw postsError;
      const eligible = new Map<string, Video>();
      (posts || []).forEach((post: { id: string; author_id: string; body: string | null; media_urls: unknown }) => {
        // Visibility is independently enforced by Post RLS, not just playlist RLS.
        if (post.author_id !== mixtape.owner_id) return;
        const clipUrl = mixtapeOwnVideoUrl(post.media_urls, mixtape.owner_id, process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (clipUrl) eligible.set(post.id, { id: post.id, body: post.body, clipUrl });
      });
      if (live) {
        setMix(mixtape as Mixtape);
        setVideos(ids.flatMap((postId: string) => eligible.has(postId) ? [eligible.get(postId)!] : []));
        setActiveIndex(0);
      }
    };
    setLoading(true); setError('');
    void load().catch(() => { if (live) setError('Unable to load this mixtape right now.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [db, id]);

  const share = async () => {
    if (!mix || typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: mix.title + ' | Rich City Hoops', url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setNotice('Mixtape link copied.'); }
      else setNotice('Share this page from your browser.');
    } catch { /* Cancelling a share is not a failure. */ }
  };

  const withdraw = async () => {
    if (!db || !mix || deleting || user?.id !== mix.owner_id) return;
    if (!window.confirm('Withdraw this mixtape? Your original social posts will remain published.')) return;
    setDeleting(true);
    const { error: failure } = await db.from('rch_mixtapes').delete().eq('id', mix.id).eq('owner_id', user.id);
    setDeleting(false);
    if (failure) { setError('Unable to withdraw this mixtape.'); return; }
    router.push('/social/profile/' + user.id + '?tab=highlights');
  };

  const active = videos[activeIndex] ?? null;

  return <main className="min-h-screen bg-[#0b0c0e] px-4 pb-28 pt-7 text-[#f5f5f3] sm:px-6">
    <div className="mx-auto max-w-3xl">
      <Link href={mix ? '/social/profile/' + mix.owner_id + '?tab=highlights' : '/social'}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#ff98aa]">
        <FaArrowLeft aria-hidden="true"/> {mix ? 'Player highlights' : 'Back to RCH'}
      </Link>
      {loading ? <div role="status" className="mt-5 rounded-xl border border-[#44484e] p-8">Loading mixtape…</div>
        : !mix ? <div className="mt-5 rounded-xl border border-[#44484e] bg-[#141618] p-8">
          <h1 className="font-display text-2xl font-black">Mixtape unavailable</h1>
          <p className="mt-3 text-sm text-[#d0d1d4]">{error || 'This mixtape is no longer accessible.'}</p>
        </div>
        : <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#ff768c]">RCH Mixtapes</p>
              <h1 className="mt-2 font-display text-3xl font-black uppercase sm:text-4xl">{mix.title}</h1>
              <p className="mt-2 text-xs text-[#d0d1d4]">{videos.length} accessible published {videos.length === 1 ? 'clip' : 'clips'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void share()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#70747a] px-4 text-sm font-bold">
                <FaShareNodes aria-hidden="true"/> Share
              </button>
              {user?.id === mix.owner_id && <button type="button" onClick={() => void withdraw()} disabled={deleting}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#70747a] px-4 text-sm font-bold text-[#ff98aa] disabled:opacity-50">
                <FaTrash aria-hidden="true"/> Withdraw
              </button>}
            </div>
          </div>
          {notice && <p role="status" className="mt-4 text-sm text-[#d0d1d4]">{notice}</p>}
          {error && <p role="alert" className="mt-4 text-sm text-[#ff98aa]">{error}</p>}
          {active ? <section className="mt-6 overflow-hidden rounded-xl border border-[#44484e] bg-[#141618]" aria-label="Mixtape video player">
            <video key={active.id} src={active.clipUrl} controls playsInline preload="none"
              className="mx-auto aspect-[9/14] max-h-[70dvh] w-full bg-black object-contain"
              aria-label={'Mixtape clip ' + (activeIndex + 1)}/>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <span className="text-xs text-[#d0d1d4]">Clip {activeIndex + 1} of {videos.length}</span>
                {active.body && <p className="mt-1 line-clamp-2 text-sm">{active.body}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
                  aria-label="Previous clip"
                  className="grid h-11 w-11 place-items-center rounded-lg border border-[#70747a] disabled:opacity-40"><FaArrowLeft/></button>
                <button type="button" disabled={activeIndex >= videos.length - 1}
                  onClick={() => setActiveIndex((index) => Math.min(videos.length - 1, index + 1))}
                  aria-label="Next clip"
                  className="grid h-11 w-11 place-items-center rounded-lg border border-[#70747a] disabled:opacity-40"><FaArrowRight/></button>
              </div>
            </div>
            <Link href={'/social/post/' + active.id}
              className="flex min-h-11 items-center gap-2 border-t border-[#44484e] px-4 text-sm font-bold text-[#ff98aa]">
              <FaFilm aria-hidden="true"/> Original post <FaArrowRight aria-hidden="true"/>
            </Link>
          </section> : <div className="mt-6 rounded-xl border border-[#44484e] bg-[#141618] p-8">
            <p className="text-sm text-[#d0d1d4]">No clips are currently accessible. Original posts may have been removed or made private.</p>
          </div>}
          <p className="mt-4 text-xs text-[#a6a8ad]">A mixtape is a collection of original RCH posts, not a verified game performance or a new REP award.</p>
        </>}
    </div>
  </main>;
}
