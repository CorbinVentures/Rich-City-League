'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck, FaCommentDots, FaPaperPlane, FaPenToSquare, FaUserPlus } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function PublicProfileActions({ profileId, profileName }: { profileId: string; profileName: string }) {
  const { user } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState<'message' | null>(null);
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
      {ownProfile && <Link href="/profile" className="rcl-profile-edit-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rcl-blue px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><FaPenToSquare />Edit profile</Link>}
      {!ownProfile && <button onClick={() => void toggleFollow()} disabled={followBusy} className={`rcl-profile-follow-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 ${following ? 'is-following border border-rcl-orange/50 bg-rcl-orange/10 text-rcl-orange' : 'bg-white text-black'}`}>{following ? <FaCheck /> : <FaUserPlus />}{followBusy ? 'Working…' : following ? 'Following' : 'Follow'}</button>}
      {!ownProfile && <button onClick={() => void sendMessage()} disabled={busy === 'message'} className="rcl-profile-message-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"><FaCommentDots />{busy === 'message' ? 'Opening…' : 'Message'}</button>}
      {!ownProfile && <Link href={`/social/profile/${profileId}?tab=wall#profile-wall-composer`} aria-label={`Post on ${profileName}'s wall`} className="rcl-profile-wall-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white/75"><FaPaperPlane />Post on wall</Link>}
    </div>
    {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

  </div>;
}
