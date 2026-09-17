'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowRight, FaBasketball, FaBolt, FaBookmark, FaCheck, FaComment, FaImage, FaShareNodes, FaTrash, FaUserGroup, FaXmark } from 'react-icons/fa6';

const reactions = [
  { type: 'bucket', emoji: '🏀', label: 'Bucket' },
  { type: 'heat', emoji: '🔥', label: 'Heat' },
  { type: 'strong', emoji: '💪', label: 'Tough' },
  { type: 'locked', emoji: '🔒', label: 'Locked' },
  { type: 'money', emoji: '🎯', label: 'Pure' },
  { type: 'watch', emoji: '👀', label: 'Seen' },
  { type: 'champ', emoji: '🏆', label: 'Champ' },
];

type Author = { id?: string; display_name: string | null; username: string | null; avatar_url?: string | null; role?: string | null };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; author?: Author };
type Reaction = { user_id: string; post_id: string; type: string };
type Post = { id: string; author_id: string; body: string; media_urls: string[]; created_at: string; author?: Author; comments?: Comment[]; reactions?: Reaction[] };
type Story = { id: string; body: string | null; media_url?: string | null; expires_at: string; author_id?: string; author?: Author };

export default function SocialPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [story, setStory] = useState('');
  const [filter, setFilter] = useState<'all' | 'league' | 'players' | 'teams'>('all');
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase) {
      setLoading(false);
      setError('Social services are not configured.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: basePosts, error: postsError } = await supabase
        .from('posts')
        .select('id,author_id,body,media_urls,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
      if (postsError) throw postsError;

      const safePosts = (basePosts ?? []) as unknown as Array<Omit<Post, 'author' | 'comments' | 'reactions'>>;
      const postIds = safePosts.map((post) => post.id);
      const authorIds = [...new Set(safePosts.map((post) => post.author_id))];

      const [authorsResult, commentsResult, reactionsResult, storiesResult, followsResult, savedResult] = await Promise.all([
        authorIds.length ? supabase.from('profiles').select('id,display_name,username,avatar_url,role').in('id', authorIds) : Promise.resolve({ data: [], error: null }),
        postIds.length ? supabase.from('comments').select('id,post_id,author_id,body,created_at').in('post_id', postIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
        postIds.length ? supabase.from('reactions').select('post_id,user_id,type').in('post_id', postIds) : Promise.resolve({ data: [], error: null }),
        supabase.from('stories').select('id,body,media_url,expires_at,author_id').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20),
        user ? supabase.from('follows').select('following_id').eq('follower_id', user.id) : Promise.resolve({ data: [], error: null }),
        user ? supabase.from('saved_posts').select('post_id').eq('profile_id', user.id) : Promise.resolve({ data: [], error: null }),
      ]);

      const authors = (authorsResult.data ?? []) as unknown as Array<Author & { id: string }>;
      const authorMap = new Map(authors.map((author) => [author.id, author]));
      const comments = (commentsResult.data ?? []) as unknown as Comment[];
      const reactionsData = (reactionsResult.data ?? []) as unknown as Reaction[];
      const storyRows = (storiesResult.data ?? []) as unknown as Story[];

      setPosts(safePosts.map((post) => ({
        ...post,
        author: authorMap.get(post.author_id),
        comments: comments.filter((item) => item.post_id === post.id).map((item) => ({ ...item, author: authorMap.get(item.author_id) })),
        reactions: reactionsData.filter((item) => item.post_id === post.id),
      })));
      setStories(storyRows.map((item) => ({ ...item, author: authorMap.get(item.author_id ?? '') })));
      setFollowing(((followsResult.data ?? []) as Array<{ following_id: string }>).map((item) => item.following_id));
      setSaved(((savedResult.data ?? []) as Array<{ post_id: string }>).map((item) => item.post_id));
    } catch (loadError) {
      console.error('Unable to load the social timeline', loadError);
      setError(loadError instanceof Error ? loadError.message : 'We could not load the social timeline.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [supabase, user?.id]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('rcl-social-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user?.id]);

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !body.trim()) return;
    setError('');
    const { data, error: insertError } = await supabase.from('posts').insert({ author_id: user.id, body: body.trim(), media_urls: image.trim() ? [image.trim()] : [], status: 'published' } as never).select('id,author_id,body,media_urls,created_at').single();
    if (insertError) { setError(insertError.message || 'We could not publish that post.'); return; }
    setBody(''); setImage('');
    if (data) setPosts((current) => [{ ...(data as unknown as Post), author: { id: user.id, display_name: 'You', username: null, avatar_url: null, role: 'member' }, comments: [], reactions: [] }, ...current]);
  };

  const createStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !story.trim()) return;
    const { data, error: storyError } = await supabase.from('stories').insert({ author_id: user.id, story_type: 'text', body: story.trim(), audience: 'public' } as never).select('id,body,media_url,expires_at,author_id').single();
    if (storyError) { setError(storyError.message || 'We could not publish that story.'); return; }
    if (data) { setStories((current) => [{ ...(data as unknown as Story), author: { id: user.id, display_name: 'You', username: null } }, ...current]); setStory(''); }
  };

  const react = async (postId: string, type: string) => {
    if (!supabase || !user) return;
    const post = posts.find((item) => item.id === postId);
    const existing = post?.reactions?.find((item) => item.user_id === user.id);
    setPosts((current) => current.map((item) => {
      if (item.id !== postId) return item;
      const currentReactions = item.reactions ?? [];
      const withoutMine = currentReactions.filter((item) => item.user_id !== user.id);
      return { ...item, reactions: existing?.type === type ? withoutMine : [...withoutMine, { post_id: postId, user_id: user.id, type }] };
    }));
    if (existing) await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
    if (!existing || existing.type !== type) await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type } as never);
  };

  const toggleSave = async (postId: string) => {
    if (!supabase || !user) return;
    const isSaved = saved.includes(postId);
    setSaved((current) => isSaved ? current.filter((id) => id !== postId) : [...current, postId]);
    if (isSaved) await supabase.from('saved_posts').delete().eq('profile_id', user.id).eq('post_id', postId);
    else await supabase.from('saved_posts').insert({ profile_id: user.id, post_id: postId } as never);
  };

  const toggleFollow = async (profileId: string) => {
    if (!supabase || !user || profileId === user.id) return;
    const isFollowing = following.includes(profileId);
    setFollowing((current) => isFollowing ? current.filter((id) => id !== profileId) : [...current, profileId]);
    if (isFollowing) await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId);
    else await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId } as never);
  };

  const addComment = async (postId: string) => {
    if (!supabase || !user || !comment[postId]?.trim()) return;
    const text = comment[postId].trim();
    setComment((current) => ({ ...current, [postId]: '' }));
    const optimistic: Comment = { id: `local-${Date.now()}`, post_id: postId, author_id: user.id, body: text, created_at: new Date().toISOString(), author: { id: user.id, display_name: 'You', username: null } };
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...(post.comments ?? []), optimistic] } : post));
    const { error: commentError } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, body: text, parent_id: null } as never);
    if (commentError) { setError(commentError.message || 'We could not post that reply.'); void load(); }
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/social#post-${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Rich City Social', text: post.body.slice(0, 120), url });
      else { await navigator.clipboard.writeText(url); setError('Post link copied to your clipboard.'); setTimeout(() => setError(''), 2200); }
    } catch { /* User cancelled the share sheet. */ }
  };

  const viewStory = async (index: number) => {
    setStoryIndex(index);
    const item = stories[index];
    if (supabase && user && item) await supabase.from('story_views').upsert({ story_id: item.id, viewer_id: user.id } as never);
  };

  const filtered = useMemo(() => filter === 'all' ? posts : posts.filter((post) => {
    const text = post.body.toLowerCase();
    if (filter === 'league') return text.includes('league') || text.includes('rcl') || post.author?.role === 'staff';
    if (filter === 'players') return post.author?.role === 'player' || text.includes('player');
    return text.includes('team') || text.includes('game') || text.includes('hoop');
  }), [posts, filter]);

  return (
    <main className="min-h-screen bg-[#060a10] text-white pb-24">
      <section className="border-b border-white/10 bg-gradient-to-br from-rcl-navy/70 via-[#09111c] to-black">
        <Container maxWidth="xl" className="py-10 sm:py-14">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black tracking-[.28em] text-rcl-gold"><FaBolt />804 COMMUNITY NETWORK</p>
              <h1 className="mt-3 font-display text-5xl font-black uppercase sm:text-7xl">Rich City <span className="text-rcl-orange">Social.</span></h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/50">The basketball-first social home for Richmond. Follow players, share game-day moments, discover teams and stay connected to the league.</p>
            </div>
            <Link href="/players" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 py-3 text-xs font-black uppercase tracking-widest hover:border-rcl-orange/40">Explore players <FaArrowRight /></Link>
          </div>
        </Container>
      </section>

      <Container maxWidth="xl" className="mt-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <section className="rounded-3xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
              <div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">CITY STORIES</p><p className="mt-1 text-xs text-white/40">Moments disappear after 24 hours</p></div><span className="rounded-full bg-rcl-gold/10 px-3 py-1 text-[9px] font-black text-rcl-gold">{stories.length} LIVE</span></div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {user && <form onSubmit={createStory} className="min-w-44 rounded-2xl border border-rcl-orange/30 bg-rcl-orange/5 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-rcl-orange text-black"><FaBasketball /></div><input value={story} onChange={(e) => setStory(e.target.value)} maxLength={240} placeholder="Share a moment…" className="mt-3 w-full bg-transparent text-xs outline-none" /><button disabled={!story.trim()} className="mt-3 text-[9px] font-black tracking-widest text-rcl-orange disabled:opacity-30">POST STORY</button></form>}
                {stories.map((item, index) => <button key={item.id} onClick={() => void viewStory(index)} className="min-w-44 rounded-2xl border border-white/10 bg-gradient-to-br from-rcl-navy/80 to-black p-3 text-left transition hover:-translate-y-0.5 hover:border-rcl-orange/40"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-rcl-gold/40 bg-rcl-gold/10 text-xs font-black text-rcl-gold">{item.author?.display_name?.[0] ?? 'R'}</div><p className="mt-3 line-clamp-3 text-xs text-white/70">{item.body}</p><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-white/35">{item.author?.display_name ?? item.author?.username ?? 'RCL member'}</p></button>)}
              </div>
            </section>

            {user && <form onSubmit={createPost} className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5 shadow-xl"><div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rcl-orange text-black"><FaBasketball /></div><div className="min-w-0 flex-1"><p className="text-[9px] font-black tracking-[.2em] text-white/35">CREATE A POST</p><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="What is happening in the 804?" className="mt-2 min-h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-white/25" /><div className="flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center"><label className="flex flex-1 items-center gap-2 text-[10px] text-white/35"><FaImage /><input type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="Add photo / GIF URL" className="w-full bg-transparent outline-none" /></label><button disabled={!body.trim()} className="rounded-xl bg-rcl-orange px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40">Publish</button></div>{error && <p className="mt-2 break-words text-xs text-red-300">{error}</p>}</div></div></form>}

            <div className="mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">{[['all', 'For You'], ['league', '804 Now'], ['players', 'Players'], ['teams', 'Game Day']].map(([id, label]) => <button key={id} onClick={() => setFilter(id as typeof filter)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${filter === id ? 'bg-rcl-gold text-black' : 'border border-white/10 text-white/45 hover:text-white'}`}>{label}</button>)}</div>

            {error && !user && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-200">{error}</div>}

            <section className="mt-4 space-y-4">
              {loading ? <div className="h-72 animate-pulse rounded-3xl bg-white/[.03]" /> : filtered.map((post) => {
                const isFollowing = following.includes(post.author_id);
                const isSaved = saved.includes(post.id);
                return <article id={`post-${post.id}`} key={post.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-5 shadow-xl"><header className="flex items-center justify-between gap-3"><Link href={post.author?.username ? `/fans/${post.author.username}` : post.author_id ? `/players/${post.author_id}` : '#'} className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-rcl-orange to-rcl-gold text-sm font-black text-black">{post.author?.avatar_url ? <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" /> : post.author?.display_name?.[0] ?? 'R'}</div><div className="min-w-0"><p className="truncate text-sm font-black">{post.author?.display_name ?? 'RCL Member'}</p><p className="text-[9px] uppercase tracking-widest text-white/30">{post.author?.role ?? 'member'} · {new Date(post.created_at).toLocaleDateString()}</p></div></Link><div className="flex items-center gap-2">{user && post.author_id !== user.id && <button onClick={() => void toggleFollow(post.author_id)} className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${isFollowing ? 'border-rcl-orange/40 bg-rcl-orange/10 text-rcl-orange' : 'border-white/10 text-white/40'}`}>{isFollowing ? <span className="inline-flex items-center gap-1"><FaCheck /> Following</span> : 'Follow'}</button>}{user && post.author_id === user.id && <button onClick={async () => { const { error: archiveError } = await supabase?.from('posts').update({ status: 'archived' } as never).eq('id', post.id) ?? {}; if (archiveError) setError(archiveError.message); else setPosts((current) => current.filter((item) => item.id !== post.id)); }} aria-label="Archive post" className="text-white/25 hover:text-red-300"><FaTrash /></button>}</div></header><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/80">{post.body}</p>{post.media_urls?.[0] && <img src={post.media_urls[0]} alt="Post media" className="mt-4 max-h-[520px] w-full rounded-2xl object-cover" />}<div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">{reactions.map((item) => { const count = post.reactions?.filter((reaction) => reaction.type === item.type).length ?? 0; const mine = post.reactions?.some((reaction) => reaction.user_id === user?.id && reaction.type === item.type); return <button key={item.type} onClick={() => void react(post.id, item.type)} disabled={!user} aria-label={`${item.label} reaction`} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition ${mine ? 'border-rcl-orange/50 bg-rcl-orange/10' : 'border-white/10 bg-black/20 text-white/50 hover:border-white/25'}`}>{item.emoji} {count || ''}</button>; })}<button onClick={() => setOpenComments(openComments === post.id ? null : post.id)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black text-white/45"><FaComment /> {post.comments?.length ?? 0}</button><button onClick={() => void toggleSave(post.id)} disabled={!user} aria-label={isSaved ? 'Remove saved post' : 'Save post'} className={`rounded-full border p-2 transition ${isSaved ? 'border-rcl-gold/50 bg-rcl-gold/10 text-rcl-gold' : 'border-white/10 text-white/35 hover:text-white'}`}><FaBookmark /></button><button onClick={() => void sharePost(post)} aria-label="Share post" className="rounded-full border border-white/10 p-2 text-white/35 hover:text-white"><FaShareNodes /></button></div>{openComments === post.id && <div className="mt-4 border-t border-white/10 pt-4"><div className="space-y-3">{post.comments?.slice(-6).map((item) => <div key={item.id} className="rounded-xl bg-black/25 p-3"><p className="text-[10px] font-black text-rcl-gold">{item.author?.display_name ?? 'RCL Member'}</p><p className="mt-1 text-xs leading-5 text-white/60">{item.body}</p></div>)}</div>{user && <div className="mt-3 flex gap-2"><input value={comment[post.id] ?? ''} onChange={(e) => setComment((current) => ({ ...current, [post.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void addComment(post.id); } }} placeholder="Write a reply…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-rcl-orange" /><button onClick={() => void addComment(post.id)} disabled={!comment[post.id]?.trim()} className="rounded-xl bg-rcl-orange px-4 text-[9px] font-black uppercase text-black disabled:opacity-30">Reply</button></div>}</div>}</article>;
              })}
              {!loading && !filtered.length && <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center"><FaUserGroup className="mx-auto text-3xl text-white/15" /><p className="mt-4 font-display text-xl font-black uppercase">The feed is quiet.</p><p className="mt-2 text-xs text-white/35">{error || 'Be the first to put something on the board.'}</p></div>}
            </section>
          </div>

          <aside className="space-y-4"><div className="sticky top-24 rounded-3xl border border-white/10 bg-white/[.03] p-5"><p className="text-[9px] font-black tracking-[.2em] text-rcl-gold">RCL RIGHT NOW</p><div className="mt-5 space-y-3">{[['🏀', 'GAME CENTER', 'Scores, schedules & results', '/games'], ['🏆', 'LEADERBOARDS', 'Who is running the city?', '/leaderboards'], ['👥', 'COMMUNITIES', 'Find your basketball circle', '/communities'], ['⚡', 'THE LAB', 'Build your next workout', '/lab']].map(([icon, title, detail, href]) => <Link key={href} href={href} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 hover:border-rcl-orange/30"><span className="text-xl">{icon}</span><span><strong className="block text-xs font-black">{title}</strong><small className="mt-1 block text-[10px] text-white/35">{detail}</small></span></Link>)}</div></div></aside>
        </div>
      </Container>

      {storyIndex !== null && stories[storyIndex] && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setStoryIndex(null)}><div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-rcl-navy to-black p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}><button onClick={() => setStoryIndex(null)} aria-label="Close story" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/60 hover:text-white"><FaXmark /></button><div className="mb-8 h-1 rounded-full bg-white/10"><div className="h-full w-full rounded-full bg-rcl-orange" /></div><p className="text-[9px] font-black uppercase tracking-[.25em] text-rcl-gold">{stories[storyIndex].author?.display_name ?? 'RCL member'}</p><p className="mt-5 whitespace-pre-wrap text-2xl font-black leading-tight">{stories[storyIndex].body}</p><div className="mt-10 flex items-center justify-between"><button disabled={storyIndex === 0} onClick={() => void viewStory(Math.max(0, storyIndex - 1))} className="rounded-xl border border-white/10 px-4 py-2 text-[9px] font-black uppercase disabled:opacity-20">Previous</button><span className="text-[9px] font-black tracking-widest text-white/30">{storyIndex + 1} / {stories.length}</span><button disabled={storyIndex === stories.length - 1} onClick={() => void viewStory(Math.min(stories.length - 1, storyIndex + 1))} className="rounded-xl bg-rcl-orange px-4 py-2 text-[9px] font-black uppercase text-black disabled:opacity-20">Next</button></div></div></div>}
    </main>
  );
}
