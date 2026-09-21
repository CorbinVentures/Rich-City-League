'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck, FaCommentDots, FaPaperPlane, FaUserPlus, FaXmark } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function PublicProfileActions({ profileId, profileName }: { profileId: string; profileName: string }) {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const router = useRouter();
  const [composer, setComposer] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState<'post' | 'message' | null>(null);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!supabase || !user || user.id === profileId) return;
    void supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', profileId).maybeSingle().then(({ data }) => setFollowing(Boolean(data)));
  }, [supabase, user, profileId]);

  const toggleFollow = async () => {
    if (!requireAuth() || !supabase || user!.id === profileId) return;
    setFollowBusy(true); setError('');
    const result = following
      ? await supabase.from('follows').delete().eq('follower_id', user!.id).eq('following_id', profileId)
      : await supabase.from('follows').insert({ follower_id: user!.id, following_id: profileId } as never);
    if (result.error) setError(result.error.message); else { setFollowing(!following); router.refresh(); }
    setFollowBusy(false);
  };

  const requireAuth = () => {
    if (user) return true;
    window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(`/social/profile/${profileId}`)}`;
    return false;
  };

  const leavePost = async () => {
    if (!requireAuth() || !supabase || !body.trim()) return;
    setBusy('post'); setError('');
    const { error: postError } = await supabase.from('posts').insert({
      author_id: user!.id, target_profile_id: profileId, body: body.trim(), media_urls: [], status: 'published',
    } as never);
    if (postError) setError(postError.message);
    else { setBody(''); setComposer(false); router.refresh(); }
    setBusy(null);
  };

  const sendMessage = async () => {
    if (!requireAuth() || !supabase || user!.id === profileId) return;
    setBusy('message'); setError('');
    const { data, error: conversationError } = await supabase.rpc('start_direct_conversation', { target_profile_id: profileId } as never);
    const conversationId = data as string | null;
    if (conversationError || !conversationId) { setError(conversationError?.message ?? 'Could not start this conversation.'); setBusy(null); return; }
    window.location.href = `/messages/${conversationId}`;
  };

  const ownProfile = user?.id === profileId;
  return <div className="mt-5">
    <div className="flex flex-wrap gap-2">
      {!ownProfile && <button onClick={() => void toggleFollow()} disabled={followBusy} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-50 ${following ? 'border border-rcl-orange/50 bg-rcl-orange/10 text-rcl-orange' : 'bg-white text-black'}`}>{following ? <FaCheck /> : <FaUserPlus />}{followBusy ? 'Working…' : following ? 'Following' : 'Follow'}</button>}
      {!ownProfile && <button onClick={() => void sendMessage()} disabled={busy === 'message'} className="inline-flex items-center gap-2 rounded-xl bg-rcl-orange px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-black disabled:opacity-50"><FaCommentDots />{busy === 'message' ? 'Opening…' : 'Message'}</button>}
      {!ownProfile && <button onClick={() => { if (requireAuth()) setComposer(true); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/75"><FaPaperPlane />Post on profile</button>}
    </div>
    {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
    {composer && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b1119] p-5 shadow-2xl">
        <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-rcl-orange">POST TO PROFILE</p><h2 className="mt-1 font-display text-2xl font-black uppercase">{profileName}</h2></div><button onClick={() => setComposer(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60"><FaXmark /></button></div>
        <textarea autoFocus value={body} onChange={e => setBody(e.target.value)} maxLength={2000} rows={5} placeholder={`Write something on ${profileName}'s timeline…`} className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white outline-none focus:border-rcl-orange/50" />
        <div className="mt-4 flex items-center justify-between"><span className="text-[9px] text-white/30">{body.length}/2000</span><button onClick={() => void leavePost()} disabled={!body.trim() || busy === 'post'} className="rounded-xl bg-rcl-orange px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-30">{busy === 'post' ? 'Posting…' : 'Post to timeline'}</button></div>
      </div>
    </div>}
  </div>;
}
