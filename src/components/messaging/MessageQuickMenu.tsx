'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaComments, FaMagnifyingGlass, FaPenToSquare, FaStar, FaUsers, FaXmark } from 'react-icons/fa6';
import { getSupabaseClient } from '@/lib/supabase';
import { ProfileAvatarMedia } from '@/components/ProfileAvatarMedia';

type QuickFilter = 'all' | 'unread' | 'groups' | 'pinned';

type QuickInboxRow = {
  conversation_id: string;
  title: string | null;
  conversation_type: string;
  updated_at: string;
  latest_body: string | null;
  latest_created_at: string | null;
  latest_sender_id: string | null;
  unread_count: number | string | null;
  is_pinned: boolean | null;
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
  isPinned: boolean;
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
  const panelRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<QuickItem[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<QuickFilter>('all');
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
        isPinned: Boolean(row.is_pinned),
      }))
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 24));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    void load();
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
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
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
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
    if (filter === 'unread' && item.unread < 1) return false;
    if (filter === 'groups' && !item.isGroup) return false;
    if (filter === 'pinned' && !item.isPinned) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return `${item.title} ${item.preview}`.toLowerCase().includes(term);
  });

  const groups = items.filter((item) => item.isGroup).length;
  const pinned = items.filter((item) => item.isPinned).length;

  const openComposer = () => {
    window.dispatchEvent(new Event('rch-open-message-composer'));
    setOpen(false);
  };

  const filters: Array<{ key: QuickFilter; label: string; count?: number }> = [
    { key: 'all', label: 'Inbox' },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'groups', label: 'Groups', count: groups },
    { key: 'pinned', label: 'Pinned', count: pinned },
  ];

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

      {open && typeof document !== 'undefined' && createPortal(
        <>
          <button type="button" className="rcl-message-quick-backdrop" aria-label="Close messages" onClick={() => setOpen(false)} />
          <section ref={panelRef} className="rcl-message-quick-panel" role="dialog" aria-modal="true" aria-label="RCH Messages">
            <header className="rcl-message-quick-head">
              <div>
                <span>RCH Messages</span>
                <h2>Messages</h2>
                <p>{unreadCount > 0 ? `${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : 'You’re all caught up'}</p>
              </div>
              <div className="rcl-message-quick-head-actions">
                <Link className="rcl-message-quick-compose" href="/messages?compose=1" onClick={openComposer} aria-label="Start a new message" title="New message">
                  <FaPenToSquare />
                  <span>New</span>
                </Link>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close messages">
                  <FaXmark />
                </button>
              </div>
            </header>

            <label className="rcl-message-quick-search">
              <FaMagnifyingGlass />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                autoComplete="off"
              />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><FaXmark /></button>}
            </label>

            <div className="rcl-message-quick-tabs" role="tablist" aria-label="Message filters">
              {filters.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.key}
                  className={filter === item.key ? 'active' : ''}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                  {typeof item.count === 'number' && item.count > 0 && <span>{item.count > 99 ? '99+' : item.count}</span>}
                </button>
              ))}
            </div>

            <div className="rcl-message-quick-sectionbar">
              <strong>{filter === 'all' ? 'Recent conversations' : filters.find((item) => item.key === filter)?.label}</strong>
              <span>{visible.length} {visible.length === 1 ? 'conversation' : 'conversations'}</span>
            </div>

            <div className="rcl-message-quick-list">
              {loading && [1,2,3,4,5].map((item) => (
                <div className="rcl-message-quick-skeleton" key={item}><i /><span><b /><small /></span></div>
              ))}

              {!loading && loadError && (
                <div className="rcl-message-quick-state">
                  <FaComments />
                  <strong>Messages are taking a second.</strong>
                  <p>Your inbox could not refresh.</p>
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
                    <span className="rcl-message-quick-title">
                      <strong>{item.title}</strong>
                      {item.isPinned && <FaStar aria-label="Pinned" />}
                      <time dateTime={item.updatedAt}>{formatQuickTime(item.updatedAt)}</time>
                    </span>
                    <small>{item.lastSenderIsMe && item.preview ? 'You: ' : ''}{item.preview || (item.isGroup ? `${item.memberCount} members` : 'Start the conversation')}</small>
                    {item.isGroup && <span className="rcl-message-quick-meta">{item.memberCount || 'Group'}{item.memberCount ? ' members' : ''}</span>}
                  </span>
                  {item.unread > 0 && <b className="rcl-message-quick-count">{item.unread > 99 ? '99+' : item.unread}</b>}
                </Link>
              ))}

              {!loading && !loadError && visible.length === 0 && (
                <div className="rcl-message-quick-state">
                  <FaComments />
                  <strong>{query ? 'No matching conversations' : filter === 'unread' ? 'You’re caught up' : filter === 'groups' ? 'No group conversations yet' : filter === 'pinned' ? 'Nothing pinned yet' : 'No conversations yet'}</strong>
                  <p>{query ? 'Try another name or phrase.' : filter === 'unread' ? 'No unread messages right now.' : 'Start a new conversation from the button above.'}</p>
                </div>
              )}
            </div>

            <footer className="rcl-message-quick-dock">
              <Link href="/messages?compose=1" onClick={openComposer}>
                <FaPenToSquare />
                Start a new message
              </Link>
              <span>Messages stay available from the top bar.</span>
            </footer>
          </section>
        </>,
        document.body
      )}
    </div>
  );
}
