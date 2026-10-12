'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaArrowDown, FaArrowUp, FaBookmark, FaCheck, FaComment, FaHeart,
  FaHouse, FaPause, FaPlay, FaPlus, FaShareNodes, FaTv, FaUserPlus,
  FaVolumeHigh, FaVolumeXmark, FaXmark
} from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { pickRchClipUrl, rankRchClips, type ClipSortMode } from '@/lib/rch-clips';

type Clip = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  url: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  reaction_count: number;
  comment_count: number;
  reacted: boolean;
  saved: boolean;
};
type ClipComment = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  display_name: string;
};

const pageSize = 200;
const buttonClass = 'grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-[#101923]/75 text-white backdrop-blur-md transition hover:bg-[#253d58] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400';

export default function RchClipsFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(true), []);
  const db = supabase as any;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [mode, setMode] = useState<ClipSortMode>('for-you');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [manualPaused, setManualPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [commentPost, setCommentPost] = useState<string | null>(null);
  const [comments, setComments] = useState<ClipComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!db) { setError('The video feed is not available right now.'); setLoading(false); return; }
      setLoading(true);
      setError('');
      const postsQuery = db.from('posts')
        .select('id,author_id,body,media_urls,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1);
      const [postsResult, followsResult, savedResult] = await Promise.all([
        postsQuery,
        user ? db.from('follows').select('following_id').eq('follower_id', user.id).limit(1000) : Promise.resolve({ data: [] }),
        user ? db.from('saved_posts').select('post_id').eq('profile_id', user.id).limit(1000) : Promise.resolve({ data: [] })
      ]);
      if (cancelled) return;
      if (postsResult.error) { setError('Could not load clips. Try refreshing the page.'); setLoading(false); return; }
      const rows = postsResult.data ?? [];
      const videos = rows.map((post: any) => ({ ...post, url: pickRchClipUrl(post.media_urls) })).filter((post: any) => Boolean(post.url));
      const ids = videos.map((post: any) => post.id as string);
      const authors = Array.from(new Set(videos.map((post: any) => post.author_id as string)));
      const [profilesResult, reactionsResult, commentsResult] = await Promise.all([
        authors.length ? db.from('profiles').select('id,display_name,username,avatar_url').in('id', authors) : Promise.resolve({ data: [] }),
        ids.length ? db.from('reactions').select('post_id,user_id').in('post_id', ids).limit(10000) : Promise.resolve({ data: [] }),
        ids.length ? db.from('comments').select('post_id').in('post_id', ids).limit(10000) : Promise.resolve({ data: [] })
      ]);
      if (cancelled) return;
      const profiles = new Map<string, any>((profilesResult.data ?? []).map((profile: any) => [profile.id, profile]));
      const saved = new Set<string>((savedResult.data ?? []).map((row: any) => row.post_id));
      const count = (list: any[]) => {
        const result = new Map<string, number>();
        list.forEach((item) => result.set(item.post_id, (result.get(item.post_id) ?? 0) + 1));
        return result;
      };
      const reactions = reactionsResult.data ?? [];
      const reactionCount = count(reactions);
      const commentCount = count(commentsResult.data ?? []);
      const mine = new Set(reactions.filter((row: any) => row.user_id === user?.id).map((row: any) => row.post_id));
      const next: Clip[] = videos.map((post: any) => {
        const author = profiles.get(post.author_id);
        return {
          id: post.id, author_id: post.author_id, body: post.body ?? '', created_at: post.created_at, url: post.url,
          display_name: author?.display_name || author?.username || 'RCH Member',
          username: author?.username ?? null, avatar_url: author?.avatar_url ?? null,
          reaction_count: reactionCount.get(post.id) ?? 0, comment_count: commentCount.get(post.id) ?? 0,
          reacted: mine.has(post.id), saved: saved.has(post.id)
        };
      });
      setClips(next);
      setFollows((followsResult.data ?? []).map((row: any) => row.following_id));
      setHasMore(rows.length === pageSize);
      setPage(0);
      setLoading(false);
    };
    void load().catch(() => { if (!cancelled) { setError('Could not load clips. Try refreshing the page.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [db, user?.id]);

  const visibleClips = useMemo(() => rankRchClips(clips, mode, follows, user?.id), [clips, mode, follows, user?.id]);

  useEffect(() => {
    const deepLink = new URLSearchParams(window.location.search).get('post');
    const matchingId = deepLink && visibleClips.some((clip) => clip.id === deepLink) ? deepLink : null;
    if (!visibleClips.length) { setActiveId(null); return; }
    setActiveId((current) => current && visibleClips.some((clip) => clip.id === current) ? current : matchingId || visibleClips[0].id);
  }, [visibleClips]);

  useEffect(() => {
    const view = viewportRef.current;
    if (!view || !visibleClips.length) return;
    const observer = new IntersectionObserver((entries) => {
      const best = entries.filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (best) setActiveId((best.target as HTMLElement).dataset.clipId || null);
    }, { root: view, threshold: [0.6, 0.8] });
    view.querySelectorAll('[data-clip-id]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [visibleClips]);

  useEffect(() => {
    const view = viewportRef.current;
    if (!view) return;
    view.querySelectorAll<HTMLVideoElement>('video[data-video-id]').forEach((video) => {
      const active = video.dataset.videoId === activeId;
      video.muted = muted;
      if (active && !manualPaused && !commentPost) {
        const request = video.play();
        if (request) void request.catch(() => { /* Browser may require a tap to play. */ });
      } else video.pause();
    });
  }, [activeId, manualPaused, muted, commentPost, visibleClips]);

  useEffect(() => { setManualPaused(false); }, [activeId]);

  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        goTo(event.key === 'ArrowDown' ? 1 : -1);
      }
      if (event.key.toLowerCase() === 'm') setMuted((current) => !current);
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  });

  const goTo = (step: number) => {
    const active = visibleClips.findIndex((clip) => clip.id === activeId);
    const next = visibleClips[Math.max(0, Math.min(visibleClips.length - 1, active + step))];
    if (next) viewportRef.current?.querySelector<HTMLElement>('[data-clip-id="' + next.id + '"]')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const changeMode = (nextMode: ClipSortMode) => {
    setMode(nextMode);
    setActiveId(null);
    viewportRef.current?.scrollTo({ top: 0 });
  };

  const signIn = () => router.push('/auth/sign-in?redirect=' + encodeURIComponent('/clips'));
  const toggleReaction = async (clip: Clip) => {
    if (!user) { signIn(); return; }
    if (!db) return;
    setClips((current) => current.map((row) => row.id === clip.id ? { ...row, reacted: !clip.reacted, reaction_count: Math.max(0, row.reaction_count + (clip.reacted ? -1 : 1)) } : row));
    const result = clip.reacted
      ? await db.from('reactions').delete().eq('post_id', clip.id).eq('user_id', user.id)
      : await db.from('reactions').insert({ post_id: clip.id, user_id: user.id, type: 'bucket' });
    if (result.error) {
      setClips((current) => current.map((row) => row.id === clip.id ? { ...row, reacted: clip.reacted, reaction_count: clip.reaction_count } : row));
      setError('Reaction could not be saved.');
    }
  };
  const toggleSaved = async (clip: Clip) => {
    if (!user) { signIn(); return; }
    if (!db) return;
    setClips((current) => current.map((row) => row.id === clip.id ? { ...row, saved: !clip.saved } : row));
    const result = clip.saved
      ? await db.from('saved_posts').delete().eq('post_id', clip.id).eq('profile_id', user.id)
      : await db.from('saved_posts').insert({ post_id: clip.id, profile_id: user.id });
    if (result.error) { setClips((current) => current.map((row) => row.id === clip.id ? { ...row, saved: clip.saved } : row)); setError('Could not update saved clips.'); }
  };
  const toggleFollow = async (clip: Clip) => {
    if (!user) { signIn(); return; }
    if (!db || user.id === clip.author_id) return;
    const followed = follows.includes(clip.author_id);
    setFollows((current) => followed ? current.filter((id) => id !== clip.author_id) : [...current, clip.author_id]);
    const result = followed
      ? await db.from('follows').delete().eq('following_id', clip.author_id).eq('follower_id', user.id)
      : await db.from('follows').insert({ following_id: clip.author_id, follower_id: user.id });
    if (result.error) { setFollows((current) => followed ? [...current, clip.author_id] : current.filter((id) => id !== clip.author_id)); setError('Could not update follow.'); }
  };

  const share = async (clip: Clip) => {
    const url = window.location.origin + '/clips?post=' + encodeURIComponent(clip.id);
    try {
      if (navigator.share) await navigator.share({ title: 'RCH Clips', text: clip.body.slice(0, 120), url });
      else { await navigator.clipboard.writeText(url); setError('Clip link copied.'); }
    } catch (issue) {
      if (issue instanceof Error && issue.name === 'AbortError') return;
      setError('Sharing is unavailable on this device.');
    }
  };

  const openComments = async (clip: Clip) => {
    if (!db) return;
    setCommentPost(clip.id);
    setCommentLoading(true);
    setComments([]);
    setCommentDraft('');
    const result = await db.from('comments').select('id,author_id,body,created_at').eq('post_id', clip.id).order('created_at', { ascending: false }).limit(100);
    if (result.error) { setError('Could not load comments.'); setCommentLoading(false); return; }
    const rows = result.data ?? [];
    const authorIds = Array.from(new Set<string>(rows.map((row: any) => row.author_id)));
    const authors = authorIds.length ? await db.from('profiles').select('id,display_name,username').in('id', authorIds) : { data: [] };
    const authorMap = new Map<string, string>((authors.data ?? []).map((profile: any) => [profile.id, profile.display_name || profile.username || 'RCH Member']));
    setComments(rows.map((row: any) => ({ ...row, display_name: authorMap.get(row.author_id) || 'RCH Member' })));
    setCommentLoading(false);
  };

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) { signIn(); return; }
    const body = commentDraft.trim();
    if (!db || !commentPost || !body || commentBusy) return;
    setCommentBusy(true);
    const result = await db.from('comments').insert({ post_id: commentPost, author_id: user.id, body, parent_id: null })
      .select('id,author_id,body,created_at').single();
    if (result.error) setError('Could not post comment.');
    else {
      setComments((current) => [{ ...result.data, display_name: 'You' }, ...current]);
      setClips((current) => current.map((clip) => clip.id === commentPost ? { ...clip, comment_count: clip.comment_count + 1 } : clip));
      setCommentDraft('');
    }
    setCommentBusy(false);
  };

  const loadMore = async () => {
    if (!db || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const { data, error: nextError } = await db.from('posts')
      .select('id,author_id,body,media_urls,created_at').eq('status', 'published')
      .order('created_at', { ascending: false }).range(nextPage * pageSize, (nextPage + 1) * pageSize - 1);
    if (nextError) setError('Could not load more clips.');
    else {
      const videos = (data ?? []).map((post: any) => ({ ...post, url: pickRchClipUrl(post.media_urls) })).filter((post: any) => post.url);
      const authors = Array.from(new Set<string>(videos.map((post: any) => post.author_id)));
      const ids = videos.map((post: any) => post.id);
      const [profiles, reacts, commentRows] = await Promise.all([
        authors.length ? db.from('profiles').select('id,display_name,username,avatar_url').in('id', authors) : Promise.resolve({ data: [] }),
        ids.length ? db.from('reactions').select('post_id,user_id').in('post_id', ids) : Promise.resolve({ data: [] }),
        ids.length ? db.from('comments').select('post_id').in('post_id', ids) : Promise.resolve({ data: [] })
      ]);
      const profileMap = new Map<string, any>((profiles.data ?? []).map((p: any) => [p.id, p]));
      const reactions = reacts.data ?? [];
      const commentList = commentRows.data ?? [];
      const counts = (rows: any[], id: string) => rows.filter((row) => row.post_id === id).length;
      setClips((existing) => {
        const already = new Set(existing.map((clip) => clip.id));
        return [...existing, ...videos.filter((post: any) => !already.has(post.id)).map((post: any) => ({
          id: post.id, author_id: post.author_id, body: post.body || '', created_at: post.created_at, url: post.url,
          display_name: profileMap.get(post.author_id)?.display_name || profileMap.get(post.author_id)?.username || 'RCH Member',
          username: profileMap.get(post.author_id)?.username ?? null, avatar_url: profileMap.get(post.author_id)?.avatar_url ?? null,
          reaction_count: counts(reactions, post.id), comment_count: counts(commentList, post.id),
          reacted: reactions.some((r: any) => r.post_id === post.id && r.user_id === user?.id), saved: false
        }))];
      });
      setPage(nextPage);
      setHasMore((data ?? []).length === pageSize);
    }
    setLoadingMore(false);
  };

  return (
    <main className="relative flex h-[100dvh] w-full overflow-hidden bg-[#06101c] text-white" aria-label="RCH Clips video feed">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-[#030912]/95 to-transparent px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <Link href="/social" className="pointer-events-auto flex items-center gap-2 text-sm font-black text-white" aria-label="Back to RCH Home">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/25 bg-white/10 font-display text-xl">R</span>
          <span>RCH <span className="text-blue-300">CLIPS</span></span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/media" className="rounded-full border border-white/20 bg-black/50 px-3 py-2 text-xs font-semibold text-white"><FaTv className="mr-1 inline"/> RCH TV</Link>
          <Link href="/create/social?mode=clip" className="rounded-full bg-blue-500 px-3 py-2 text-xs font-black text-white"><FaPlus className="mr-1 inline"/> Create</Link>
        </div>
      </div>
      <div className="absolute left-1/2 top-[max(4.75rem,calc(env(safe-area-inset-top)+4rem))] z-30 flex -translate-x-1/2 gap-5 rounded-full border border-white/10 bg-black/40 px-5 py-2 text-sm font-bold backdrop-blur-lg">
        {(['for-you', 'following', 'trending'] as ClipSortMode[]).map((item) => (
          <button key={item} type="button" aria-pressed={mode === item} onClick={() => changeMode(item)} className={mode === item ? 'border-b-2 border-blue-400 pb-1 text-white' : 'pb-1 text-white/65'}>
            {item === 'for-you' ? 'For You' : item === 'following' ? 'Following' : 'Trending'}
          </button>
        ))}
      </div>

      <div className="pointer-events-none hidden flex-1 items-center justify-center px-8 xl:flex">
        <div className="max-w-xs rounded-3xl border border-white/10 bg-white/[.04] p-6">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">The tape starts here</p>
          <h1 className="mt-3 text-3xl font-black">Your game deserves an audience.</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">Watch Virginia basketball, meet the players, react to moments, and build a name through real highlights.</p>
          <Link href="/create/social?mode=clip" className="pointer-events-auto mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white"><FaPlus/> Drop a clip</Link>
        </div>
      </div>

      <section ref={viewportRef} aria-label="Basketball clips" className="mx-auto h-full w-full max-w-[550px] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:shrink-0 xl:border-x xl:border-white/15">
        {loading ? <div className="grid h-full place-items-center text-center text-white/70"><div><span className="mx-auto mb-4 block h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-blue-400"/><p>Loading basketball clips…</p></div></div> :
          visibleClips.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className="mb-5 text-6xl" aria-hidden="true">🏀</span>
              <h2 className="text-3xl font-black">{mode === 'following' ? 'Your players are up next.' : 'The court is ready.'}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">{mode === 'following' ? 'Follow players and creators to see their clips here.' : 'No native basketball videos have been published yet. Be the first to put a play on the map.'}</p>
              <Link href="/create/social?mode=clip" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-500 px-6 text-sm font-black text-white"><FaPlus/> Upload the first clip</Link>
              <Link href="/social" className="mt-4 text-sm text-blue-200">Explore the community</Link>
            </div>
          ) : <>
            {visibleClips.map((clip, index) => (
              <article key={clip.id} data-clip-id={clip.id} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
                <video
                  data-video-id={clip.id}
                  src={clip.url}
                  playsInline
                  loop
                  muted={muted}
                  preload={Math.abs(index - Math.max(visibleClips.findIndex((row) => row.id === activeId), 0)) <= 1 ? 'metadata' : 'none'}
                  className="absolute inset-0 h-full w-full object-contain"
                  aria-label={'Basketball clip from ' + clip.display_name}
                  onClick={() => setManualPaused((value) => !value)}
                  onError={() => setError('This clip could not be played. Try another video.')}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black via-black/40 to-transparent"/>
                <div className="absolute right-3 bottom-[calc(10.5rem+env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-4 sm:right-5">
                  <Link href={'/social/profile/' + clip.author_id} aria-label={'View ' + clip.display_name + ' profile'} className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#152f48] text-xl font-bold">
                    {clip.avatar_url ? <img src={clip.avatar_url} alt="" className="h-full w-full object-cover"/> : clip.display_name.slice(0, 1).toUpperCase()}
                  </Link>
                  {user?.id !== clip.author_id && <button className="-mt-6 grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-white" onClick={() => void toggleFollow(clip)} aria-label={follows.includes(clip.author_id) ? 'Unfollow creator' : 'Follow creator'}>{follows.includes(clip.author_id) ? <FaCheck size={11}/> : <FaPlus size={11}/>}</button>}
                  <div className="flex flex-col items-center"><button className={buttonClass} onClick={() => void toggleReaction(clip)} aria-label={clip.reacted ? 'Remove reaction' : 'React to clip'} aria-pressed={clip.reacted}><FaHeart size={19} className={clip.reacted ? 'text-rose-400' : 'text-white'}/></button><span className="mt-1 text-xs font-bold">{clip.reaction_count}</span></div>
                  <div className="flex flex-col items-center"><button className={buttonClass} onClick={() => void openComments(clip)} aria-label="View comments"><FaComment size={19}/></button><span className="mt-1 text-xs font-bold">{clip.comment_count}</span></div>
                  <button className={buttonClass} onClick={() => void toggleSaved(clip)} aria-pressed={clip.saved} aria-label={clip.saved ? 'Unsave clip' : 'Save clip'}><FaBookmark size={19} className={clip.saved ? 'text-blue-300' : 'text-white'}/></button>
                  <button className={buttonClass} onClick={() => void share(clip)} aria-label="Share clip"><FaShareNodes size={19}/></button>
                  <button className={buttonClass} onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute video' : 'Mute video'}>{muted ? <FaVolumeXmark size={19}/> : <FaVolumeHigh size={19}/>}</button>
                </div>
                <div className="absolute bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-4 right-20 z-10 sm:left-6">
                  <Link href={'/social/profile/' + clip.author_id} className="text-base font-black text-white hover:underline">@{clip.username || clip.display_name}</Link>
                  <p className="mt-2 max-h-28 overflow-y-auto whitespace-pre-line text-sm leading-5 text-white/90">{clip.body.replace(/#RCLClip\b/gi, '#RCHClips')}</p>
                  <Link href={'/social/profile/' + clip.author_id + '?tab=highlights'} className="mt-3 inline-flex gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"><FaPlay/> The Tape · Player profile</Link>
                </div>
                <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-4 z-20 flex gap-4 text-xs font-bold text-white/85">
                  <button onClick={() => setManualPaused((value) => !value)} className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-2">{manualPaused ? <FaPlay/> : <FaPause/>} {manualPaused ? 'Play' : 'Pause'}</button>
                  <span className="rounded-full bg-black/50 px-3 py-2">{index + 1} / {visibleClips.length}</span>
                </div>
              </article>
            ))}
            {hasMore && <div className="grid h-40 snap-start place-items-center bg-[#06101c]"><button onClick={() => void loadMore()} disabled={loadingMore} className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold">{loadingMore ? 'Loading…' : 'Load more clips'}</button></div>}
          </>}
      </section>

      <div className="pointer-events-none hidden flex-1 flex-col items-start justify-center gap-5 px-8 xl:flex">
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-300">Discover • React • Connect</p>
        <p className="max-w-xs text-2xl font-extrabold">The basketball community in motion.</p>
        <Link href="/media" className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white"><FaTv/> Watch RCH TV</Link>
        <Link href="/social" className="pointer-events-auto inline-flex items-center gap-2 text-sm text-blue-200"><FaHouse/> Back to your feed</Link>
        {visibleClips.length > 1 && <div className="pointer-events-auto flex gap-3"><button onClick={() => goTo(-1)} className={buttonClass} aria-label="Previous clip"><FaArrowUp/></button><button onClick={() => goTo(1)} className={buttonClass} aria-label="Next clip"><FaArrowDown/></button></div>}
      </div>

      {error && <div role="status" className="absolute bottom-16 left-1/2 z-50 flex w-[min(92vw,460px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-white/20 bg-[#162337] p-3 text-sm text-white shadow-2xl"><span className="flex-1">{error}</span><button aria-label="Dismiss notice" onClick={() => setError('')}><FaXmark/></button></div>}

      {commentPost && <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/55 sm:items-center" onClick={() => setCommentPost(null)}>
        <section role="dialog" aria-modal="true" aria-label="Clip comments" onClick={(e) => e.stopPropagation()} className="flex h-[min(80dvh,680px)] w-full max-w-lg flex-col rounded-t-3xl bg-white text-[#0f2547] shadow-2xl sm:rounded-3xl">
          <div className="flex items-center justify-between border-b border-[#d9e4ef] px-5 py-4"><h2 className="font-bold">Comments</h2><button onClick={() => setCommentPost(null)} aria-label="Close comments" className="grid h-10 w-10 place-items-center rounded-full bg-[#edf4fa]"><FaXmark/></button></div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5" aria-live="polite">
            {commentLoading ? <p>Loading comments…</p> : comments.length ? comments.map((entry) => <div key={entry.id} className="flex gap-3"><Link href={'/social/profile/' + entry.author_id} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf4fa] text-blue-600"><FaUserPlus/></Link><div><Link className="text-sm font-bold text-[#0f2547]" href={'/social/profile/' + entry.author_id}>{entry.display_name}</Link><p className="mt-1 whitespace-pre-line text-sm text-[#344860]">{entry.body}</p></div></div>) : <p className="text-sm text-[#64748b]">No comments yet. Start the conversation.</p>}
          </div>
          <form onSubmit={(e) => void submitComment(e)} className="flex gap-2 border-t border-[#d9e4ef] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <input aria-label="Write a comment" placeholder={user ? 'Add a basketball take…' : 'Sign in to comment'} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} maxLength={1000} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#d9e4ef] bg-[#f6f9fc] px-3 text-sm text-[#0f2547] outline-blue-500"/>
            <button disabled={commentBusy || !commentDraft.trim()} className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">{commentBusy ? 'Posting…' : 'Post'}</button>
          </form>
        </section>
      </div>}
    </main>
  );
}
