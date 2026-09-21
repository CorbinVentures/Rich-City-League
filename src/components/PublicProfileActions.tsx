'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCommentDots, FaPaperPlane, FaXmark } from 'react-icons/fa6';
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
    const mine = await supabase.from('conversation_members').select('conversation_id').eq('profile_id', user!.id);
    const ids = ((mine.data ?? []) as { conversation_id: string }[]).map(x => x.conversation_id);
    if (ids.length) {
      const shared = await supabase.from('conversation_members').select('conversation_id').eq('profile_id', profileId).in('conversation_id', ids);
      const sharedIds = ((shared.data ?? []) as { conversation_id: string }[]).map(x => x.conversation_id);
      if (sharedIds.length) {
        const direct = await supabase.from('conversations').select('id').in('id', sharedIds).eq('conversation_type', 'direct').limit(1).maybeSingle();
        if (direct.data) { window.location.href = `/messages/${(direct.data as { id: string }).id}`; return; }
      }
    }
    const conversation = await supabase.from('conversations').insert({
      created_by: user!.id, title: profileName, conversation_type: 'direct',
    } as never).select('id').single();
    const row = conversation.data as { id: string } | null;
    if (conversation.error || !row) { setError(conversation.error?.message ?? 'Could not start this conversation.'); setBusy(null); return; }
    const members = await supabase.from('conversation_members').insert([
      { conversation_id: row.id, profile_id: user!.id },
      { conversation_id: row.id, profile_id: profileId },
    ] as never);
    if (members.error) { setError(members.error.message); setBusy(null); return; }
    window.location.href = `/messages/${row.id}`;
  };

  const ownProfile = user?.id === profileId;
  return <div className="mt-5">
    <div className="flex flex-wrap gap-2">
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
