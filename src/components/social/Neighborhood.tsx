'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowRight, FaHouse, FaSpinner, FaUserPlus, FaXmark } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

type Member = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type Props = { excludeProfileId?: string; followingIds?: string[]; onFollow?: (id: string) => void };

/** Key the session so account changes immediately discard personalized results. */
export function Neighborhood(props: Props) {
  const { user } = useAuth();
  return user ? <NeighborhoodSession key={user.id} {...props} /> : null;
}

function NeighborhoodSession({ excludeProfileId, followingIds = [], onFollow }: Props) {
  const db = useMemo(() => getSupabaseClient(true), []);
  const [members, setMembers] = useState<Member[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        if (!db) throw new Error('Unavailable');
        const result = await db.rpc('get_neighborhood_profiles', { p_limit: 24 });
        if (result.error) throw result.error;
        if (active) setMembers(result.data ?? []);
      } catch {
        if (active) setError('Neighborhood couldn’t load. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [db, attempt]);

  const follow = async (member: Member) => {
    if (!db || busy) return;
    setBusy(member.id);
    setError('');
    try {
      const { error: followError } = await db.rpc('follow_neighborhood_profile', { p_target: member.id });
      if (!mounted.current) return;
      if (followError) throw followError;
      setMembers(current => current.filter(row => row.id !== member.id));
      setNotice(`You’re now following ${member.display_name || member.username || 'this member'}.`);
      onFollow?.(member.id);
    } catch {
      if (mounted.current) setError('Couldn’t follow this profile. Refresh suggestions and try again.');
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  const visible = members.filter(member => member.id !== excludeProfileId && !hidden.includes(member.id) && !followingIds.includes(member.id)).slice(0, 6);
  return <section aria-label="Neighborhood" className="rch-neighborhood rounded-2xl border border-[#d9e4ef] bg-white p-4 text-[#0f2547] shadow-sm sm:p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-black"><FaHouse className="text-[#1768ac]" aria-hidden="true" /> Neighborhood</h2>
        <p className="mt-1 text-sm text-[#52657b]">People you may know. More of your RCH community.</p></div>
      <Link href="/friends" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-bold text-[#1768ac]">Find people <FaArrowRight aria-hidden="true" /></Link>
    </div>
    {notice && <p role="status" className="mb-3 text-sm font-semibold text-[#1768ac]">{notice}</p>}
    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 underline">Refresh suggestions</button></p>}
    {loading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-[#52657b]"><FaSpinner className="animate-spin" aria-hidden="true" /> Finding your Neighborhood…</p>
      : visible.length ? <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3">
        {visible.map(member => {
          const name = member.display_name || member.username || 'RCH Member';
          return <article key={member.id} className="relative w-40 shrink-0 snap-start rounded-xl sm:w-auto sm:min-w-0 border border-[#d9e4ef] bg-[#f5f9fc] px-3 pb-3 pt-5 text-center">
            <button type="button" aria-label={`Hide suggestion for ${name}`} disabled={busy === member.id} onClick={() => setHidden(current => [...current, member.id])} className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-xl text-[#52657b] hover:bg-[#e7eff6]"><FaXmark aria-hidden="true" /></button>
            <Link href={`/social/profile/${member.id}`} className="block">
              <span className="mx-auto mb-3 block h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-[#e7eff6]"><ProfileAvatarMedia src={member.avatar_url} alt="" className="h-full w-full object-cover" /></span>
              <span className="block truncate text-sm font-extrabold">{name}</span>
              <span className="mt-1 block truncate text-xs text-[#52657b]">{member.username ? `@${member.username}` : 'RCH community'}</span>
            </Link>
            <button type="button" disabled={busy !== null} onClick={() => void follow(member)} aria-label={`Follow ${name}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1768ac] px-2 text-xs font-bold text-[#fff] hover:bg-[#12558e] disabled:opacity-60">
              {busy === member.id ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaUserPlus aria-hidden="true" />} {busy === member.id ? 'Following…' : 'Follow'}
            </button>
          </article>;
        })}
      </div> : !error && <p className="py-4 text-sm text-[#52657b]">You’re all caught up. More people will appear as the community grows.</p>}
  </section>;
}
