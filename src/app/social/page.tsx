'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { FaArrowRight, FaBasketball, FaBolt, FaBookmark, FaComment, FaImage, FaShareNodes, FaTrash, FaUserGroup } from 'react-icons/fa6';

const reactions = [
  { type: 'bucket', emoji: '🏀', label: 'Bucket' },
  { type: 'heat', emoji: '🔥', label: 'Heat' },
  { type: 'strong', emoji: '💪', label: 'Tough' },
  { type: 'locked', emoji: '🔒', label: 'Locked' },
  { type: 'money', emoji: '🎯', label: 'Pure' },
  { type: 'watch', emoji: '👀', label: 'Seen' },
  { type: 'champ', emoji: '🏆', label: 'Champ' },
];

type Author = { display_name: string | null; username: string | null; avatar_url?: string | null; role?: string | null };
type Comment = { id: string; post_id: string; author_id: string; body: string; created_at: string; author?: Author };
type Reaction = { user_id: string; post_id: string; type: string };
type Post = { id: string; author_id: string; body: string; media_urls: string[]; created_at: string; author?: Author; comments?: Comment[]; reactions?: Reaction[] };
type Story = { id: string; body: string | null; expires_at: string; author?: Author };

export default function SocialPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [image, setImage] = useState('');
  const [story, setStory] = useState('');
  const [filter, setFilter] = useState<'all' | 'league' | 'players' | 'teams'>('all');
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
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
      // Keep the primary timeline query independent from PostgREST relationship
      // embeddings. A failure in comments/reactions/profile joins should never
      // make valid published posts disappear from the feed.
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

      const [authorsResult, commentsResult, reactionsResult, storiesResult] = await Promise.all([
        authorIds.length
          ? supabase.from('profiles').select('id,display_name,username,avatar_url,role').in('id', authorIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from('comments').select('id,post_id,author_id,body,created_at').in('post_id', postIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from('reactions').select('post_id,user_id,type').in('post_id', postIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('stories').select('id,body,expires_at,author_id').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(20),
      ]);

      const authors = (authorsResult.data ?? []) as unknown as Array<Author & { id: string }>;
      const authorMap = new Map(authors.map((author) => [author.id, author]));
      const comments = (commentsResult.data ?? []) as unknown as Comment[];
      const reactionsData = (reactionsResult.data ?? []) as unknown as Reaction[];
      const storyRows = (storiesResult.data ?? []) as unknown as Array<{ id: string; body: string | null; expires_at: string; author_id: string }>;

      setPosts(
        safePosts.map((post) => ({
          ...post,
          author: authorMap.get(post.author_id),
          comments: comments.filter((item) => item.post_id === post.id).map((item) => ({ ...item, author: authorMap.get(item.author_id) })),
          reactions: reactionsData.filter((item) => item.post_id === post.id),
        }))
      );
      setStories(storyRows.map((item) => ({ ...item, author: authorMap.get(item.author_id) })));

      // A secondary query is allowed to fail without blanking the main feed.
      // This makes the timeline resilient while policies/relationships evolve.
      if (commentsResult.error || reactionsResult.error || storiesResult.error) {
        console.warn('Some social metadata could not be loaded', {
          comments: commentsResult.error?.message,
          reactions: reactionsResult.error?.message,
          stories: storiesResult.error?.message,
        });
      }
    } catch (loadError) {
      console.error('Unable to load the social timeline', loadError);
      setError(loadError instanceof Error ? loadError.message : 'We could not load the social timeline.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('rcl-social-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !body.trim()) return;
    setError('');

    const { data, error: insertError } = await supabase
      .from('posts')
      .insert({ author_id: user.id, body: body.trim(), media_urls: image.trim() ? [image.trim()] : [], status: 'published' } as never)
      .select('id,author_id,body,media_urls,created_at')
      .single();

    if (insertError) {
      console.error('Unable to publish social post', insertError);
      setError(insertError.message || 'We could not publish that post.');
      return;
    }

    setBody('');
    setImage('');
    if (data) {
      const author = { display_name: null, username: null, avatar_url: null, role: null };
      setPosts((current) => [{ ...(data as unknown as Post), author, comments: [], reactions: [] }, ...current]);
    }
    void load();
  };

  const createStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !story.trim()) return;
    const { data, error: storyError } = await supabase
      .from('stories')
      .insert({ author_id: user.id, story_type: 'text', body: story.trim(), audience: 'public' } as never)
      .select('id,body,expires_at,author_id')
      .single();
    if (storyError) {
      setError(storyError.message || 'We could not publish that story.');
      return;
    }
    if (data) {
      setStories((current) => [{ ...(data as unknown as Story), author: undefined }, ...current]);
      setStory('');
    }
  };

  const react = async (postId: string, type: string) => {
    if (!supabase || !user) return;
    const post = posts.find((item) => item.id === postId);
    const existing = post?.reactions?.find((item) => item.user_id === user.id);
    if (existing) {
      if (existing.type === type) {
        await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', user.id);
        await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type } as never);
      }
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type } as never);
    }
    void load();
  };

  const addComment = async (postId: string) => {
    if (!supabase || !user || !comment[postId]?.trim()) return;
    const { error: commentError } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, body: comment[postId].trim(), parent_id: null } as never);
    if (commentError) {
      setError(commentError.message || 'We could not post that reply.');
      return;
    }
    setComment((current) => ({ ...current, [postId]: '' }));
    void load();
  };

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? posts
        : posts.filter((post) => {
            const text = post.body.toLowerCase();
            return filter === 'league'
              ? text.includes('league') || text.includes('rcl') || post.author?.role === 'staff'
              : filter === 'players'
                ? post.author?.role === 'player' || text.includes('player')
                : text.includes('team') || text.includes('game');
          }),
    [posts, filter]
  );

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
                {user && <form onSubmit={createStory} className="min-w-44 rounded-2xl border border-rcl-orange/30 bg-rcl-orange/5 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-rcl-orange text-black"><FaBasketball /></div><input value={story} onChange={(e) => setStory(e.target.value)} maxLength={240} placeholder="Share a moment…" className="mt-3 w-full bg-transparent text-xs outline-none" /><button className="mt-3 text-[9px] font-black tracking-widest text-rcl-orange">POST STORY</button></form>}
                {stories.map((item) => <article key={item.id} className="min-w-44 rounded-2xl border border-white/10 bg-gradient-to-br from-rcl-navy/80 to-black p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-rcl-gold/40 bg-rcl-gold/10 text-xs font-black text-rcl-gold">{item.author?.display_name?.[0] ?? 'R'}</div><p className="mt-3 line-clamp-3 text-xs text-white/70">{item.body}</p><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-white/35">{item.author?.display_name ?? item.author?.username ?? 'RCL member'}</p></article>)}
              </div>
            </section>

            {user && <form onSubmit={createPost} className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-5 shadow-xl"><div className="flex gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rcl-orange text-black"><FaBasketball /></div><div className="min-w-0 flex-1"><p className="text-[9px] font-black tracking-[.2em] text-white/35">CREATE A POST</p><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="What is happening in the 804?" className="mt-2 min-h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-white/25" /><div className="flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center"><label className="flex flex-1 items-center gap-2 text-[10px] text-white/35"><FaImage /><input type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="Add photo / GIF URL" className="w-full bg-transparent outline-none" /></label><button disabled={!body.trim()} className="rounded-xl bg-rcl-orange px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-40">Publish</button></div>{error && <p className="mt-2 break-words text-xs text-red-300">{error}</p>}</div></div></form>}

            <div className="mt-6 flex gap-2 overflow-x-auto border-b border-white/10 pb-2">{[['all', 'For You'], ['league', '804 Now'], ['players', 'Players'], ['teams', 'Game Day']].map(([id, label]) => <button key={id} onClick={() => setFilter(id as typeof filter)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${filter === id ? 'bg-rcl-gold text-black' : 'border border-white/10 text-white/45 hover:text-white'}`}>{label}</button>)}</div>

            {error && !user && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-xs text-red-200">{error}</div>}

            <section className="mt-4 space-y-4">
              {loading ? <div className="h-72 animate-pulse rounded-3xl bg-white/[.03]" /> : filtered.map((post) => <article key={post.id} className="rounded-3xl border border-white/10 bg-white/[.025] p-5 shadow-xl"><header className="flex items-center justify-between gap-3"><Link href={post.author?.username ? `/fans/${post.author.username}` : '#'} className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rcl-orange to-rcl-gold text-sm font-black text-black">{post.author?.display_name?.[0] ?? 'R'}</div><div className="min-w-0"><p className="truncate text-sm font-black">{post.author?.display_name ?? 'RCL Member'}</p><p className="text-[9px] uppercase tracking-widest text-white/30">{post.author?.role ?? 'member'} · {new Date(post.created_at).toLocaleDateString()}</p></div></Link>{user && post.author_id === user.id && <button onClick={async () => { const { error: archiveError } = await supabase?.from('posts').update({ status: 'archived' } as never).eq('id', post.id) ?? {}; if (archiveError) setError(archiveError.message); else void load(); }} aria-label="Archive post" className="text-white/25 hover:text-red-300"><FaTrash /></button>}</header><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-white/80">{post.body}</p>{post.media_urls?.[0] && <img src={post.media_urls[0]} alt="Post media" className="mt-4 max-h-[520px] w-full rounded-2xl object-cover" />}<div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">{reactions.map((item) => { const count = post.reactions?.filter((reaction) => reaction.type === item.type).length ?? 0; const mine = post.reactions?.some((reaction) => reaction.user_id === user?.id && reaction.type === item.type); return <button key={item.type} onClick={() => react(post.id, item.type)} disabled={!user} aria-label={`${item.label} reaction`} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${mine ? 'border-rcl-orange/50 bg-rcl-orange/10' : 'border-white/10 bg-black/20 text-white/50'}`}>{item.emoji} {count || ''}</button>; })}<button onClick={() => setOpenComments(openComments === post.id ? null : post.id)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black text-white/45"><FaComment /> {post.comments?.length ?? 0}</button><button className="rounded-full border border-white/10 p-2 text-white/35"><FaBookmark /></button><button className="rounded-full border border-white/10 p-2 text-white/35"><FaShareNodes /></button></div>{openComments === post.id && <div className="mt-4 border-t border-white/10 pt-4"><div className="space-y-3">{post.comments?.slice(-4).map((item) => <div key={item.id} className="rounded-xl bg-black/25 p-3"><p className="text-[10px] font-black text-rcl-gold">{item.author?.display_name ?? 'RCL Member'}</p><p className="mt-1 text-xs leading-5 text-white/60">{item.body}</p></div>)}</div>{user && <div className="mt-3 flex gap-2"><input value={comment[post.id] ?? ''} onChange={(e) => setComment((current) => ({ ...current, [post.id]: e.target.value }))} placeholder="Write a reply…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs outline-none focus:border-rcl-orange" /><button onClick={() => addComment(post.id)} className="rounded-xl bg-rcl-orange px-4 text-[9px] font-black uppercase text-black">Reply</button></div>}</div>}</article>)}
              {!loading && !filtered.length && <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center"><FaUserGroup className="mx-auto text-3xl text-white/15" /><p className="mt-4 font-display text-xl font-black uppercase">The feed is quiet.</p><p className="mt-2 text-xs text-white/35">{error || 'Be the first to put something on the board.'}</p></div>}
            </section>
          </div>

          <aside className="space-y-4"><div className="sticky top-24 rounded-3xl border border-white/10 bg-white/[.03] p-5"><p className="text-[9px] font-black tracking-[.2em] text-rcl-gold">RCL RIGHT NOW</p><div className="mt-5 space-y-3">{[['🏀', 'GAME CENTER', 'Scores, schedules & results', '/games'], ['🏆', 'LEADERBOARDS', 'Who is running the city?', '/leaderboards'], ['👥', 'COMMUNITIES', 'Find your basketball circle', '/communities'], ['⚡', 'THE LAB', 'Build your next workout', '/lab']].map(([icon, title, detail, href]) => <Link key={href} href={href} className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 hover:border-rcl-orange/30"><span className="text-xl">{icon}</span><span><strong className="block text-xs font-black">{title}</strong><small className="mt-1 block text-[10px] text-white/35">{detail}</small></span></Link>)}</div></div></aside>
        </div>
      </Container>
    </main>
  );
}
