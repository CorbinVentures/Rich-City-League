'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBasketball, FaCommentDots, FaFire, FaPaperPlane, FaTrash } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { SocialIdentity } from '@/components/SocialIdentity';
import { RichPostBody } from '@/components/SocialRichContent';

type WallAuthor = {
  id?: string; display_name: string | null; username: string | null;
  avatar_url?: string | null; role?: string | null; is_vip?: boolean | null;
  vip_label?: string | null; is_system_account?: boolean | null;
  system_account_key?: string | null; rep?: number; level?: number;
};
export type WallPost = {
  id: string; author_id: string; target_profile_id?: string | null;
  body: string; media_urls: string[]; created_at: string;
  is_automated?: boolean; automation_type?: string | null; author?: WallAuthor | null;
};
type Reaction = { id: string; post_id: string; user_id: string; type: string };
type Comment = { id: string; post_id: string; author_id: string; parent_id: string | null; body: string; created_at: string };

export function ProfileWallFeed({
  profileId, profileName, initialPosts, allowVisitorPosts = true,
}: {
  profileId: string; profileName: string; initialPosts: WallPost[]; allowVisitorPosts?: boolean;
}) {
  const { user } = useAuth();
  const db = useMemo(() => getSupabaseClient() as any, []);
  const router = useRouter();
  const [posts, setPosts] = useState<WallPost[]>(initialPosts);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const requireAccount = () => {
    if (user) return true;
    window.location.href = '/auth/sign-in?redirect=' + encodeURIComponent('/social/profile/' + profileId);
    return false;
  };

  const reload = useCallback(async () => {
    if (!db) return;
    const { data: freshPosts, error: postError } = await db.from('posts')
      .select('id,author_id,target_profile_id,body,media_urls,created_at,is_automated,automation_type')
      .or('author_id.eq.' + profileId + ',target_profile_id.eq.' + profileId)
      .eq('status', 'published').order('created_at', { ascending: false }).limit(60);
    if (postError) { setError('Unable to load the latest wall posts.'); return; }
    const rows = (freshPosts ?? []) as WallPost[];
    const postIds = rows.map(row => row.id);
    const authorIds = [...new Set(rows.map(row => row.author_id))];
    const [authorResult, reactionsResult, commentsResult] = await Promise.all([
      authorIds.length ? db.from('profiles').select('id,display_name,username,avatar_url,role,is_vip,vip_label,is_system_account,system_account_key').in('id', authorIds) : Promise.resolve({ data: [] }),
      postIds.length ? db.from('reactions').select('id,post_id,user_id,type').in('post_id', postIds).limit(1500) : Promise.resolve({ data: [] }),
      postIds.length ? db.from('comments').select('id,post_id,author_id,parent_id,body,created_at').in('post_id', postIds).order('created_at', { ascending: true }).limit(500) : Promise.resolve({ data: [] }),
    ]);
    const authors = new Map<string, WallAuthor>(((authorResult.data ?? []) as WallAuthor[]).map(author => [author.id!, author]));
    setPosts(rows.map(row => ({ ...row, author: authors.get(row.author_id) ?? null })));
    setReactions((reactionsResult.data ?? []) as Reaction[]);
    const fetchedComments = (commentsResult.data ?? []) as Comment[];
    setComments(fetchedComments);
    const commenterIds = [...new Set(fetchedComments.map(row => row.author_id))];
    if (commenterIds.length) {
      const { data: commenterProfiles } = await db.from('profiles').select('id,display_name,username').in('id', commenterIds);
      setCommentAuthors(Object.fromEntries(((commenterProfiles ?? []) as Array<{id:string;display_name:string|null;username:string|null}>)
        .map(author => [author.id, author.display_name || author.username || 'Member'])));
    } else setCommentAuthors({});
  }, [db, profileId]);

  useEffect(() => { void reload(); }, [reload]);

  const publish = async () => {
    if (!allowVisitorPosts || !requireAccount() || !db || !draft.trim() || user!.id === profileId) return;
    setError(''); setSaving('publish');
    const { error: insertError } = await db.from('posts').insert({
      author_id: user!.id, target_profile_id: profileId, body: draft.trim(), media_urls: [], status: 'published',
    });
    if (insertError) setError(insertError.message);
    else { setDraft(''); await reload(); router.refresh(); }
    setSaving(null);
  };

  const toggleHeat = async (postId: string) => {
    if (!requireAccount() || !db) return;
    setError(''); setSaving('react-' + postId);
    const mine = reactions.find(row => row.post_id === postId && row.user_id === user!.id);
    const result = mine
      ? await db.from('reactions').delete().eq('id', mine.id)
      : await db.from('reactions').insert({ post_id: postId, user_id: user!.id, type: 'heat' });
    if (result.error) setError(result.error.message);
    else await reload();
    setSaving(null);
  };

  const addComment = async (postId: string) => {
    if (!requireAccount() || !db || !commentDrafts[postId]?.trim()) return;
    setError(''); setSaving('comment-' + postId);
    const { error: commentError } = await db.from('comments').insert({
      post_id: postId, author_id: user!.id, parent_id: replyTo[postId] ?? null, body: commentDrafts[postId].trim(),
    });
    if (commentError) setError(commentError.message);
    else {
      setCommentDrafts(current => ({ ...current, [postId]: '' }));
      setReplyTo(current => ({ ...current, [postId]: null }));
      setExpanded(current => ({ ...current, [postId]: true }));
      await reload();
    }
    setSaving(null);
  };

  const removeFromWall = async (post: WallPost) => {
    if (!user || !db || user.id !== profileId || post.author_id === profileId || post.is_automated) return;
    if (!window.confirm('Remove this member\'s post from your wall?')) return;
    setError(''); setSaving('delete-' + post.id);
    const { error: deleteError } = await db.from('posts').delete().eq('id', post.id);
    if (deleteError) setError(deleteError.message);
    else { setPosts(current => current.filter(row => row.id !== post.id)); await reload(); router.refresh(); }
    setSaving(null);
  };

  const ownPage = user?.id === profileId;
  return <section aria-label={profileName + ' profile wall'} className="space-y-4">
    {allowVisitorPosts && !ownPage && <div id="profile-wall-composer" className="scroll-mt-40 rounded-3xl border border-rcl-blue/20 bg-[linear-gradient(140deg,#0b1e2d,#07111b)] p-4 sm:p-5">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-orange">The Wall · RCH Community</p>
      <h2 className="mt-1 font-display text-xl font-black uppercase">Post on {profileName}'s wall</h2>
      <p className="mt-1 text-xs leading-5 text-white/45">Show love, drop a shoutout, or start a basketball conversation.</p>
      {user ? <>
        <textarea aria-label={'Post on ' + profileName + ' wall'} maxLength={2000} rows={3} value={draft} onChange={event => setDraft(event.target.value)} placeholder={'Say something to ' + profileName + '…'} className="mt-4 min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-rcl-blue/50" />
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-white/35">{draft.length}/2000</span><button type="button" onClick={() => void publish()} disabled={!draft.trim() || saving === 'publish'} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-40"><FaPaperPlane />{saving === 'publish' ? 'Posting…' : 'Post to wall'}</button></div>
      </> : <Link href={'/auth/sign-in?redirect=' + encodeURIComponent('/social/profile/' + profileId)} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase text-black">Sign in to post</Link>}
    </div>}
    {ownPage && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div><p className="text-sm font-bold">Your community wall</p><p className="text-xs text-white/45">See your posts and the messages people leave for you.</p></div><Link href="/create/social" className="rounded-xl bg-rcl-blue px-4 py-2.5 text-xs font-black uppercase text-white">Create a post</Link></div>}
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!posts.length && <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center"><FaBasketball className="mx-auto text-3xl text-rcl-blue" /><h3 className="mt-3 font-display text-xl font-black uppercase">The wall is open</h3><p className="mt-2 text-sm text-white/45">Be the first to start the conversation.</p></div>}
    {posts.map(post => {
      const postComments = comments.filter(item => item.post_id === post.id);
      const postReactions = reactions.filter(item => item.post_id === post.id);
      const myReaction = postReactions.some(item => item.user_id === user?.id);
      const guestPost = post.target_profile_id === profileId && post.author_id !== profileId;
      return <article key={post.id} id={'wall-post-' + post.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#08111b]/90">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0">
            <SocialIdentity author={post.author ?? undefined} compact />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/40"><span>{new Date(post.created_at).toLocaleString()}</span>{guestPost && <span className="rounded-full bg-rcl-orange/10 px-2 py-1 text-rcl-orange">Posted on {profileName}'s wall</span>}{post.is_automated && <span className="text-rcl-blue">Official activity</span>}</div>
          </div>
          {ownPage && guestPost && !post.is_automated && <button type="button" title="Remove post from my wall" aria-label="Remove visitor post" onClick={() => void removeFromWall(post)} disabled={saving === 'delete-' + post.id} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/35 hover:text-red-300 disabled:opacity-40"><FaTrash /></button>}
          </div>
          <div className="mt-3 break-words text-[15px] leading-6 text-white/85"><RichPostBody body={post.body} /></div>
        </div>
        {(post.media_urls ?? []).map((url, index) => /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url)
          ? <video key={index} src={url} controls playsInline className="max-h-[480px] w-full bg-black object-contain" />
          : <img key={index} src={url} alt="Wall post media" className="max-h-[480px] w-full object-contain bg-black" />)}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
          <button type="button" aria-pressed={myReaction} onClick={() => void toggleHeat(post.id)} disabled={saving === 'react-' + post.id} className={'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold disabled:opacity-40 ' + (myReaction ? 'border-rcl-orange/45 bg-rcl-orange/10 text-rcl-orange' : 'border-white/10 text-white/60 hover:text-rcl-orange')}><FaFire /> {postReactions.length} Heat</button>
          <button type="button" aria-expanded={Boolean(expanded[post.id])} onClick={() => setExpanded(current => ({ ...current, [post.id]: !current[post.id] }))} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-white/60"><FaCommentDots /> {postComments.length} Comments</button>
          <Link href={'/social/post/' + post.id} className="ml-auto inline-flex min-h-10 items-center px-2 text-xs font-bold text-rcl-blue">Full post →</Link>
        </div>
        {expanded[post.id] && <div className="space-y-3 border-t border-white/10 bg-black/15 p-4 sm:p-5">
          {!postComments.length && <p className="text-xs text-white/40">No comments yet. Start the conversation.</p>}
          {postComments.map(comment => <div key={comment.id} className={'rounded-xl border border-white/[.07] bg-white/[.025] p-3 ' + (comment.parent_id ? 'ml-5' : '')}>
            <div className="flex items-center justify-between gap-2"><Link href={'/social/profile/' + comment.author_id} className="text-xs font-black text-rcl-blue">{commentAuthors[comment.author_id] || 'RCH Member'}</Link><span className="text-[10px] text-white/30">{new Date(comment.created_at).toLocaleDateString()}</span></div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/75">{comment.body}</p>
            {user && <button type="button" onClick={() => { setReplyTo(current => ({ ...current, [post.id]: comment.id })); }} className="mt-2 text-[11px] font-bold text-rcl-orange">Reply</button>}
          </div>)}
          {user ? <div>
            {replyTo[post.id] && <div className="mb-2 flex items-center justify-between text-xs text-rcl-orange"><span>Replying to a comment</span><button type="button" onClick={() => setReplyTo(current => ({ ...current, [post.id]: null }))}>Cancel reply</button></div>}
            <div className="flex items-end gap-2"><textarea aria-label="Write a comment" rows={2} maxLength={1000} value={commentDrafts[post.id] || ''} onChange={event => setCommentDrafts(current => ({ ...current, [post.id]: event.target.value }))} placeholder="Add a comment…" className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-rcl-blue/50" /><button type="button" onClick={() => void addComment(post.id)} disabled={!commentDrafts[post.id]?.trim() || saving === 'comment-' + post.id} aria-label="Send comment" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rcl-orange text-black disabled:opacity-40"><FaPaperPlane /></button></div>
          </div> : <Link href={'/auth/sign-in?redirect=' + encodeURIComponent('/social/profile/' + profileId)} className="text-xs font-bold text-rcl-blue">Sign in to comment</Link>}
        </div>}
      </article>;
    })}
    {posts.length === 60 && <p className="text-center text-xs text-white/40">Showing the latest 60 posts.</p>}
  </section>;
}
