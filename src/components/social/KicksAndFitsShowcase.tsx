'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaShoePrints, FaArrowRight } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Post = { id: string; body: string; created_at: string; author_id: string; media_urls: unknown };
const firstImage = (media: unknown, origin?: string): string | null => {
  if (!origin || !Array.isArray(media)) return null;
  try {
    const base = new URL(origin);
    for (const item of media) {
      if (typeof item !== 'string') continue;
      const url = new URL(item);
      if (base.origin === url.origin && url.protocol === 'https:' &&
        url.pathname.startsWith('/storage/v1/object/public/media/') &&
        /\.(png|jpe?g|webp|avif)$/i.test(url.pathname)) return item;
    }
  } catch { /* Invalid media is never displayed. */ }
  return null;
};

export function KicksAndFitsShowcase({ profileId }: { profileId: string }) {
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); setAvailable(false); return; }
    let active = true;
    const load = async () => {
      const {data: tags,error} = await db.from('rch_post_topics').select('post_id')
        .eq('author_id',profileId).eq('topic','kicks_fits')
        .order('created_at',{ascending:false}).limit(16);
      if (error) { if (active) setAvailable(false); return; }
      const ids = (tags || []).map((tag:{post_id:string}) => tag.post_id);
      if (!ids.length) { if (active) setPosts([]); return; }
      const result = await db.from('posts').select('id,body,created_at,author_id,media_urls')
        .in('id',ids).eq('author_id',profileId).eq('status','published');
      if (result.error) throw result.error;
      const mapped = new Map<string, Post>((result.data||[]).map((p:Post)=>[p.id,p]));
      if (active) setPosts(ids.flatMap((id:string)=>mapped.has(id)?[mapped.get(id)!]:[]));
    };
    void load().catch(()=>{if(active)setAvailable(false);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[db,profileId]);

  if (loading || authLoading || !available) return null;
  if (posts.length === 0 && user?.id !== profileId) return null;
  return <section aria-label="Kicks and Fits" className="mt-5 rounded-xl border border-[#44484e] bg-[#141618] p-4 text-[#f5f5f3] sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase"><FaShoePrints className="text-[#ff768c]" aria-hidden="true"/> Kicks & Fits</h2>
      {user?.id===profileId&&<Link href="/social?compose=1" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#ff98aa]">
        Share a fit <FaArrowRight aria-hidden="true"/>
      </Link>}
    </div>
    {posts.length ? <div className="grid gap-2 sm:grid-cols-2">
      {posts.slice(0,6).map(post=>{
        const image = firstImage(post.media_urls,process.env.NEXT_PUBLIC_SUPABASE_URL);
        return <Link key={post.id} href={'/social/post/'+post.id} className="block min-w-0 rounded-lg border border-[#44484e] bg-[#202326] p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ff768c]">
          {image&&<img src={image} alt="Member-published basketball lifestyle photo" loading="lazy" className="mb-2 aspect-video w-full rounded-md object-cover"/>}
          <span className="block line-clamp-2 break-words text-sm">{post.body}</span>
          <span className="mt-2 block text-xs text-[#a6a8ad]">View original post</span>
        </Link>;
      })}
    </div>:<p className="text-sm text-[#d0d1d4]">Share sneakers, uniforms, or game-day style from the Home composer.</p>}
    <p className="mt-3 text-xs text-[#a6a8ad]">Member posts and self-reported products; not sponsored endorsements.</p>
  </section>;
}
