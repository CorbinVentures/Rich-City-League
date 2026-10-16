'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaBan, FaCheck, FaCommentDots, FaFlag, FaPaperPlane, FaPenToSquare, FaUserPlus } from 'react-icons/fa6';
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
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState('');

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
    window.location.href = `/auth/sign-in?next=${encodeURIComponent(`/social/profile/${profileId}`)}`;
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

  async function blockMember() {
    if (!requireAuth() || !supabase || user!.id === profileId || safetyBusy) return;
    setSafetyBusy(true);
    setError('');
    const { error: blockError } = await (supabase as any).from('blocks')
      .insert({ blocker_id: user!.id, blocked_id: profileId });
    if (blockError && blockError.code !== '23505') {
      setError(blockError.message || 'Could not block this member.');
      setSafetyBusy(false);
      return;
    }
    router.push('/settings/privacy');
    router.refresh();
  }

  async function reportMember() {
    if (!requireAuth() || !supabase || user!.id === profileId || safetyBusy) return;
    const reason = reportReason.trim();
    if (reason.length < 3 || reason.length > 1000) {
      setError('Describe the concern in 3–1,000 characters.');
      return;
    }
    setSafetyBusy(true);
    setError('');
    setSafetyMessage('');
    const { error: reportError } = await (supabase as any).from('reports').insert({
      reporter_id: user!.id, reported_profile_id: profileId, reason,
    });
    if (reportError) setError(reportError.message || 'Could not send your report.');
    else {
      setSafetyMessage('Your report was submitted for review.');
      setReportReason('');
      setSafetyOpen(false);
    }
    setSafetyBusy(false);
  }

  const ownProfile = user?.id === profileId;
  return <div className="mt-5">
    <div className="flex flex-wrap gap-2">
      {ownProfile && <Link href="/profile" className="rcl-profile-edit-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rcl-blue px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><FaPenToSquare />Edit profile</Link>}
      {!ownProfile && <button onClick={() => void toggleFollow()} disabled={followBusy} className={`rcl-profile-follow-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-50 ${following ? 'is-following border border-rcl-orange/50 bg-rcl-orange/10 text-rcl-orange' : 'bg-white text-black'}`}>{following ? <FaCheck /> : <FaUserPlus />}{followBusy ? 'Working…' : following ? 'Following' : 'Follow'}</button>}
      {!ownProfile && <button onClick={() => void sendMessage()} disabled={busy === 'message'} className="rcl-profile-message-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rcl-orange px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"><FaCommentDots />{busy === 'message' ? 'Opening…' : 'Message'}</button>}
      {!ownProfile && <Link href={`/social/profile/${profileId}?tab=wall#profile-wall-composer`} aria-label={`Post on ${profileName}'s wall`} className="rcl-profile-wall-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white/75"><FaPaperPlane />Post on wall</Link>}
      {!ownProfile && <button type="button" onClick={() => { setSafetyOpen(value => !value); setConfirmBlock(false); }} aria-expanded={safetyOpen} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-400/30 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-red-200"><FaFlag/>Safety</button>}
    </div>
    {!ownProfile && safetyOpen && <section className="mt-4 max-w-xl rounded-2xl border border-white/15 bg-[#071522] p-5" aria-label="Account safety tools">
      <p className="text-xs font-black uppercase tracking-wider text-white">Report or block this member</p>
      <p className="mt-2 text-xs leading-5 text-white/55">Reports go to authorized moderators. Blocking stops social interaction in both directions; it does not erase official league records.</p>
      <label className="mt-4 block text-xs font-bold text-white/75">Reason for report
        <textarea value={reportReason} onChange={event => setReportReason(event.target.value)} maxLength={1000} rows={3} placeholder="Describe the issue (harassment, spam, impersonation, threats, etc.)" className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 p-3 text-sm text-white outline-none focus:border-rcl-blue"/>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" disabled={safetyBusy || reportReason.trim().length < 3} onClick={() => void reportMember()} className="min-h-11 rounded-xl bg-rcl-blue px-4 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"><FaFlag className="mr-2 inline"/>Send report</button>
        {!confirmBlock
          ? <button type="button" disabled={safetyBusy} onClick={() => setConfirmBlock(true)} className="min-h-11 rounded-xl border border-red-400/50 px-4 text-xs font-black uppercase tracking-wider text-red-200 disabled:opacity-50"><FaBan className="mr-2 inline"/>Block member</button>
          : <><button type="button" disabled={safetyBusy} onClick={() => void blockMember()} className="min-h-11 rounded-xl bg-red-400 px-4 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">Confirm block</button><button type="button" onClick={() => setConfirmBlock(false)} className="min-h-11 rounded-xl border border-white/20 px-4 text-xs font-black uppercase tracking-wider text-white">Cancel</button></>}
      </div>
    </section>}
    {safetyMessage && <p role="status" className="mt-3 text-xs text-emerald-300">{safetyMessage}</p>}
    {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}

  </div>;
}
