import Link from 'next/link';
import { formatReputation, reputationProgress, reputationStatus } from '@/lib/reputation';

export type SocialIdentityAuthor = {
  id?: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_vip?: boolean | null;
  vip_label?: string | null;
  rep?: number;
  level?: number;
};

export function SocialIdentity({ author, compact = false, link = true }: { author?: SocialIdentityAuthor | null; compact?: boolean; link?: boolean }) {
  const rep = author?.rep ?? 0;
  const level = author?.level ?? 1;
  const progress = reputationProgress(rep, level);
  const status = reputationStatus(level);
  const name = author?.display_name || author?.username || 'RCL Member';
  const identity = <span className={`rcl-social-identity ${compact ? 'is-compact' : ''}`}>
    <span className={`rcl-rep-avatar status-${status.key} ${author?.is_vip ? 'is-vip' : ''}`} style={{'--rep-progress': progress.percent + '%'} as React.CSSProperties}>
      <span>{author?.avatar_url ? <img src={author.avatar_url} alt="" /> : name.slice(0,1).toUpperCase()}</span>
      {!compact && <em>{level}</em>}
    </span>
    {!compact && <span className="rcl-social-identity-copy"><b>{name}{author?.is_vip && <i>{author.vip_label || 'VIP'}</i>}</b><small>{formatReputation(rep)} REP · {status.label} · LVL {level}</small></span>}
  </span>;
  return link && author?.id ? <Link href={`/social/profile/${author.id}`} className="rcl-social-identity-link">{identity}</Link> : identity;
}
