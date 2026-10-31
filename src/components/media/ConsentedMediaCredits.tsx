'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaArrowRight, FaCheck, FaCamera, FaUserTag, FaXmark } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type TagRequest = {
  id: string; post_id: string; requester_id: string; tagged_profile_id: string;
  tag_kind: 'player' | 'creator'; status: 'pending' | 'accepted' | 'declined';
};
type OwnPost = { id: string; body: string; created_at: string };
const boxClass = 'rounded-xl border border-[#44484e] bg-[#141618] p-4 sm:p-5';
const inputClass = 'min-h-11 w-full rounded-lg border border-[#70747a] bg-[#0b0c0e] px-3 text-sm text-white';

/** Tag a player or credit a creator only after that member explicitly accepts. */
export function ConsentedMediaCredits({ profileId }: { profileId: string }) {
  const db = useMemo(() => getSupabaseClient(true) as any, []);
  const { user, loading: authLoading } = useAuth();
  const owner = user?.id === profileId;
  const [incoming, setIncoming] = useState<TagRequest[]>([]);
  const [accepted, setAccepted] = useState<TagRequest[]>([]);
  const [ownPosts, setOwnPosts] = useState<OwnPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [postId, setPostId] = useState('');
  const [username, setUsername] = useState('');
  const [kind, setKind] = useState<'player' | 'creator'>('player');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!db) { setSupported(false); setLoading(false); return; }
    const { data, error } = await db.from('rch_post_tag_requests')
      .select('id,post_id,requester_id,tagged_profile_id,tag_kind,status')
      .eq('tagged_profile_id', profileId).order('created_at', { ascending: false }).limit(30);
    if (error) { setSupported(false); setLoading(false); return; }
    setIncoming((data || []).filter((tag: TagRequest) => tag.status === 'pending'));
    setAccepted((data || []).filter((tag: TagRequest) => tag.status === 'accepted'));
    if (owner) {
      const posts = await db.from('posts').select('id,body,created_at')
        .eq('author_id', profileId).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(25);
      if (!posts.error) setOwnPosts(posts.data || []);
    }
    setSupported(true); setLoading(false);
  }, [db, owner, profileId]);

  useEffect(() => { void load(); }, [load]);

  async function decide(tag: TagRequest, accept: boolean) {
    if (!db || !owner || busy) return;
    setBusy(true); setMessage('');
    const result = await db.from('rch_post_tag_requests').update({
      status: accept ? 'accepted' : 'declined'
    }).eq('id', tag.id).eq('tagged_profile_id', profileId).eq('status', 'pending');
    setBusy(false);
    if (result.error) { setMessage('Unable to save your decision.'); return; }
    setMessage(accept ? 'You approved this credit.' : 'Request declined.');
    await load();
  }

  async function requestTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !owner || !user || busy || !postId || !username.trim()) return;
    setBusy(true); setMessage('');
    const name = username.replace(/^@/, '').trim().toLowerCase();
    const { data: member, error: lookupError } = await db.from('profiles')
      .select('id').eq('username', name).maybeSingle();
    if (lookupError || !member || member.id === user.id) {
      setMessage('Could not request that member. Check the username and visibility.');
      setBusy(false); return;
    }
    const result = await db.from('rch_post_tag_requests').insert({
      post_id: postId, requester_id: user.id, tagged_profile_id: member.id,
      tag_kind: kind, status: 'pending'
    });
    setBusy(false);
    if (result.error) { setMessage('Request unavailable. Only eligible adults may be tagged, and duplicates are not allowed.'); return; }
    setMessage('Permission requested. No public tag appears unless they approve.');
    setExpanded(false); setUsername(''); setPostId('');
    await load();
  }

  // Missing migrations are treated as a feature-off state; profiles remain usable.
  if (loading || authLoading || !supported) return null;
  if (!owner && accepted.length === 0) return null;

  return <section aria-label="Consent-controlled player and creator credits" className={'mt-5 '+boxClass}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase">
        <FaUserTag aria-hidden="true" className="text-[#ff768c]"/> Credits & tags
      </h2>
      {owner && <button type="button" onClick={() => { setExpanded(!expanded); setMessage(''); }}
        aria-expanded={expanded} className="min-h-11 rounded-lg border border-[#70747a] px-3 text-xs font-bold">
        {expanded ? 'Close' : 'Request a credit'}
      </button>}
    </div>
    {owner && incoming.length > 0 && <div className="mt-3 space-y-2" aria-label="Pending requests">
      <p className="text-xs font-bold text-[#ff98aa]">Your approval needed ({incoming.length})</p>
      {incoming.map(tag => <div key={tag.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#70747a] bg-[#202326] p-3">
        <div className="text-xs">
          <span className="block font-bold">{tag.tag_kind === 'creator' ? 'Creator credit' : 'Player tag'}</span>
          <Link href={'/social/post/'+tag.post_id} className="mt-1 inline-block text-[#ff98aa] underline">Review original post</Link>
          <Link href={'/social/profile/'+tag.requester_id} className="ml-2 text-[#d0d1d4] underline">Requested by</Link>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void decide(tag, true)} disabled={busy}
            aria-label="Accept request" className="grid h-11 w-11 place-items-center rounded-lg bg-[#c8102e] text-white disabled:opacity-40"><FaCheck/></button>
          <button type="button" onClick={() => void decide(tag, false)} disabled={busy}
            aria-label="Decline request" className="grid h-11 w-11 place-items-center rounded-lg border border-[#70747a] disabled:opacity-40"><FaXmark/></button>
        </div>
      </div>)}
    </div>}
    {accepted.length > 0 && <div className="mt-3 space-y-2">
      <p className="text-xs font-bold text-[#d0d1d4]">Approved appearances</p>
      {accepted.slice(0,6).map(tag => <div key={tag.id} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[#44484e] bg-[#202326] px-3">
        <Link href={'/social/post/'+tag.post_id} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white">
          <FaCamera className="text-[#ff768c]" aria-hidden="true"/>
          {tag.tag_kind === 'creator' ? 'Creator credit' : 'Player appearance'} <FaArrowRight aria-hidden="true"/>
        </Link>
        {owner && <button type="button" disabled={busy} onClick={() => void (async()=>{
          if (!db || busy) return;
          setBusy(true);
          const { error } = await db.from('rch_post_tag_requests').delete()
            .eq('id',tag.id).eq('tagged_profile_id',profileId);
          setBusy(false); setMessage(error?'Could not withdraw credit.':'Credit withdrawn.');
          if (!error) await load();
        })()} className="min-h-11 px-2 text-xs text-[#ff98aa]">Withdraw</button>}
      </div>)}
    </div>}
    {owner && expanded && <form onSubmit={(event) => void requestTag(event)}
      className="mt-4 space-y-3 border-t border-[#44484e] pt-4">
      <p className="text-xs text-[#d0d1d4]">Choose your published post and a member. Their approval is required.</p>
      <label className="block text-xs font-bold">Your post
        <select required value={postId} onChange={e => setPostId(e.target.value)} className={'mt-1 '+inputClass}>
          <option value="">Select a post</option>
          {ownPosts.map(post=><option key={post.id} value={post.id}>{(post.body||'Basketball post').slice(0,48)}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold">Member username
        <input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username"
          maxLength={60} className={'mt-1 '+inputClass}/>
      </label>
      <label className="block text-xs font-bold">Credit type
        <select value={kind} onChange={e=>setKind(e.target.value as 'player'|'creator')} className={'mt-1 '+inputClass}>
          <option value="player">Player in the post</option>
          <option value="creator">Creator of the media</option>
        </select>
      </label>
      <button disabled={busy || !postId || !username.trim()} type="submit"
        className="min-h-11 w-full rounded-lg bg-[#c8102e] px-4 text-sm font-bold disabled:opacity-40">
        {busy?'Sending…':'Request permission'}
      </button>
      <p className="text-xs text-[#a6a8ad]">This is a community credit, not RCH TV licensing or official player verification. Minors cannot be tagged in this release.</p>
    </form>}
    {message && <p role="status" className="mt-3 text-xs text-[#d0d1d4]">{message}</p>}
    {owner && <Link href="/media/creators/apply"
      className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#ff98aa]">
      Explore RCH creator opportunities <FaArrowRight aria-hidden="true"/>
    </Link>}
  </section>;
}
