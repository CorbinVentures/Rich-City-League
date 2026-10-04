'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowRight, FaComments, FaMagnifyingGlass, FaPenToSquare, FaUsers, FaXmark } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

type QuickInboxRow = {
  conversation_id: string;
  title: string | null;
  conversation_type: string;
  updated_at: string;
  latest_body: string | null;
  latest_created_at: string | null;
  latest_sender_id: string | null;
  unread_count: number | string | null;
  archived_at: string | null;
  peer_id: string | null;
  peer_display_name: string | null;
  peer_username: string | null;
  peer_avatar_url: string | null;
  member_count: number | string | null;
};

type QuickItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unread: number;
  avatarUrl: string | null;
  isGroup: boolean;
  memberCount: number;
  lastSenderIsMe: boolean;
};

function conversationTitle(row: QuickInboxRow) {
  if (row.conversation_type === 'direct') {
    return row.peer_display_name ?? row.peer_username ?? 'RCH member';
  }
  return row.title ?? (row.conversation_type === 'group' ? 'Group conversation' : 'RCH conversation');
}

function formatQuickTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessageQuickMenu({
  userId,
  unreadCount,
}: {
  userId: string;
  unreadCount: number;
}) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const db = supabase as any;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<QuickItem[]>([]);
  const [query, setQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    if (!db || !userId) return;
    setLoading(true);
    setLoadError('');
    const result = await db.rpc('get_message_inbox');
    if (result.error) {
      setLoadError('Could not load messages.');
      setLoading(false);
      return;
    }

    const rows = (result.data ?? []) as QuickInboxRow[];
    setItems(rows
      .filter((row) => !row.archived_at)
      .map((row) => ({
        id: row.conversation_id,
        title: conversationTitle(row),
        preview: row.latest_body ?? '',
        updatedAt: row.latest_created_at ?? row.updated_at,
        unread: Number(row.unread_count ?? 0),
        avatarUrl: row.conversation_type === 'direct' ? row.peer_avatar_url : null,
        isGroup: row.conversation_type !== 'direct',
        memberCount: Number(row.member_count ?? 0),
        lastSenderIsMe: row.latest_sender_id === userId,
      }))
      .slice(0, 12));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  useEffect(() => {
    if (!open || !supabase) return;
    const channel = supabase
      .channel('rch-quick-inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `profile_id=eq.${userId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_preferences', filter: `profile_id=eq.${userId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [open, supabase, userId]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const visible = items.filter((item) => {
    if (showUnreadOnly && item.unread < 1) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${item.title} ${item.preview}`.toLowerCase().includes(term);
  }).slice(0, 7);

  return (
    <div className="rcl-message-quick-wrap" ref={rootRef}>
      <button
        type="button"
        className={`rcl-message-header-button ${open ? 'active' : ''}`}
        aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : 'Messages'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <FaComments />
        {unreadCount > 0 && <em>{unreadCount > 9 ? '9+' : unreadCount}</em>}
      </button>

      {open && (
        <section className="rcl-message-quick-panel" role="dialog" aria-label="Quick messages">
          <header className="rcl-message-quick-head">
            <div>
              <span>RCH Messages</span>
              <h2>Messages</h2>
            </div>
            <div>
              <Link href="/messages?compose=1" onClick={() => setOpen(false)} aria-label="New message" title="New message">
                <FaPenToSquare />
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close messages">
                <FaXmark />
              </button>
            </div>
          </header>

          <label className="rcl-message-quick-search">
            <FaMagnifyingGlass />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Messenger" aria-label="Search messages" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><FaXmark /></button>}
          </label>

          <div className="rcl-message-quick-tabs" role="tablist" aria-label="Message filters">
            <button type="button" className={!showUnreadOnly ? 'active' : ''} onClick={() => setShowUnreadOnly(false)}>Inbox</button>
            <button type="button" className={showUnreadOnly ? 'active' : ''} onClick={() => setShowUnreadOnly(true)}>
              Unread {unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
          </div>

          <div className="rcl-message-quick-list">
            {loading && [1,2,3,4].map((item) => (
              <div className="rcl-message-quick-skeleton" key={item}><i /><span><b /><small /></span></div>
            ))}

            {!loading && loadError && (
              <div className="rcl-message-quick-state">
                <FaComments />
                <strong>Messages are taking a second.</strong>
                <button type="button" onClick={() => void load()}>Try again</button>
              </div>
            )}

            {!loading && !loadError && visible.map((item) => (
              <Link key={item.id} href={`/messages/${item.id}`} onClick={() => setOpen(false)} className={`rcl-message-quick-item ${item.unread ? 'unread' : ''}`}>
                <span className="rcl-message-quick-avatar">
                  {item.isGroup ? <FaUsers /> : <ProfileAvatarMedia src={item.avatarUrl} alt={item.title} className="h-full w-full rounded-full object-cover" />}
                  {item.unread > 0 && <i />}
                </span>
                <span className="rcl-message-quick-copy">
                  <span><strong>{item.title}</strong><time>{formatQuickTime(item.updatedAt)}</time></span>
                  <small>{item.lastSenderIsMe && item.preview ? 'You: ' : ''}{item.preview || (item.isGroup ? `${item.memberCount} members` : 'Start the conversation')}</small>
                </span>
                {item.unread > 0 && <b className="rcl-message-quick-count">{item.unread > 99 ? '99+' : item.unread}</b>}
              </Link>
            ))}

            {!loading && !loadError && visible.length === 0 && (
              <div className="rcl-message-quick-state">
                <FaComments />
                <strong>{query ? 'No matching conversations' : showUnreadOnly ? 'You’re caught up' : 'No conversations yet'}</strong>
                <p>{query ? 'Try another name or phrase.' : showUnreadOnly ? 'No unread messages right now.' : 'Start a conversation with someone in RCH.'}</p>
              </div>
            )}
          </div>

          <footer className="rcl-message-quick-footer">
            <Link href="/messages" onClick={() => setOpen(false)}>
              See all in Messages <FaArrowRight />
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
