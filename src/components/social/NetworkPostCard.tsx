'use client';

import Link from 'next/link';
import {
  FaBookmark,
  FaCheck,
  FaComment,
  FaRetweet,
  FaShareNodes,
  FaTrash,
  FaVideo,
} from 'react-icons/fa6';
import { RichPostBody } from '@/components/SocialRichContent';
import { SocialIdentity } from '@/components/SocialIdentity';

export type NetworkAuthor = {
  id?: string;
  display_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_vip?: boolean | null;
  vip_label?: string | null;
  is_system_account?: boolean | null;
  system_account_key?: string | null;
  rep?: number;
  level?: number;
};

export type NetworkComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: NetworkAuthor;
};

export type NetworkReaction = {
  user_id: string;
  post_id: string;
  type: string;
};

export type NetworkRepost = {
  id: string;
  post_id: string;
  profile_id: string;
  created_at: string;
  profile?: NetworkAuthor;
};

export type NetworkPost = {
  id: string;
  author_id: string;
  body: string;
  media_urls: string[];
  created_at: string;
  is_automated?: boolean;
  automation_type?: string | null;
  author?: NetworkAuthor;
  comments?: NetworkComment[];
  reactions?: NetworkReaction[];
  reposts?: NetworkRepost[];
};

export type NetworkFeedItem = {
  key: string;
  post: NetworkPost;
  feed_at: string;
  repost?: NetworkRepost;
};

const reactions = [
  { type: 'bucket', emoji: '🏀', label: 'Bucket', shortLabel: 'Bucket' },
  { type: 'heat', emoji: '🔥', label: 'Heat Check', shortLabel: 'Heat' },
  { type: 'strong', emoji: '💪', label: 'Tough', shortLabel: 'Tough' },
  { type: 'locked', emoji: '🔒', label: 'Locked Up', shortLabel: 'Lock' },
  { type: 'money', emoji: '🎯', label: 'Pure', shortLabel: 'Pure' },
  { type: 'watch', emoji: '👀', label: 'I See You', shortLabel: 'Watch' },
  { type: 'king', emoji: '👏', label: 'Salute', shortLabel: 'Salute' },
  { type: 'certified', emoji: '🧊', label: 'Cold Blooded', shortLabel: 'Cold' },
  { type: 'highlight', emoji: '😂', label: "That's Crazy", shortLabel: 'Crazy' },
  { type: 'champ', emoji: '🏆', label: 'Championship', shortLabel: 'Champ' },
];

