'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  FaRegComment, 
  FaShareNodes, 
  FaTrash, 
  FaImage,
  FaBolt
} from 'react-icons/fa6';

// Original Branded reactions configuration
const REACTION_TYPES = [
  { name: 'bucket', emoji: '🏀', label: 'BUCKET' },
  { name: 'heat', emoji: '🔥', label: 'HEAT' },
  { name: 'strong', emoji: '💪', label: 'STRONG' },
  { name: 'locked', emoji: '🧱', label: 'LOCKED' },
  { name: 'money', emoji: '🎯', label: 'MONEY' },
  { name: 'watch', emoji: '👀', label: 'WATCH' },
  { name: 'king', emoji: '👑', label: 'KING' },
  { name: 'certified', emoji: '💯', label: 'CERTIFIED' },
  { name: 'highlight', emoji: '🚨', label: 'HIGHLIGHT' },
  { name: 'champ', emoji: '🏆', label: 'CHAMP' },
];

export default function SocialPage() {
  const { user, profile } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostBody, setNewPostBody] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'for-you' | 'league' | 'teams' | 'players'>('for-you');

  // Comment reply state
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputText, setCommentInputText] = useState<Record<string, string>>({});

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';

  const loadFeed = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          author_id,
          body,
          media_urls,
          status,
          created_at,
          updated_at,
          author:profiles(*),
          comments(id, post_id, author_id, body, parent_id, created_at, author:profiles(*)),
          reactions(*)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [supabase]);

  // Create a new post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user || !newPostBody.trim() || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        author_id: user.id,
        body: newPostBody.trim(),
        media_urls: newPostImage.trim() ? [newPostImage.trim()] : [],
        status: 'published',
      };

      const { error } = await supabase.from('posts').insert(payload as never);
      if (!error) {
        setNewPostBody('');
        setNewPostImage('');
        loadFeed();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (postId: string, reactionType: string) => {
    if (!supabase || !user) return;

    // Check if current user already has this specific reaction on this post
    const post = posts.find((p) => p.id === postId);
    const existing = post?.reactions?.find(
      (r: any) => r.user_id === user.id && r.type === reactionType
    );

    if (existing) {
      // Remove reaction
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('type', reactionType);
      
      if (!error) {
        setPosts((current) =>
          current.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                reactions: p.reactions.filter((r: any) => !(r.user_id === user.id && r.type === reactionType)),
              };
            }
            return p;
          })
        );
      }
    } else {
      // Add reaction
      const { error } = await supabase
        .from('reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          type: reactionType,
        } as never);

      if (!error) {
        setPosts((current) =>
          current.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                reactions: [...p.reactions, { post_id: postId, user_id: user.id, type: reactionType }],
              };
            }
            return p;
          })
        );
      }
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      setPosts((current) => current.filter((p) => p.id !== postId));
    }
  };

  // Create a comment / reply
  const handleAddComment = async (postId: string, parentId: string | null = null) => {
    if (!supabase || !user) return;
    const text = commentInputText[postId]?.trim();
    if (!text) return;

    const payload = {
      post_id: postId,
      author_id: user.id,
      body: text,
      parent_id: parentId,
    };

    const { error } = await supabase.from('comments').insert(payload as never);
    if (!error) {
      setCommentInputText((curr) => ({ ...curr, [postId]: '' }));
      loadFeed();
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      loadFeed();
    }
  };

  // Filters timeline
  const filteredPosts = useMemo(() => {
    if (filter === 'league') {
      return posts.filter((p) => p.body.toLowerCase().includes('league') || p.body.toLowerCase().includes('announcement'));
    }
    if (filter === 'teams') {
      return posts.filter((p) => p.body.toLowerCase().includes('team') || p.body.toLowerCase().includes('win'));
    }
    if (filter === 'players') {
      return posts.filter((p) => p.body.toLowerCase().includes('dropped') || p.body.toLowerCase().includes('badge') || p.body.toLowerCase().includes('player'));
    }
    return posts;
  }, [posts, filter]);

  return (
    <main className="min-h-screen bg-rcl-black bg-[radial-gradient(ellipse_at_top,rgba(29,53,87,0.3),transparent_70%)] pb-24 text-white font-display">
      <section className="border-b border-white/10 py-12 text-center">
        <Container maxWidth="xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-rcl-gold">
            RICH CITY SOCIAL
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl text-white">
            RCL <span className="text-rcl-gold">TIMELINE</span>
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Share basketball moments, post highlights, unlock badges, and interact with the Richmond court community.
          </p>
        </Container>
      </section>

      <Container maxWidth="lg" className="mt-10 grid gap-8 lg:grid-cols-3">
        {/* Left Column: Create Post & Filters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Post creator (authenticated) */}
          {user ? (
            <form onSubmit={handleCreatePost} className="rounded-2xl border border-white/10 bg-black/60 p-5 shadow-xl backdrop-blur">
              <span className="block text-[10px] font-black tracking-widest text-rcl-gold uppercase mb-3">
                SHARE A HOOP UPDATE
              </span>
              <textarea
                required
                value={newPostBody}
                onChange={(e) => setNewPostBody(e.target.value)}
                placeholder="What's going down on the Richmond court today?"
                className="w-full h-24 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white focus:border-rcl-gold outline-none resize-none"
              />
              <div className="mt-3 flex items-center gap-2 border border-white/10 bg-black/40 rounded-xl px-3 py-1 text-xs">
                <FaImage className="text-gray-500 shrink-0" />
                <input
                  type="url"
                  value={newPostImage}
                  onChange={(e) => setNewPostImage(e.target.value)}
                  placeholder="Optional Photo/Gif URL"
                  className="w-full bg-transparent border-none text-white outline-none placeholder:text-gray-600 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !newPostBody.trim()}
                className="mt-4 w-full rounded-xl bg-rcl-gold py-2.5 font-bold text-black transition-all text-xs tracking-widest uppercase hover:bg-white disabled:opacity-50"
              >
                {submitting ? 'POSTING...' : 'PUBLISH POST'}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-center shadow-xl backdrop-blur">
              <p className="text-xs text-gray-400">Please sign in to join the social timeline.</p>
              <Link href="/auth/sign-in" className="mt-4 inline-block rounded-full bg-rcl-gold px-6 py-2 text-xs font-black text-black">
                SIGN IN
              </Link>
            </div>
          )}

          {/* Timeline Filters */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-xl backdrop-blur">
            <span className="block text-[10px] font-black tracking-widest text-gray-500 uppercase mb-3">
              TIMELINE FEEDS
            </span>
            <div className="flex flex-col gap-2">
              {[
                { id: 'for-you', label: 'FOR YOU (ALL)' },
                { id: 'league', label: 'LEAGUE UPDATES' },
                { id: 'teams', label: 'TEAMS' },
                { id: 'players', label: 'PLAYERS & BADGES' },
              ].map((feed) => (
                <button
                  key={feed.id}
                  onClick={() => setFilter(feed.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black tracking-wider transition ${
                    filter === feed.id 
                      ? 'bg-rcl-gold text-black shadow-[0_0_10px_rgba(255,215,0,0.2)]' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-rcl-gold'
                  }`}
                >
                  {feed.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Columns: Posts Feed */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/5 border border-white/10" />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-gray-500">
              No timeline hoop posts found under this feed.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const author = post.author;
              const reactions = post.reactions || [];
              const comments = post.comments || [];
              const commentsCount = comments.length;

              // Automatic system activity flag
              const isSystemActivity = post.body.includes('dropped') || post.body.includes('unlocked') || post.body.includes('won');

              return (
                <div 
                  key={post.id} 
                  className={`rounded-2xl border p-6 shadow-xl relative transition-all hover:border-white/15 ${
                    isSystemActivity 
                      ? 'border-rcl-gold/30 bg-gradient-to-r from-rcl-navy/25 to-black' 
                      : 'border-white/10 bg-black/40 backdrop-blur-md'
                  }`}
                >
                  {/* System/Activity Tag */}
                  {isSystemActivity && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-rcl-gold/10 border border-rcl-gold/20 px-3 py-0.5 text-[8px] font-black text-rcl-gold uppercase tracking-widest">
                      <FaBolt /> LEAGUE EVENT
                    </div>
                  )}

                  {/* Post Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rcl-gold font-black text-black text-sm uppercase">
                      {author?.display_name?.[0] || author?.first_name?.[0] || 'R'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">
                        {author?.first_name ? `${author.first_name} ${author.last_name || ''}` : author?.display_name || 'RCL Athlete'}
                      </h4>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 block">
                        {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Post Body */}
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
                      {post.body}
                    </p>
                    {/* Media Attachments */}
                    {post.media_urls && Array.isArray(post.media_urls) && post.media_urls[0] && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 max-h-80">
                        <img src={post.media_urls[0]} alt="Post attachment" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Original Branded Reactions */}
                  <div className="mt-6 border-t border-white/5 pt-4">
                    <span className="block text-[9px] font-black tracking-widest text-gray-500 uppercase mb-3">
                      REACTIONS
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {REACTION_TYPES.map((type) => {
                        const count = reactions.filter((r: any) => r.type === type.name).length;
                        const userReacted = user ? reactions.some((r: any) => r.user_id === user.id && r.type === type.name) : false;
                        return (
                          <button
                            key={type.name}
                            onClick={() => handleToggleReaction(post.id, type.name)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all ${
                              userReacted
                                ? 'bg-rcl-gold border-rcl-gold text-black font-extrabold shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                                : 'border-white/5 bg-white/5 text-gray-400 hover:border-rcl-gold hover:text-rcl-gold'
                            }`}
                          >
                            <span>{type.emoji}</span>
                            <span>{type.label}</span>
                            {count > 0 && <span className="ml-1 shrink-0 font-mono text-[11px]">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Post Actions Panel */}
                  <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4 text-xs text-gray-400">
                    <button
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 hover:text-rcl-gold font-bold uppercase tracking-wider text-[10px]"
                    >
                      <FaRegComment /> COMMENTS ({commentsCount})
                    </button>
                    <div className="flex gap-4">
                      {/* Delete option if owner or Admin */}
                      {(isAdmin || (user && post.author_id === user.id)) && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="flex items-center gap-1 hover:text-rcl-red font-bold uppercase tracking-wider text-[10px]"
                        >
                          <FaTrash /> DELETE
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments thread Section */}
                  {activeCommentPostId === post.id && (
                    <div className="mt-5 border-t border-white/10 pt-5 space-y-4">
                      {comments.map((comment: any) => {
                        return (
                          <div key={comment.id} className="flex gap-3 text-xs bg-white/[0.02] border border-white/5 rounded-xl p-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rcl-gold text-[10px] font-black text-black">
                              {comment.author?.display_name?.[0] || 'A'}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-white">
                                  {comment.author?.first_name ? `${comment.author.first_name} ${comment.author.last_name || ''}` : comment.author?.display_name || 'RCL Athlete'}
                                </span>
                                <div className="flex gap-3">
                                  <span className="text-[9px] text-gray-500">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                  </span>
                                  {(isAdmin || (user && comment.author_id === user.id)) && (
                                    <button onClick={() => handleDeleteComment(comment.id)} className="text-rcl-red hover:text-red-300">
                                      <FaTrash className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="mt-1 text-gray-300 text-sm leading-relaxed">{comment.body}</p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add comment form */}
                      {user ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment to this hoop thread..."
                            value={commentInputText[post.id] || ''}
                            onChange={(e) => setCommentInputText({ ...commentInputText, [post.id]: e.target.value })}
                            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white focus:border-rcl-gold outline-none"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="rounded-xl bg-rcl-gold px-4 py-2.5 text-xs font-bold text-black tracking-widest hover:bg-white"
                          >
                            REPLY
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-500 text-center pt-2">Please sign in to comment on threads.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Container>
    </main>
  );
}
