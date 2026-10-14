'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowRight, FaCheck, FaMagnifyingGlass, FaSpinner, FaUserPlus, FaUsers } from 'react-icons/fa6';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

export type FollowDirectoryMode = 'followers' | 'following';

type MemberProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  is_vip: boolean | null;
  vip_label: string | null;
};

const PAGE_SIZE = 24;

/** Uses the existing follows relationship and profile RLS, without exposing private accounts. */
export function ProfileFollowDirectory({
  profileId,
  profileName,
  mode,
}: {
  profileId: string;
  profileName: string;
  mode: FollowDirectoryMode;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const db = useMemo(() => getSupabaseClient(true), []);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadPage = useCallback(async (offset: number, append: boolean) => {
    if (!db) {
      setError('The member directory is temporarily unavailable.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const column = mode === 'followers' ? 'following_id' : 'follower_id';
    const { data, error: followError } = await db.from('follows')
      .select('follower_id,following_id,created_at')
      .eq(column, profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (followError) {
      setError('Could not load this list. Please try again.');
      setLoading(false);
      return;
    }

    const relationships = data ?? [];
    const ids = relationships.map((row) => mode === 'followers' ? row.follower_id : row.following_id);
    let visible: MemberProfile[] = [];
    if (ids.length) {
      const { data: profiles, error: profileError } = await db.from('profiles')
        .select('id,display_name,username,avatar_url,role,is_vip,vip_label')
        .in('id', ids)
        .eq('is_active', true)
        .eq('profile_visibility', 'public');
      if (profileError) {
        setError('Could not load member profiles. Please try again.');
        setLoading(false);
        return;
      }
      const profilesById = new Map(
        ((profiles ?? []) as MemberProfile[]).map((profile) => [profile.id, profile])
      );
      visible = ids.map((id) => profilesById.get(id)).filter((profile): profile is MemberProfile => Boolean(profile));
    }

    if (user?.id && visible.length) {
      const { data: follows } = await db.from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', visible.map((profile) => profile.id));
      const followed = (follows ?? []).map((row) => row.following_id);
      setFollowingIds((current) => {
        const updated = append ? new Set(current) : new Set<string>();
        for (const id of followed) updated.add(id);
        return updated;
      });
    } else if (!append) {
      setFollowingIds(new Set());
    }

    setMembers((current) => append
      ? [...current, ...visible.filter((profile) => !current.some((member) => member.id === profile.id))]
      : visible
    );
    setNextOffset(offset + relationships.length);
    setHasMore(relationships.length === PAGE_SIZE);
    setLoading(false);
  }, [db, mode, profileId, user?.id]);

  useEffect(() => {
    setSearch('');
    void loadPage(0, false);
  }, [loadPage]);

  const toggleFollow = async (targetId: string) => {
    if (!user) {
      const redirect = '/social/profile/' + profileId + '?tab=' + mode;
      router.push('/auth/sign-in?redirect=' + encodeURIComponent(redirect));
      return;
    }
    if (!db || targetId === user.id || busyId) return;
    setBusyId(targetId);
    setError('');
    const alreadyFollowing = followingIds.has(targetId);
    const result = alreadyFollowing
      ? await db.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)
      : await db.from('follows').insert({ follower_id: user.id, following_id: targetId });
    if (result.error) {
      setError('Could not update your follow. Please try again.');
    } else {
      setFollowingIds((current) => {
        const updated = new Set(current);
        if (alreadyFollowing) updated.delete(targetId);
        else updated.add(targetId);
        return updated;
      });
      // Removing someone from your own Following list should also remove their row.
      if (mode === 'following' && profileId === user.id && alreadyFollowing) {
        setMembers((current) => current.filter((member) => member.id !== targetId));
      }
      router.refresh();
    }
    setBusyId(null);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      (member.display_name ?? '').toLowerCase().includes(term)
      || (member.username ?? '').toLowerCase().includes(term)
    );
  }, [members, search]);

  const isFollowers = mode === 'followers';
  const title = isFollowers ? 'Followers' : 'Following';
  return (
    <section className="mx-auto max-w-3xl" aria-label={title + ' for ' + profileName}>
      <div className="rounded-2xl border border-white/10 bg-[#091622] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue">RCH Social Network</p>
            <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-black uppercase text-white">
              <FaUsers className="text-rcl-orange" /> {title}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {isFollowers ? 'Members following ' + profileName : 'Members ' + profileName + ' follows'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={'/social/profile/' + profileId + '?tab=followers'}
              aria-current={isFollowers ? 'page' : undefined}
              className={'rounded-xl border px-4 py-2.5 text-xs font-black uppercase ' + (isFollowers ? 'border-rcl-blue bg-rcl-blue/20 text-white' : 'border-white/15 text-white/70 hover:text-white')}>
              Followers
            </Link>
            <Link href={'/social/profile/' + profileId + '?tab=following'}
              aria-current={!isFollowers ? 'page' : undefined}
              className={'rounded-xl border px-4 py-2.5 text-xs font-black uppercase ' + (!isFollowers ? 'border-rcl-blue bg-rcl-blue/20 text-white' : 'border-white/15 text-white/70 hover:text-white')}>
              Following
            </Link>
          </div>
        </div>
        <label className="mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-[#030b13] px-3 focus-within:border-rcl-blue/80">
          <FaMagnifyingGlass className="shrink-0 text-white/50" />
          <span className="sr-only">Filter loaded members</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search loaded members" aria-label="Search loaded members"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/45" />
        </label>
      </div>

      {error && <div role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
        {error} <button type="button" onClick={() => void loadPage(nextOffset === 0 ? 0 : nextOffset, nextOffset > 0)}
          className="ml-2 font-bold underline">Retry</button>
      </div>}

      <div className="mt-4 space-y-2">
        {filtered.map((member) => {
          const ownAccount = member.id === user?.id;
          const followed = followingIds.has(member.id);
          return <article key={member.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#091622] px-3 py-3 sm:px-5">
            <Link href={'/social/profile/' + member.id} className="shrink-0" aria-label={'Open ' + (member.display_name || member.username || 'member') + ' profile'}>
              <span className="block h-12 w-12 overflow-hidden rounded-full border border-rcl-blue/30 bg-white/10">
                <ProfileAvatarMedia src={member.avatar_url} alt="" className="h-full w-full object-cover" />
              </span>
            </Link>
            <Link href={'/social/profile/' + member.id} className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-bold text-white">{member.display_name || member.username || 'RCH Member'}</span>
                {member.is_vip && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-200" title={member.vip_label || 'VIP'}>VIP</span>}
              </div>
              {member.username && <p className="truncate text-xs text-white/60">@{member.username}</p>}
              <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-rcl-blue">{member.role || 'Member'}</p>
            </Link>
            {ownAccount
              ? <span className="shrink-0 text-xs font-bold text-white/55">You</span>
              : <button type="button" disabled={busyId !== null} onClick={() => void toggleFollow(member.id)}
                  aria-label={(followed ? 'Unfollow ' : 'Follow ') + (member.display_name || member.username || 'member')}
                  className={'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 ' + (followed ? 'border border-rcl-blue/40 bg-rcl-blue/15 text-rcl-blue' : 'bg-white text-black')}>
                  {busyId === member.id ? <FaSpinner className="animate-spin" /> : followed ? <FaCheck /> : <FaUserPlus />}
                  {busyId === member.id ? 'Working…' : followed ? 'Following' : 'Follow'}
                </button>}
            <Link href={'/social/profile/' + member.id} className="hidden text-white/40 hover:text-white sm:block" aria-label="View profile"><FaArrowRight /></Link>
          </article>;
        })}
      </div>
      {!loading && !filtered.length && !error && (
        <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-9 text-center text-sm text-white/60">
          {search ? 'No matching members among those loaded. Load more to see additional profiles.' :
            members.length ? 'No members available to show.' :
            isFollowers ? 'No public followers to show yet.' : 'No public followed accounts to show yet.'}
        </div>
      )}
      {loading && <div className="flex items-center justify-center gap-2 p-7 text-sm text-white/60" role="status">
        <FaSpinner className="animate-spin" /> Loading members…
      </div>}
      {hasMore && !loading && <button type="button" onClick={() => void loadPage(nextOffset, true)}
        className="mt-5 min-h-11 w-full rounded-xl border border-rcl-blue/30 bg-rcl-blue/10 px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-rcl-blue/20">
        Load more members
      </button>}
      <p className="mt-5 text-center text-xs text-white/50">
        Only public, active profiles are shown. Member search filters the results loaded so far.
      </p>
    </section>
  );
}