export function NetworkPostCard({
  item,
  userId,
  following,
  saved,
  openComments,
  comment,
  reactionBurst,
  onCommentChange,
  onToggleComments,
  onComment,
  onReact,
  onSave,
  onShare,
  onFollow,
  onToggleRepost,
  onDelete,
}: {
  item: NetworkFeedItem;
  userId?: string;
  following: boolean;
  saved: boolean;
  openComments: boolean;
  comment: string;
  reactionBurst: string | null;
  onCommentChange: (value: string) => void;
  onToggleComments: () => void;
  onComment: () => void;
  onReact: (type: string) => void;
  onSave: () => void;
  onShare: () => void;
  onFollow: () => void;
  onToggleRepost: () => void;
  onDelete?: () => void;
}) {
  const { post, repost } = item;
  const mine = post.reactions?.find((reaction) => reaction.user_id === userId);
  const myRepost = post.reposts?.some((entry) => entry.profile_id === userId) ?? false;
  const reactionCount = post.reactions?.length ?? 0;
  const commentCount = post.comments?.length ?? 0;
  const repostCount = post.reposts?.length ?? 0;
  const profileHref = `/social/profile/${post.author_id}`;
  const official = Boolean(post.author?.is_system_account);
  const mediaUrls = (post.media_urls ?? []).filter(Boolean);
  const videoPost = mediaUrls.length > 0 && isVideoUrl(mediaUrls[0]);
  const mediaLabel = videoPost ? 'RCL Clip' : mediaUrls.length ? 'RCL Moment' : null;
  const reactionCounts = (post.reactions ?? []).reduce<Record<string, number>>((counts, reaction) => {
    counts[reaction.type] = (counts[reaction.type] ?? 0) + 1;
    return counts;
  }, {});
  const topReactions = reactions
    .map((reaction) => ({ ...reaction, count: reactionCounts[reaction.type] ?? 0 }))
    .filter((reaction) => reaction.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <article id={`post-${post.id}`} className={`overflow-hidden rounded-2xl border bg-[#08111b]/90 shadow-[0_18px_60px_rgba(0,0,0,.22)] ${official ? 'border-rcl-blue/30' : 'border-white/10'}`}>
      {repost && (
        <div className="flex items-center gap-2 border-b border-white/[.06] bg-white/[.018] px-4 py-2.5 text-xs font-bold text-white/35 sm:px-5">
          <FaRetweet className="text-rcl-blue" />
          <Link href={`/social/profile/${repost.profile_id}`} className="truncate hover:text-white">
            {repost.profile?.display_name || repost.profile?.username || 'RCL member'} reposted
          </Link>
          <span className="ml-auto shrink-0">{formatTime(repost.created_at)}</span>
        </div>
      )}

      {official && (
        <div className="flex items-center gap-2 border-b border-rcl-blue/15 bg-rcl-blue/[.055] px-4 py-2 text-[10px] font-black uppercase tracking-[.18em] text-rcl-blue sm:px-5">
          <span className="h-1.5 w-1.5 rounded-full bg-rcl-orange" /> RCL Network · Official Activity
        </div>
      )}

      {mediaLabel && !official && (
        <div className="flex items-center justify-between gap-3 border-b border-white/[.06] bg-[linear-gradient(90deg,rgba(255,79,22,.055),rgba(21,159,255,.035))] px-4 py-2 sm:px-5">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-rcl-orange">{videoPost ? <FaVideo /> : <span aria-hidden="true">📸</span>} {mediaLabel}</span>
          <Link href={`${profileHref}?tab=highlights`} className="text-[10px] font-black uppercase tracking-[.16em] text-rcl-blue hover:text-white">The Tape →</Link>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link href={profileHref} aria-label={`Open ${post.author?.display_name ?? 'RCL member'} profile`}>
            <SocialIdentity author={post.author} compact />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={profileHref} className="truncate text-sm font-black hover:text-rcl-orange">
                    {post.author?.display_name ?? post.author?.username ?? 'RCL Member'}
                  </Link>
                  {official ? (
                    <span className="rounded-full border border-rcl-blue/25 bg-rcl-blue/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rcl-blue">✓ Official</span>
                  ) : post.author?.is_vip ? (
                    <span className="rcl-vip-chip" title="RCL VIP verified member">
                      <span aria-hidden="true">♛</span>
                      {post.author.vip_label || 'VIP'}
                    </span>
                  ) : null}
                  {post.author?.role && !official && <span className="text-[10px] font-black uppercase tracking-wider text-white/25">{post.author.role}</span>}
                </div>
                <p className="mt-0.5 text-xs text-white/25">{official ? 'Official RCL account' : `${formatRep(post.author?.rep ?? 0)} REP · LVL ${post.author?.level ?? 1}`} · {formatTime(post.created_at)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {userId && post.author_id !== userId && !official && (
                  <button type="button" onClick={onFollow} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${following ? 'border-rcl-blue/25 text-rcl-blue' : 'border-white/10 text-white/45 hover:text-white'}`}>
                    {following ? <><FaCheck className="mr-1 inline" />Following</> : 'Follow'}
                  </button>
                )}
                {onDelete && <button type="button" onClick={onDelete} className="rounded-lg p-2 text-white/20 hover:text-red-300" aria-label="Delete post"><FaTrash /></button>}
              </div>
            </div>
            <RichPostBody body={post.body} />
          </div>
        </div>
      </div>

      {mediaUrls.length > 0 && (
        <div className="border-y border-white/[.07] bg-black">
          {videoPost ? (
            <video src={mediaUrls[0]} controls playsInline preload="metadata" className="max-h-[680px] w-full object-contain" />
          ) : (
            <div className={`grid gap-0.5 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mediaUrls.slice(0, 10).map((url, index) => (
                <div key={`${url}-${index}`} className={`relative overflow-hidden bg-[#05080d] ${mediaUrls.length === 3 && index === 0 ? 'col-span-2' : ''}`}>
                  <img src={url} alt={`Post media ${index + 1}`} className={`${mediaUrls.length === 1 ? 'max-h-[680px] w-full object-contain' : 'aspect-square h-full w-full object-cover'}`} />
                  {index === 9 && mediaUrls.length > 10 && <div className="absolute inset-0 grid place-items-center bg-black/65 text-3xl font-black">+{mediaUrls.length - 10}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 sm:px-5">
        <div className="rounded-2xl border border-white/[.06] bg-black/15 p-2.5">
          <div className="mb-2 flex min-h-6 items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[10px] font-black uppercase tracking-[.18em] text-white/45">RCL Reactions</span>
              {topReactions.length > 0 && (
                <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                  {topReactions.map((reaction) => (
                    <span key={reaction.type} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/[.035] px-1.5 py-0.5 text-[9px] font-bold text-white/40">
                      <span aria-hidden="true">{reaction.emoji}</span>
                      {reaction.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-white/25">
              {reactionCount} {reactionCount === 1 ? 'reaction' : 'reactions'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {reactions.map((reaction) => {
              const selected = mine?.type === reaction.type;
              const count = reactionCounts[reaction.type] ?? 0;

              return (
                <button
                  key={reaction.type}
                  type="button"
                  title={reaction.label}
                  aria-label={`${reaction.label}${count ? `, ${count}` : ''}`}
                  aria-pressed={selected}
                  onClick={() => onReact(reaction.type)}
                  className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition duration-150 active:scale-95 ${
                    reactionBurst === reaction.type ? 'scale-110' : ''
                  } ${
                    selected
                      ? 'border-rcl-blue/55 bg-rcl-blue/10 ring-1 ring-rcl-blue/50 shadow-[0_0_18px_rgba(255,79,22,.16)]'
                      : 'border-white/[.05] bg-white/[.018] hover:border-white/10 hover:bg-white/[.04]'
                  }`}
                >
                  {count > 0 && (
                    <span className="absolute right-1 top-1 rounded-full bg-white/[.06] px-1 text-[8px] font-black leading-4 text-white/45">
                      {count}
                    </span>
                  )}
                  <span aria-hidden="true" className="text-[24px] leading-none">{reaction.emoji}</span>
                  <span className={`mt-1 max-w-full truncate text-[8px] font-black uppercase tracking-[.08em] ${selected ? 'text-rcl-orange' : 'text-white/35'}`}>
                    {reaction.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-3 px-1 text-[10px] font-bold text-white/25">
          <button type="button" onClick={onToggleComments} className="hover:text-white">{commentCount} comments</button>
          <span>{repostCount} repost{repostCount === 1 ? '' : 's'}</span>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1 border-t border-white/[.06] pt-2">
          <button type="button" onClick={onToggleComments} className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black uppercase tracking-wider text-white/40 hover:bg-white/[.04] hover:text-white"><FaComment className="text-sm" /><span>Comment</span></button>
          <button type="button" onClick={onToggleRepost} className={`inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-white/[.04] ${myRepost ? 'text-rcl-blue' : 'text-white/40 hover:text-white'}`}><FaRetweet className="text-sm" /><span>{myRepost ? 'Reposted' : 'Repost'}</span></button>
          <button type="button" onClick={onShare} className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black uppercase tracking-wider text-white/40 hover:bg-white/[.04] hover:text-white"><FaShareNodes className="text-sm" /><span>Share</span></button>
          <button type="button" onClick={onSave} className={`inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-white/[.04] ${saved ? 'text-rcl-orange' : 'text-white/40 hover:text-white'}`}><FaBookmark className="text-sm" /><span>Save</span></button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          {mediaLabel ? <Link href="/create/social?mode=clip" className="text-[10px] font-black uppercase tracking-wider text-rcl-orange/65 hover:text-rcl-orange">Drop yours</Link> : <span />}
          <Link href={`/social/post/${post.id}`} className="text-[10px] font-black uppercase tracking-wider text-white/20 hover:text-rcl-blue">Open post</Link>
        </div>
      </div>

      {openComments && (
        <div className="border-t border-white/10 bg-black/10 px-4 py-4 sm:px-5">
          {post.comments?.slice(-6).map((entry) => (
            <div key={entry.id} className="mb-3 flex gap-2">
              <Link href={`/social/profile/${entry.author_id}`}><SocialIdentity author={entry.author} compact /></Link>
              <div className="min-w-0 flex-1 rounded-2xl bg-white/[.04] px-3 py-2">
                <Link href={`/social/profile/${entry.author_id}`} className="text-xs font-black hover:text-rcl-orange">{entry.author?.display_name ?? entry.author?.username ?? 'RCL Member'}</Link>
                <p className="mt-1 break-words text-xs leading-5 text-white/60">{entry.body}</p>
              </div>
            </div>
          ))}
          <form onSubmit={(event) => { event.preventDefault(); onComment(); }} className="flex gap-2">
            <input aria-label="Add a reply" value={comment} onChange={(event) => onCommentChange(event.target.value)} placeholder="Add a reply…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs outline-none focus:border-rcl-blue/40" />
            <button disabled={!comment.trim()} className="rounded-xl bg-rcl-orange px-4 py-2 text-xs font-black uppercase tracking-wider text-black disabled:opacity-30">Send</button>
          </form>
        </div>
      )}
    </article>
  );
}

function formatRep(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);
}