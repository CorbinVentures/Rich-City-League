'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowRight, FaBasketball, FaBolt, FaBookmark, FaCheck, FaComment, FaCompass, FaFire, FaHeart, FaImage, FaMagnifyingGlass, FaPeopleGroup, FaPlay, FaPlus, FaShareNodes, FaTrash, FaUserGroup, FaXmark } from 'react-icons/fa6';

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
type Tab = 'feed' | 'discover' | 'runs' | 'highlights' | 'communities' | 'messages' | 'notifications';

const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'feed', label: 'Feed', icon: <FaBolt /> },
  { id: 'discover', label: 'Discover', icon: <FaCompass /> },
  { id: 'runs', label: 'Runs', icon: <FaBasketball /> },
  { id: 'highlights', label: 'Highlights', icon: <FaPlay /> },
  { id: 'communities', label: 'Communities', icon: <FaPeopleGroup /> },
  { id: 'messages', label: 'Messages', icon: <FaComment /> },
  { id: 'notifications', label: 'Notifications', icon: <FaHeart /> },
];

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
  const [filter, setFilter] = useState<'all' | 'following' | 'runs' | 'highlights' | 'players' | 'teams' | 'communities'>('all');
  const [tab, setTab] = useState<Tab>('feed');
  const [search, setSearch] = useState('');
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);

  const load = async () => {
    if (!supabase) { setLoading(false); setError('Social services are not configured.'); return; }
    setLoading(true); setError('');
    try {
      const { data: basePosts, error: postsError } = await supabase.from('posts').select('id,author_id,body,media_urls,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(100);
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
      setPosts(safePosts.map((post) => ({ ...post, author: authorMap.get(post.author_id), comments: comments.filter((item) => item.post_id === post.id).map((item) => ({ ...item, author: authorMap.get(item.author_id) })), reactions: reactionsData.filter((item) => item.post_id === post.id) })));
      setStories(storyRows.map((item) => ({ ...item, author: authorMap.get(item.author_id ?? '') })));
      setFollowing(((followsResult.data ?? []) as Array<{ following_id: string }>).map((item) => item.following_id));
      setSaved(((savedResult.data ?? []) as Array<{ post_id: string }>).map((item) => item.post_id));
    } catch (loadError) {
      console.error('Unable to load the social timeline', loadError);
      setError(loadError instanceof Error ? loadError.message : 'We could not load the social timeline.');
      setPosts([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [supabase, user?.id]);
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('rcl-social-live').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, user?.id]);

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !body.trim()) return;
    setError('');
    const { data, error: insertError } = await supabase.from('posts').insert({ author_id: user.id, body: body.trim(), media_urls: image.trim() ? [image.trim()] : [], status: 'published' } as never).select('id,author_id,body,media_urls,created_at').single();
    if (insertError) { setError(insertError.message || 'We could not publish that post.'); return; }
    setBody(''); setImage(''); setComposerOpen(false);
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
      const withoutMine = (item.reactions ?? []).filter((reaction) => reaction.user_id !== user.id);
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
    try { if (navigator.share) await navigator.share({ title: 'Rich City Social', text: post.body.slice(0, 120), url }); else { await navigator.clipboard.writeText(url); setError('Post link copied to your clipboard.'); setTimeout(() => setError(''), 2200); } } catch { /* cancelled */ }
  };

  const viewStory = async (index: number) => {
    setStoryIndex(index);
    const item = stories[index];
    if (supabase && user && item) await supabase.from('story_views').upsert({ story_id: item.id, viewer_id: user.id } as never);
  };

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      const text = post.body.toLowerCase();
      const author = `${post.author?.display_name ?? ''} ${post.author?.username ?? ''}`.toLowerCase();
      if (query && !text.includes(query) && !author.includes(query)) return false;
      if (filter === 'all') return true;
      if (filter === 'following') return following.includes(post.author_id) || post.author_id === user?.id;
      if (filter === 'runs') return /run|pickup|court|hooping|5v5|3v3|1v1/.test(text);
      if (filter === 'highlights') return (post.media_urls?.length ?? 0) > 0 || /highlight|bucket|dunk|game winner/.test(text);
      if (filter === 'players') return post.author?.role === 'player' || /player|guard|forward|center/.test(text);
      if (filter === 'teams') return /team|roster|squad|club/.test(text);
      return /community|804|richmond|neighborhood/.test(text);
    });
  }, [posts, filter, search, following, user?.id]);

  const trending = useMemo(() => {
    const words = new Map<string, number>();
    posts.forEach((post) => post.body.toLowerCase().split(/\s+/).forEach((word) => {
      const clean = word.replace(/[^a-z0-9#]/g, '');
      if (clean.length >= 4 && !['that', 'this', 'with', 'from', 'game', 'just', 'have', 'your'].includes(clean)) words.set(clean, (words.get(clean) ?? 0) + 1);
    }));
    return [...words.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

  return (
    <main className="min-h-screen bg-[#05080d] text-white pb-28">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05080d]/95 backdrop-blur-xl">
        <Container maxWidth="xl" className="flex h-16 items-center gap-4">
          <Link href="/" className="hidden items-center gap-2 sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rcl-orange text-black"><FaBasketball /></span><span className="font-display text-lg font-black uppercase tracking-tight">RCL <span className="text-rcl-orange">Social</span></span></Link>
          <div className="relative min-w-0 flex-1 md:max-w-xl"><FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players, teams, runs…" className="w-full rounded-2xl border border-white/10 bg-white/[.04] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-rcl-orange/50" /></div>
          {user ? <button onClick={() => setComposerOpen(true)} className="hidden rounded-xl bg-rcl-orange px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black sm:inline-flex sm:items-center sm:gap-2"><FaPlus /> Create</button> : <Link href="/auth/sign-in" className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest">Sign in</Link>}
        </Container>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#101a2a] via-[#071019] to-black">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,124,0,.25),transparent_35%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,.08),transparent_25%)]" />
        <Container maxWidth="xl" className="relative py-9 sm:py-12"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 text-[9px] font-black tracking-[.3em] text-rcl-gold"><FaBolt /> REAL PEOPLE · REAL GAMES · REAL RICHMOND</p><h1 className="mt-3 font-display text-4xl font-black uppercase sm:text-6xl">Basketball <span className="text-rcl-orange">Lives Here.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Your RCL home base. Find your people, discover what is happening on the courts, share your game and turn online connections into real basketball.</p></div><div className="flex gap-2"><Link href="/runs" className="inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">Find a run <FaArrowRight /></Link><Link href="/players" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest">Players</Link></div></div></Container>
      </section>

      <Container maxWidth="xl" className="mt-5"><div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)_285px]">
        <aside className="hidden lg:block"><nav className="sticky top-24 space-y-1">{tabs.map((item) => <button key={item.id} onClick={() => item.id === 'runs' ? (window.location.href = '/runs') : setTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold transition ${tab === item.id ? 'bg-rcl-orange text-black' : 'text-white/55 hover:bg-white/[.05] hover:text-white'}`}>{item.icon}<span>{item.label}</span></button>)}<div className="my-4 border-t border-white/10" /><Link href="/lab" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-white/55 hover:bg-white/[.05] hover:text-white"><FaBasketball /> The Lab</Link><Link href="/games" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-white/55 hover:bg-white/[.05] hover:text-white"><FaPlay /> Game Center</Link></nav></aside>

        <div className="min-w-0">
          {tab === 'feed' ? <>
            <section className="mb-5 rounded-3xl border border-white/10 bg-white/[.03] p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.22em] text-rcl-orange">CITY STORIES</p><p className="mt-1 text-xs text-white/35">24 hours. One city. Keep up.</p></div><span className="rounded-full bg-rcl-gold/10 px-3 py-1 text-[9px] font-black text-rcl-gold">{stories.length} LIVE</span></div><div className="mt-4 flex gap-3 overflow-x-auto pb-1">{user && <form onSubmit={createStory} className="min-w-40 rounded-2xl border border-rcl-orange/30 bg-rcl-orange/5 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-rcl-orange text-black"><FaPlus /></div><input value={story} onChange={(e) => setStory(e.target.value)} maxLength={240} placeholder="Share a moment…" className="mt-3 w-full bg-transparent text-xs outline-none" /><button disabled={!story.trim()} className="mt-3 text-[9px] font-black tracking-widest text-rcl-orange disabled:opacity-30">POST STORY</button></form>}{stories.map((item, index) => <button key={item.id} onClick={() => void viewStory(index)} className="min-w-40 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rcl-navy to-black p-3 text-left"><div className="flex items-center gap-2"><Avatar author={item.author} /><span className="truncate text-[10px] font-black">{item.author?.display_name ?? 'RCL Player'}</span></div><p className="mt-4 line-clamp-3 text-xs leading-5 text-white/65">{item.body || 'Game day moment'}</p><span className="mt-3 block text-[8px] font-black tracking-widest text-rcl-gold">VIEW STORY</span></button>)}{!stories.length && !user && <div className="rounded-2xl border border-dashed border-white/10 px-5 py-6 text-xs text-white/35">Sign in to post the first city story.</div>}</div></section>

            <section className="mb-5 rounded-3xl border border-white/10 bg-white/[.03] p-4 sm:p-5"><div className="flex gap-3"><Avatar author={{ display_name: user ? 'You' : 'Guest', username: null }} /><button onClick={() => user && setComposerOpen(true)} className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-white/35 hover:border-rcl-orange/30">What is happening on the court?</button></div><div className="mt-3 flex flex-wrap gap-2"><QuickAction icon={<FaImage />} label="Photo / Video" onClick={() => user && setComposerOpen(true)} /><QuickAction icon={<FaBasketball />} label="Create a Run" onClick={() => { window.location.href = '/runs'; }} /><QuickAction icon={<FaUserGroup />} label="Tag Player" onClick={() => { window.location.href = '/players'; }} /><QuickAction icon={<FaFire />} label="Share Highlight" onClick={() => setFilter('highlights')} /></div></section>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{['all', 'following', 'runs', 'highlights', 'players', 'teams', 'communities'].map((value) => <button key={value} onClick={() => setFilter(value as typeof filter)} className={`whitespace-nowrap rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition ${filter === value ? 'border-rcl-orange bg-rcl-orange text-black' : 'border-white/10 text-white/45 hover:text-white'}`}>{value === 'all' ? 'For You' : value}</button>)}</div>

            {loading ? <LoadingFeed /> : visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} userId={user?.id} following={following.includes(post.author_id)} saved={saved.includes(post.id)} openComments={openComments === post.id} comment={comment[post.id] ?? ''} onCommentChange={(value) => setComment((current) => ({ ...current, [post.id]: value }))} onToggleComments={() => setOpenComments((current) => current === post.id ? null : post.id)} onComment={() => void addComment(post.id)} onReact={(type) => void react(post.id, type)} onSave={() => void toggleSave(post.id)} onShare={() => void sharePost(post)} onFollow={() => void toggleFollow(post.author_id)} onDelete={post.author_id === user?.id ? async () => { if (!supabase) return; await supabase.from('posts').delete().eq('id', post.id); setPosts((current) => current.filter((item) => item.id !== post.id)); } : undefined} />) : <EmptyState search={search} />}
          </> : <section className="rounded-3xl border border-white/10 bg-white/[.03] p-6 sm:p-8"><div className="max-w-2xl"><span className="inline-flex rounded-full bg-rcl-orange/10 px-3 py-1 text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">RCL SOCIAL</span><h2 className="mt-4 font-display text-4xl font-black uppercase">{tabs.find((item) => item.id === tab)?.label}</h2><p className="mt-3 text-sm leading-6 text-white/45">The Social platform connects people to basketball. Every section is designed to move naturally from conversation to discovery to participation.</p>{tab === 'runs' && <Link href="/runs" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">Open RCL Runs <FaArrowRight /></Link>}{tab === 'communities' && <Link href="/communities" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">Explore Communities <FaArrowRight /></Link>}{tab === 'messages' && <p className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/35">Messaging is being connected to the existing conversation system.</p>}{tab === 'notifications' && <p className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/35">Your activity and social notifications will appear here as the network grows.</p>}{tab === 'highlights' && <button onClick={() => { setTab('feed'); setFilter('highlights'); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">Browse feed highlights <FaArrowRight /></button>}{tab === 'discover' && <button onClick={() => { setTab('feed'); setSearch(''); setFilter('players'); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black">Discover players <FaArrowRight /></button>}</div></section>}
        </div>

        <aside className="hidden space-y-4 lg:block"><SideCard title="TRENDING IN THE 804"><div className="space-y-2">{trending.length ? trending.map(([word, count], index) => <button key={word} onClick={() => { setTab('feed'); setSearch(word); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-white/[.04]"><span><span className="mr-2 text-[9px] text-white/25">0{index + 1}</span><span className="text-xs font-bold">#{word}</span></span><span className="text-[9px] text-white/25">{count} posts</span></button>) : <p className="px-3 py-2 text-xs text-white/30">Your city trends will appear here.</p>}</div></SideCard><SideCard title="ON THE COURTS"><div className="rounded-2xl border border-rcl-orange/20 bg-gradient-to-br from-rcl-orange/10 to-transparent p-4"><p className="text-[9px] font-black tracking-widest text-rcl-orange">LIVE SOCIAL LOOP</p><h3 className="mt-2 font-display text-xl font-black uppercase">Who&apos;s hooping?</h3><p className="mt-2 text-xs leading-5 text-white/40">Find a pickup run, join the player count and take the conversation from Social to the court.</p><Link href="/runs" className="mt-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-rcl-orange">Find a run <FaArrowRight /></Link></div></SideCard><SideCard title="KEEP EXPLORING"><div className="space-y-2"><ExploreLink href="/players" label="Player Directory" /><ExploreLink href="/games" label="Game Center" /><ExploreLink href="/lab" label="The Lab" /><ExploreLink href="/leaderboards" label="Leaderboards" /></div></SideCard></aside>
      </div></Container>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#05080d]/95 px-2 py-2 backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-xl grid-cols-5 gap-1">{tabs.slice(0, 5).map((item) => <button key={item.id} onClick={() => item.id === 'runs' ? (window.location.href = '/runs') : setTab(item.id)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[8px] font-black uppercase tracking-wider ${tab === item.id ? 'bg-rcl-orange text-black' : 'text-white/45'}`}>{item.icon}<span>{item.label}</span></button>)}</div></nav>

      {composerOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"><div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1119] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black tracking-[.2em] text-rcl-orange">CREATE ON RCL</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Start the conversation</h2></div><button onClick={() => setComposerOpen(false)} className="rounded-xl p-2 text-white/40 hover:bg-white/5"><FaXmark /></button></div><form onSubmit={createPost} className="mt-5"><textarea value={body} onChange={(e) => setBody(e.target.value)} autoFocus rows={5} maxLength={2000} placeholder="Share a game-day moment, run, opinion, highlight or shoutout…" className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-rcl-orange/50" /><input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Optional image URL" className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs outline-none focus:border-rcl-orange/50" /><div className="mt-4 flex items-center justify-between"><span className="text-[9px] text-white/25">{body.length}/2000</span><button disabled={!body.trim() || !user} className="inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-30">Publish <FaArrowRight /></button></div></form></div></div>}
      {storyIndex !== null && stories[storyIndex] && <StoryViewer stories={stories} index={storyIndex} onClose={() => setStoryIndex(null)} onIndexChange={(index) => { setStoryIndex(index); void viewStory(index); }} />}
      {error && <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-white/10 bg-[#101722] px-4 py-3 text-xs text-white shadow-xl">{error}</div>}
    </main>
  );
}

function Avatar({ author }: { author?: Author }) { if (author?.avatar_url) return <img src={author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" />; return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rcl-orange to-rcl-gold text-xs font-black text-black ring-2 ring-white/10">{(author?.display_name?.trim()?.[0] ?? 'R').toUpperCase()}</div>; }
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white/45 hover:border-rcl-orange/30 hover:text-white">{icon}<span>{label}</span></button>; }

function PostCard({ post, userId, following, saved, openComments, comment, onCommentChange, onToggleComments, onComment, onReact, onSave, onShare, onFollow, onDelete }: { post: Post; userId?: string; following: boolean; saved: boolean; openComments: boolean; comment: string; onCommentChange: (value: string) => void; onToggleComments: () => void; onComment: () => void; onReact: (type: string) => void; onSave: () => void; onShare: () => void; onFollow: () => void; onDelete?: () => void }) {
  const mine = post.reactions?.find((reaction) => reaction.user_id === userId);
  const reactionCount = post.reactions?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;
  return <article id={`post-${post.id}`} className="mb-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[.03]"><div className="flex items-start gap-3 p-4 sm:p-5"><Avatar author={post.author} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Link href={post.author?.username ? `/fans/${post.author.username}` : '/players'} className="text-sm font-black hover:text-rcl-orange">{post.author?.display_name ?? 'RCL Member'}</Link>{post.author?.role && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white/30">{post.author.role}</span>}{following && <span className="text-[8px] font-black uppercase tracking-widest text-rcl-gold">Following</span>}</div><p className="mt-0.5 text-[10px] text-white/25">{formatTime(post.created_at)} · Richmond, VA</p></div>{userId && post.author_id !== userId && <button onClick={onFollow} className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest ${following ? 'border-rcl-gold/30 text-rcl-gold' : 'border-white/10 text-white/40 hover:text-white'}`}>{following ? <><FaCheck className="mr-1 inline" />Following</> : 'Follow'}</button>}{onDelete && <button onClick={onDelete} className="rounded-lg p-2 text-white/20 hover:text-red-400"><FaTrash /></button>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/80">{post.body}</p></div></div>{post.media_urls?.[0] && <div className="border-y border-white/10 bg-black"><img src={post.media_urls[0]} alt="Post media" className="max-h-[520px] w-full object-cover" /></div>}<div className="px-4 py-3 sm:px-5"><div className="flex items-center justify-between text-[9px] text-white/30"><span>{reactionCount ? `${reactionCount} ${reactionCount === 1 ? 'reaction' : 'reactions'}` : 'Be the first to react'}</span><button onClick={onToggleComments} className="hover:text-white">{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</button></div><div className="mt-3 flex items-center gap-1 border-t border-white/5 pt-2">{reactions.slice(0, 4).map((reaction) => <button key={reaction.type} title={reaction.label} onClick={() => onReact(reaction.type)} className={`rounded-xl px-2.5 py-2 text-sm transition hover:bg-white/5 ${mine?.type === reaction.type ? 'bg-rcl-orange/10 ring-1 ring-rcl-orange/30' : ''}`}>{reaction.emoji}</button>)}<button onClick={onToggleComments} className="ml-1 inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 hover:text-white"><FaComment /> Comment</button><button onClick={onShare} className="rounded-xl p-2 text-white/40 hover:bg-white/5 hover:text-white"><FaShareNodes /></button><button onClick={onSave} className={`rounded-xl p-2 ${saved ? 'text-rcl-gold' : 'text-white/40 hover:text-white'}`}><FaBookmark /></button></div></div>{openComments && <div className="border-t border-white/10 bg-black/10 px-4 py-4 sm:px-5">{post.comments?.slice(-4).map((item) => <div key={item.id} className="mb-3 flex gap-2"><Avatar author={item.author} /><div className="rounded-2xl bg-white/[.04] px-3 py-2"><p className="text-[9px] font-black">{item.author?.display_name ?? 'RCL Member'}</p><p className="mt-1 text-xs leading-5 text-white/60">{item.body}</p></div></div>)}<form onSubmit={(e) => { e.preventDefault(); onComment(); }} className="flex gap-2"><input value={comment} onChange={(e) => onCommentChange(e.target.value)} placeholder="Add a reply…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs outline-none focus:border-rcl-orange/40" /><button disabled={!comment.trim()} className="rounded-xl bg-rcl-orange px-4 py-2 text-[9px] font-black uppercase tracking-widest text-black disabled:opacity-30">Send</button></form></div>}</article>;
}

function StoryViewer({ stories, index, onClose, onIndexChange }: { stories: Story[]; index: number; onClose: () => void; onIndexChange: (index: number) => void }) { const story = stories[index]; return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-3"><div className="relative flex h-[min(760px,90vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-rcl-navy to-black shadow-2xl"><div className="absolute left-3 right-3 top-3 z-10 flex gap-1">{stories.map((_, itemIndex) => <span key={itemIndex} className={`h-1 flex-1 rounded-full ${itemIndex === index ? 'bg-white' : itemIndex < index ? 'bg-rcl-orange' : 'bg-white/20'}`} />)}</div><button onClick={onClose} className="absolute right-3 top-7 z-10 rounded-xl bg-black/30 p-2 text-white"><FaXmark /></button><div className="flex flex-1 items-center justify-center p-8 text-center"><div><Avatar author={story.author} /><p className="mt-4 text-xl font-bold leading-8 text-white">{story.body || 'Game day in the 804.'}</p><p className="mt-4 text-[9px] font-black uppercase tracking-widest text-rcl-gold">RICH CITY SOCIAL · 24H</p></div></div><button aria-label="Previous story" disabled={index === 0} onClick={() => onIndexChange(index - 1)} className="absolute left-0 top-1/2 h-1/2 w-1/3 -translate-y-1/2 disabled:pointer-events-none" /><button aria-label="Next story" disabled={index === stories.length - 1} onClick={() => onIndexChange(index + 1)} className="absolute right-0 top-1/2 h-1/2 w-1/3 -translate-y-1/2 disabled:pointer-events-none" /><div className="border-t border-white/10 p-4 text-center text-[9px] font-black uppercase tracking-widest text-white/30">{index + 1} / {stories.length}</div></div></div>; }
function SideCard({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-white/10 bg-white/[.03] p-4"><p className="mb-3 text-[9px] font-black tracking-[.2em] text-white/35">{title}</p>{children}</section>; }
function ExploreLink({ href, label }: { href: string; label: string }) { return <Link href={href} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold text-white/55 hover:bg-white/[.04] hover:text-white"><span>{label}</span><FaArrowRight className="text-[9px]" /></Link>; }
function LoadingFeed() { return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-3xl border border-white/10 bg-white/[.03]" />)}</div>; }
function EmptyState({ search }: { search: string }) { return <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center"><FaBasketball className="mx-auto text-3xl text-rcl-orange/60" /><h3 className="mt-4 font-display text-2xl font-black uppercase">Nothing here yet.</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/35">{search ? `No posts matched “${search}”. Try another search.` : 'Be the person who starts the next conversation in the 804.'}</p></div>; }
function formatTime(value: string) { const date = new Date(value); const diff = Math.max(0, Date.now() - date.getTime()); const mins = Math.floor(diff / 60000); if (mins < 1) return 'Just now'; if (mins < 60) return `${mins}m`; const hours = Math.floor(mins / 60); if (hours < 24) return `${hours}h`; return `${Math.floor(hours / 24)}d`; }
