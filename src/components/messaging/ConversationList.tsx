'use client';

import Link from 'next/link';
import { FiArchive, FiBellOff, FiMessageCircle, FiStar, FiUsers } from 'react-icons/fi';
import { SocialIdentity, type SocialIdentityAuthor } from '@/components/SocialIdentity';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

export type ConversationListItem = {
  id: string;
  title: string;
  type: string;
  preview: string;
  updatedAt: string;
  unread: number;
  avatarUrl: string | null;
  identity?: SocialIdentityAuthor | null;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  memberCount?: number;
  lastSenderIsMe?: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function typeLabel(type: string, memberCount?: number) {
  if (type === 'DIRECT') return 'Direct';
  if (type === 'GROUP') return memberCount ? `${memberCount} members` : 'Group';
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function ConversationRow({
  item,
  onPin,
  onMute,
  onArchive,
}: {
  item: ConversationListItem;
  onPin?: (item: ConversationListItem) => void;
  onMute?: (item: ConversationListItem) => void;
  onArchive?: (item: ConversationListItem) => void;
}) {
  return (
    <article className={`rcl-message-row ${item.unread ? 'is-unread' : ''} ${item.isPinned ? 'is-pinned' : ''}`}>
      <Link
        href={`/messages/${item.id}`}
        className="rcl-message-row-main"
        aria-label={`Open conversation with ${item.title}${item.unread ? `, ${item.unread} unread` : ''}`}
      >
        <div className="rcl-message-avatar-wrap">
          {item.identity ? (
            <SocialIdentity author={item.identity} compact link={false} />
          ) : (
            <div className="rcl-message-avatar">
              {item.type === 'GROUP' ? <FiUsers /> : <ProfileAvatarMedia src={item.avatarUrl} alt={item.title} className="h-full w-full object-cover" />}
            </div>
          )}
          {item.unread > 0 && <span className="rcl-message-unread-dot" />}
        </div>

        <div className="rcl-message-copy">
          <div className="rcl-message-row-top">
            <div className="rcl-message-title-line">
              <h3>{item.title}</h3>
              {item.isPinned && <FiStar aria-label="Pinned" />}
              {item.isMuted && <FiBellOff aria-label="Muted" />}
            </div>
            <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time>
          </div>

          <div className="rcl-message-row-bottom">
            <p>{item.lastSenderIsMe && item.preview ? <span>You: </span> : null}{item.preview || 'Start the conversation'}</p>
            <div className="rcl-message-row-meta">
              <span>{typeLabel(item.type, item.memberCount)}</span>
              {item.unread > 0 && <b>{item.unread > 99 ? '99+' : item.unread}</b>}
            </div>
          </div>
        </div>
      </Link>

      {(onPin || onMute || onArchive) && (
        <div className="rcl-message-row-actions" aria-label={`Conversation actions for ${item.title}`}>
          {onPin && <button type="button" onClick={() => onPin(item)} aria-label={item.isPinned ? 'Unpin conversation' : 'Pin conversation'} title={item.isPinned ? 'Unpin' : 'Pin'}><FiStar /></button>}
          {onMute && <button type="button" onClick={() => onMute(item)} aria-label={item.isMuted ? 'Unmute conversation' : 'Mute conversation'} title={item.isMuted ? 'Unmute' : 'Mute'}><FiBellOff /></button>}
          {onArchive && <button type="button" onClick={() => onArchive(item)} aria-label={item.isArchived ? 'Restore conversation' : 'Archive conversation'} title={item.isArchived ? 'Restore' : 'Archive'}><FiArchive /></button>}
        </div>
      )}
    </article>
  );
}

export function ConversationList({
  items,
  emptyMessage = 'No conversations match this view.',
  onPin,
  onMute,
  onArchive,
}: {
  items: ConversationListItem[];
  emptyMessage?: string;
  onPin?: (item: ConversationListItem) => void;
  onMute?: (item: ConversationListItem) => void;
  onArchive?: (item: ConversationListItem) => void;
}) {
  if (!items.length) {
    return (
      <div className="rcl-message-empty">
        <div>
          <span><FiMessageCircle aria-hidden="true" /></span>
          <h3>No conversations here</h3>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return <div className="rcl-message-list">{items.map((item) => <ConversationRow key={item.id} item={item} onPin={onPin} onMute={onMute} onArchive={onArchive} />)}</div>;
}
