'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowRight, FaBasketball, FaCamera, FaPlay } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { courtPulseImageUrl, courtPulseRunIds } from '@/lib/court-pulse';

type CourtMoment = {
  id: string;
  author_id: string;
  body: string | null;
  media_urls: unknown;
  created_at: string;
  authorName: string | null;
};

/** Published posts attached to actual Runs at this outdoor court; never simulates attendance. */
export function CourtPulseFeed({ courtSlug }: { courtSlug: string }) {
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const [moments, setMoments] = useState<CourtMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!db || !courtSlug) { setLoading(false); setUnavailable(true); return; }
    let active = true;
    setLoading(true);
    setUnavailable(false);
    const load = async () => {
      // Reuse public, RLS-filtered Run and post records. Do not publish a new court activity ledger.
      const { data: runs, error: runError } = await db.from('runs').select('id')
        .eq('location_slug', courtSlug).order('starts_at', { ascending: false }).limit(100);
      if (runError) throw runError;
      const ids = courtPulseRunIds(runs);
      if (ids.length === 0) { if (active) setMoments([]); return; }
      const { data: posts, error: postError } = await db.from('posts')
        .select('id,author_id,body,media_urls,created_at')
        .in('run_id', ids).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(6);
      if (postError) throw postError;
      const authors: string[] = Array.from(new Set((posts || []).map((post: { author_id: string }) => post.author_id)));
      const { data: profiles, error: profileError } = authors.length
        ? await db.from('profiles').select('id,display_name,username').in('id', authors)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const byId = new Map<string, string>(
        (profiles || []).map((profile: { id: string; display_name: string | null; username: string | null }) =>
          [profile.id, profile.display_name || profile.username || 'RCH member'])
      );
      if (active) setMoments((posts || []).map((post: Omit<CourtMoment, 'authorName'>) =>
        ({ ...post, authorName: byId.get(post.author_id) || null })));
    };
    void load().catch(() => { if (active) setUnavailable(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courtSlug, db]);

  return <section id="rch-court-pulse" className="mt-7 scroll-mt-32" aria-label="Court Pulse: published basketball moments">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#ff768c]">From this court</p>
        <h2 className="mt-1 font-display text-2xl font-black uppercase text-[#f5f5f3]">Court Pulse</h2>
      </div>
      <Link href={'/runs?court=' + encodeURIComponent(courtSlug)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#44484e] px-3 text-xs font-bold text-[#f5f5f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff768c]">
        Find a game <FaArrowRight aria-hidden="true"/>
      </Link>
    </div>
    {loading ? <div role="status" className="rounded-lg border border-[#44484e] bg-[#141618] p-5 text-sm text-[#d0d1d4]">Loading real court activity…</div>
      : unavailable ? <div role="status" className="rounded-lg border border-[#44484e] bg-[#141618] p-5 text-sm text-[#d0d1d4]">Court moments are unavailable. You can still find upcoming games.</div>
      : moments.length === 0 ? <div className="flex items-center gap-3 rounded-lg border border-[#44484e] bg-[#141618] p-5">
        <FaBasketball className="shrink-0 text-[#ff768c]" aria-hidden="true"/>
        <p className="text-sm text-[#d0d1d4]">No published Run highlights from this court yet. Be part of the next game.</p>
      </div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {moments.map((moment) => {
          const image = courtPulseImageUrl(moment.media_urls);
          return <article key={moment.id} className="min-w-0 overflow-hidden rounded-lg border border-[#44484e] bg-[#141618]">
            {image && <Link href={'/social/post/' + moment.id} aria-label="Open published court post">
              <img src={image} alt="Published basketball moment" loading="lazy" className="aspect-video w-full object-cover"/>
            </Link>}
            <div className="p-4">
              <div className="mb-2 flex items-center gap-2 text-xs text-[#a6a8ad]">
                {image ? <FaCamera aria-hidden="true"/> : <FaPlay aria-hidden="true"/>}
                <span>Run-linked community post</span>
              </div>
              {moment.authorName ? <Link href={'/social/profile/' + moment.author_id} className="text-xs font-bold text-[#ff768c]">{moment.authorName}</Link>
                : <span className="text-xs font-bold text-[#d0d1d4]">Community post</span>}
              {moment.body && <p className="mt-2 line-clamp-2 break-words text-sm text-[#f5f5f3]">{moment.body}</p>}
              <Link href={'/social/post/' + moment.id} className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#f5f5f3]">
                View moment <FaArrowRight aria-hidden="true"/>
              </Link>
            </div>
          </article>;
        })}
      </div>}
    <p className="mt-2 text-xs text-[#a6a8ad]">Published Run-linked posts only. A post does not verify attendance or game results.</p>
  </section>;
}
